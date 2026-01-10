import { Icns, IcnsImage, type OSType } from '@fiahfy/icns';
import { Resvg } from '@resvg/resvg-js';
import sharp from 'sharp';
import { encode as encodeIco } from 'sharp-ico';
import { parentPort, threadId } from 'worker_threads';
import type {
  PngColorDepth,
  PngColorspace,
  RoundnessValue,
  SourceFileType,
} from '../conversion/dto/convert.dto.js';
import { processSvg } from '../conversion/svg-processor.js';
import type {
  ConversionJobData,
  ConversionJobResult,
  SourceDimensions,
  WorkerLogLevel,
  WorkerMessage,
  WorkerResponse,
} from './types/worker-messages.js';

const ICO_SIZES = [16, 32, 48, 64, 128, 256];
const FAVICON_SIZES = [16, 32, 48];

// ICNS icon types mapped to their sizes
// Each entry specifies the OSType and the pixel size for that icon
// Standard (1x) icons: icp4, icp5, icp6, ic07, ic08, ic09, ic10
// Retina (2x) icons: ic11 (16@2x=32), ic12 (32@2x=64), ic13 (128@2x=256), ic14 (256@2x=512)
const ICNS_ICON_TYPES: Array<{ osType: OSType; size: number }> = [
  // Standard resolution icons
  { osType: 'icp4', size: 16 }, // 16x16
  { osType: 'icp5', size: 32 }, // 32x32
  { osType: 'icp6', size: 64 }, // 64x64 (unofficial but widely supported)
  { osType: 'ic07', size: 128 }, // 128x128
  { osType: 'ic08', size: 256 }, // 256x256
  { osType: 'ic09', size: 512 }, // 512x512
  { osType: 'ic10', size: 1024 }, // 1024x1024 (also used as 512@2x)
  // Retina resolution icons (these use larger pixel data for @2x display)
  { osType: 'ic11', size: 32 }, // 16x16@2x (32px actual)
  { osType: 'ic12', size: 64 }, // 32x32@2x (64px actual)
  { osType: 'ic13', size: 256 }, // 128x128@2x (256px actual)
  { osType: 'ic14', size: 512 }, // 256x256@2x (512px actual)
];

// macOS icons need padding to match system icon appearance.
// Apple's guidelines show icons should be ~80% of the canvas to look correct
// alongside other system icons. 824/1024 ≈ 0.805 provides the correct visual balance.
const MACOS_ICON_SCALE = 832 / 1024;

/**
 * Context for image conversion - can be either SVG or PNG source
 */
interface ConversionContext {
  svgBuffer: Buffer | null;
  pngBuffer: Buffer | null;
  sourceType: SourceFileType;
  sourceDimensions: SourceDimensions | undefined;
}

if (!parentPort) {
  throw new Error('This file must be run as a worker thread');
}

const port = parentPort;

/**
 * Send a log message to the main thread
 */
function log(level: WorkerLogLevel, message: string, jobId?: string): void {
  const response: WorkerResponse = {
    type: 'log',
    level,
    message: `[Worker ${threadId}] ${message}`,
    jobId,
  };
  port.postMessage(response);
}

/**
 * Format file size for logging
 */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Extract a user-friendly error message from various error types
 */
function extractErrorMessage(error: unknown, context: string): string {
  if (error instanceof Error) {
    // Handle specific error types with better messages
    const msg = error.message.toLowerCase();

    if (msg.includes('invalid svg') || msg.includes('not a valid svg')) {
      return 'The uploaded file is not a valid SVG. Please ensure the file contains valid SVG markup.';
    }
    if (msg.includes('memory') || msg.includes('heap')) {
      return 'The SVG is too complex to process. Try simplifying the image or reducing its size.';
    }
    if (msg.includes('timeout')) {
      return 'Processing took too long. Try a simpler SVG file.';
    }
    if (msg.includes('sharp') || msg.includes('vips')) {
      return `Image processing failed during ${context}: ${error.message}`;
    }
    if (msg.includes('resvg')) {
      return `SVG rendering failed: ${error.message}`;
    }

    return `${context} failed: ${error.message}`;
  }

  return `${context} failed: Unknown error`;
}

/**
 * Filter sizes based on source dimensions (for PNG input).
 * We never upscale PNG images to avoid quality degradation.
 */
function filterSizesForSource(
  sizes: number[],
  sourceDimensions: SourceDimensions | undefined,
  jobId?: string,
): number[] {
  if (!sourceDimensions) {
    return sizes; // SVG can generate any size
  }
  const maxSourceSize = Math.min(sourceDimensions.width, sourceDimensions.height);
  const filteredSizes = sizes.filter((size) => size <= maxSourceSize);

  if (filteredSizes.length < sizes.length) {
    const excludedSizes = sizes.filter((size) => size > maxSourceSize);
    log(
      'log',
      `Excluding sizes [${excludedSizes.join(', ')}]px (source is ${maxSourceSize}px, no upscaling)`,
      jobId,
    );
  }

  return filteredSizes;
}

/**
 * Main job processing function
 */
async function processJob(data: ConversionJobData): Promise<ConversionJobResult> {
  const startTime = Date.now();
  const {
    jobId,
    sourceType,
    originalFilename,
    format,
    scale,
    cornerRadius,
    backgroundRemovalMode,
    outputSize,
    pngDpi,
    pngColorspace,
    pngColorDepth,
    sourceDimensions,
  } = data;

  log('log', `Starting conversion: ${originalFilename} (${sourceType}) -> ${format}`, jobId);
  log(
    'debug',
    `Options: scale=${scale}%, cornerRadius=${cornerRadius}%, bgRemoval=${backgroundRemovalMode}, outputSize=${outputSize}px`,
    jobId,
  );
  if (sourceDimensions) {
    log(
      'debug',
      `Source dimensions: ${sourceDimensions.width}x${sourceDimensions.height}px`,
      jobId,
    );
  }

  try {
    // Buffer gets serialized to Uint8Array when passed through postMessage
    // Convert it back to a proper Buffer
    const inputBuffer = Buffer.from(data.inputBuffer);
    const inputSize = inputBuffer.length;
    log('verbose', `Input ${sourceType.toUpperCase()} size: ${formatBytes(inputSize)}`, jobId);

    let processedSvgBuffer: Buffer | null = null;
    let pngSourceBuffer: Buffer | null = null;
    let baseName: string;

    if (sourceType === 'svg') {
      const svgString = inputBuffer.toString('utf-8');

      // Validate SVG content
      if (!isValidSvg(svgString)) {
        const preview = svgString.substring(0, 100).replace(/\s+/g, ' ');
        log('warn', `Invalid SVG content. Preview: "${preview}..."`, jobId);
        log('error', `Validation failed: File does not appear to be a valid SVG`, jobId);
        return {
          jobId,
          success: false,
          error:
            'The uploaded file is not a valid SVG. Expected file to start with <svg or <?xml declaration.',
          processingTimeMs: Date.now() - startTime,
        };
      }

      log('verbose', `SVG validation passed`, jobId);

      // Get and log SVG dimensions
      const dimensions = getSvgDimensions(svgString);
      log('debug', `SVG dimensions: ${dimensions.width}x${dimensions.height}`, jobId);

      // Process SVG with background removal
      log(
        'verbose',
        `Applying SVG preprocessing (backgroundRemoval: ${backgroundRemovalMode})`,
        jobId,
      );
      const processedSvg = processSvg(svgString, {
        backgroundRemovalMode: data.backgroundRemovalMode,
        backgroundRemovalColor: data.backgroundRemovalColor,
        cornerRadius: 0, // Skip SVG-level corner radius, apply at PNG level
      });
      processedSvgBuffer = Buffer.from(processedSvg, 'utf-8');
      log('verbose', `SVG preprocessing complete`, jobId);

      baseName = originalFilename.replace(/\.svg$/i, '');
    } else {
      // PNG source
      pngSourceBuffer = inputBuffer;
      baseName = originalFilename.replace(/\.png$/i, '');
      log('verbose', `PNG source ready for conversion`, jobId);
    }

    const results: { buffer: Buffer; filename: string; mimeType: string }[] = [];

    // Prepare conversion context - either SVG buffer or PNG buffer with source dimensions
    const conversionContext = {
      svgBuffer: processedSvgBuffer,
      pngBuffer: pngSourceBuffer,
      sourceType,
      sourceDimensions,
    };

    // Convert based on format
    if (format === 'png') {
      log(
        'debug',
        `Converting to PNG (${outputSize}x${outputSize}px, ${pngDpi ?? 72} DPI, ${pngColorspace ?? 'srgb'}, ${pngColorDepth ?? 32}-bit)`,
        jobId,
      );
      const pngResult = await convertToPng(
        conversionContext,
        baseName,
        scale,
        cornerRadius,
        outputSize,
        pngDpi,
        pngColorspace,
        pngColorDepth,
        jobId,
      );
      log('verbose', `PNG output size: ${formatBytes(pngResult.buffer.length)}`, jobId);
      results.push(pngResult);
    } else if (format === 'ico') {
      const availableSizes = filterSizesForSource(ICO_SIZES, sourceDimensions, jobId);
      if (availableSizes.length === 0) {
        throw new Error(
          `Source image is too small. ICO requires at least ${Math.min(...ICO_SIZES)}px but source is ${Math.min(sourceDimensions?.width ?? 0, sourceDimensions?.height ?? 0)}px.`,
        );
      }
      log('debug', `Converting to ICO (sizes: ${availableSizes.join(', ')}px)`, jobId);
      const icoResult = await convertToIco(
        conversionContext,
        baseName,
        scale,
        cornerRadius,
        availableSizes,
        jobId,
      );
      log('verbose', `ICO output size: ${formatBytes(icoResult.buffer.length)}`, jobId);
      results.push(icoResult);
    } else if (format === 'icns') {
      const uniqueIcnsSizes = [...new Set(ICNS_ICON_TYPES.map((t) => t.size))].sort(
        (a, b) => a - b,
      );
      const availableSizes = filterSizesForSource(uniqueIcnsSizes, sourceDimensions, jobId);
      if (availableSizes.length === 0) {
        throw new Error(
          `Source image is too small. ICNS requires at least ${Math.min(...uniqueIcnsSizes)}px but source is ${Math.min(sourceDimensions?.width ?? 0, sourceDimensions?.height ?? 0)}px.`,
        );
      }
      log('debug', `Converting to ICNS (sizes: ${availableSizes.join(', ')}px)`, jobId);
      const icnsResult = await convertToIcns(
        conversionContext,
        baseName,
        scale,
        cornerRadius,
        availableSizes,
        jobId,
      );
      log('verbose', `ICNS output size: ${formatBytes(icnsResult.buffer.length)}`, jobId);
      results.push(icnsResult);
    } else if (format === 'favicon') {
      const availableSizes = filterSizesForSource(FAVICON_SIZES, sourceDimensions, jobId);
      if (availableSizes.length === 0) {
        throw new Error(
          `Source image is too small. Favicon requires at least ${Math.min(...FAVICON_SIZES)}px but source is ${Math.min(sourceDimensions?.width ?? 0, sourceDimensions?.height ?? 0)}px.`,
        );
      }
      log('debug', `Converting to Favicon (sizes: ${availableSizes.join(', ')}px)`, jobId);
      const faviconResult = await convertToFavicon(
        conversionContext,
        baseName,
        scale,
        cornerRadius,
        availableSizes,
        jobId,
      );
      log('verbose', `Favicon output size: ${formatBytes(faviconResult.buffer.length)}`, jobId);
      results.push(faviconResult);
    } else {
      // All formats: ICO, ICNS, Favicon, PNG (max available), and original source
      log('debug', `Converting to all formats (ICO, ICNS, Favicon, PNG, source)`, jobId);

      const icoSizes = filterSizesForSource(ICO_SIZES, sourceDimensions, jobId);
      const uniqueIcnsSizes = [...new Set(ICNS_ICON_TYPES.map((t) => t.size))].sort(
        (a, b) => a - b,
      );
      const icnsSizes = filterSizesForSource(uniqueIcnsSizes, sourceDimensions, jobId);
      const faviconSizes = filterSizesForSource(FAVICON_SIZES, sourceDimensions, jobId);
      const maxPngSize = sourceDimensions
        ? Math.min(1024, sourceDimensions.width, sourceDimensions.height)
        : 1024;

      const conversionPromises: Promise<{ buffer: Buffer; filename: string; mimeType: string }>[] =
        [];

      if (icoSizes.length > 0) {
        conversionPromises.push(
          convertToIco(conversionContext, 'icon', scale, cornerRadius, icoSizes, jobId),
        );
      }
      if (icnsSizes.length > 0) {
        conversionPromises.push(
          convertToIcns(conversionContext, 'icon', scale, cornerRadius, icnsSizes, jobId),
        );
      }
      if (faviconSizes.length > 0) {
        conversionPromises.push(
          convertToFavicon(conversionContext, 'favicon', scale, cornerRadius, faviconSizes, jobId),
        );
      }
      conversionPromises.push(
        convertToPng(
          conversionContext,
          'icon',
          scale,
          cornerRadius,
          maxPngSize,
          undefined,
          undefined,
          undefined,
          jobId,
        ),
      );

      const formatResults = await Promise.all(conversionPromises);

      // Include original source file
      const sourceResult = {
        buffer: sourceType === 'svg' ? processedSvgBuffer! : pngSourceBuffer!,
        filename: sourceType === 'svg' ? 'icon.svg' : 'icon.png',
        mimeType: sourceType === 'svg' ? 'image/svg+xml' : 'image/png',
      };

      log(
        'verbose',
        `All formats - ${formatResults.map((r) => `${r.filename}: ${formatBytes(r.buffer.length)}`).join(', ')}, source: ${formatBytes(sourceResult.buffer.length)}`,
        jobId,
      );

      results.push(...formatResults, sourceResult);
    }

    const processingTimeMs = Date.now() - startTime;
    const totalOutputSize = results.reduce((sum, r) => sum + r.buffer.length, 0);
    log(
      'log',
      `Conversion complete in ${processingTimeMs}ms (output: ${formatBytes(totalOutputSize)})`,
      jobId,
    );

    return {
      jobId,
      success: true,
      results,
      processingTimeMs,
    };
  } catch (error) {
    const processingTimeMs = Date.now() - startTime;
    const errorMessage = extractErrorMessage(error, 'Conversion');

    log('error', `Job failed after ${processingTimeMs}ms: ${errorMessage}`, jobId);

    // Log stack trace at debug level for debugging
    if (error instanceof Error && error.stack) {
      log('debug', `Stack trace: ${error.stack}`, jobId);
    }

    return {
      jobId,
      success: false,
      error: errorMessage,
      processingTimeMs,
    };
  }
}

/**
 * Validate that content is a valid SVG
 */
function isValidSvg(content: string): boolean {
  const trimmed = content.trim();
  // Check for SVG content - must have <svg tag somewhere
  if (!trimmed.includes('<svg')) {
    return false;
  }
  // Can start with XML declaration or directly with <svg
  return trimmed.startsWith('<svg') || trimmed.startsWith('<?xml');
}

/**
 * Create a rounded rectangle mask as an SVG buffer for use with sharp composite
 */
function createRoundedMask(size: number, cornerRadiusPercent: RoundnessValue): Buffer {
  const radiusPixels = (cornerRadiusPercent / 100) * size;
  const svg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    <rect x="0" y="0" width="${size}" height="${size}" rx="${radiusPixels}" ry="${radiusPixels}" fill="white"/>
  </svg>`;
  return Buffer.from(svg);
}

/**
 * Convert source to PNG format with DPI, colorspace, and color depth options
 */
async function convertToPng(
  context: ConversionContext,
  baseName: string,
  scale: number,
  cornerRadius: RoundnessValue,
  outputSize: number,
  pngDpi?: number,
  pngColorspace?: PngColorspace,
  pngColorDepth?: PngColorDepth,
  jobId?: string,
): Promise<{ buffer: Buffer; filename: string; mimeType: string }> {
  try {
    const [pngBuffer] = await renderToPngs(context, [outputSize], scale, cornerRadius, jobId);

    // Apply DPI, colorspace, and color depth transformations
    const dpi = pngDpi ?? 72;
    const colorspace = pngColorspace ?? 'srgb';
    const colorDepth = pngColorDepth ?? 32;

    let sharpInstance = sharp(pngBuffer);

    // Apply colorspace transformation
    if (colorspace === 'p3') {
      // Display P3 wide gamut colorspace
      sharpInstance = sharpInstance.toColorspace('p3');
    } else if (colorspace === 'cmyk') {
      // CMYK for print
      sharpInstance = sharpInstance.toColorspace('cmyk');
    }
    // srgb is the default, no transformation needed

    // Configure PNG options based on color depth
    // 8-bit = indexed palette (256 colors)
    // 24-bit = truecolor RGB (no alpha)
    // 32-bit = truecolor RGBA (with alpha)
    let pngOptions: sharp.PngOptions = {};
    if (colorDepth === 8) {
      // 8-bit indexed color (256 colors max)
      pngOptions = { palette: true, colours: 256 };
    } else if (colorDepth === 24) {
      // 24-bit truecolor without alpha - flatten to remove transparency
      sharpInstance = sharpInstance.flatten({ background: { r: 255, g: 255, b: 255 } });
      pngOptions = {};
    }
    // 32-bit is default (RGBA with full alpha support)

    // Apply DPI metadata and generate final PNG
    const finalBuffer = await sharpInstance
      .withMetadata({ density: dpi })
      .png(pngOptions)
      .toBuffer();

    log(
      'verbose',
      `Applied PNG settings: ${dpi} DPI, ${colorspace} colorspace, ${colorDepth}-bit color`,
      jobId,
    );

    return {
      buffer: finalBuffer,
      filename: `${baseName}.png`,
      mimeType: 'image/png',
    };
  } catch (error) {
    throw new Error(extractErrorMessage(error, 'PNG conversion'));
  }
}

/**
 * Convert source to ICO format (Windows icon)
 */
async function convertToIco(
  context: ConversionContext,
  baseName: string,
  scale: number,
  cornerRadius: RoundnessValue,
  sizes: number[],
  jobId?: string,
): Promise<{ buffer: Buffer; filename: string; mimeType: string }> {
  try {
    log('verbose', `Rendering ${sizes.length} PNG sizes for ICO`, jobId);
    const pngBuffers = await renderToPngs(context, sizes, scale, cornerRadius, jobId);

    log('verbose', `Encoding ICO file`, jobId);
    const icoBuffer = encodeIco(pngBuffers);

    return {
      buffer: icoBuffer,
      filename: `${baseName}.ico`,
      mimeType: 'image/x-icon',
    };
  } catch (error) {
    throw new Error(extractErrorMessage(error, 'ICO conversion'));
  }
}

/**
 * Convert source to Favicon ICO format (web favicon)
 */
async function convertToFavicon(
  context: ConversionContext,
  baseName: string,
  scale: number,
  cornerRadius: RoundnessValue,
  sizes: number[],
  jobId?: string,
): Promise<{ buffer: Buffer; filename: string; mimeType: string }> {
  try {
    log('verbose', `Rendering ${sizes.length} PNG sizes for favicon`, jobId);
    const pngBuffers = await renderToPngs(context, sizes, scale, cornerRadius, jobId);

    log('verbose', `Encoding favicon ICO file`, jobId);
    const icoBuffer = encodeIco(pngBuffers);

    return {
      buffer: icoBuffer,
      filename: 'favicon.ico',
      mimeType: 'image/x-icon',
    };
  } catch (error) {
    throw new Error(extractErrorMessage(error, 'Favicon conversion'));
  }
}

/**
 * Convert source to ICNS format (macOS icon)
 *
 * macOS icons need automatic scaling to match system icon appearance.
 * Apple's design guidelines expect icons to have padding around them so they
 * visually align with other system icons. We apply MACOS_ICON_SCALE (~80.5%)
 * to the user's scale factor to achieve this.
 */
async function convertToIcns(
  context: ConversionContext,
  baseName: string,
  scale: number,
  cornerRadius: RoundnessValue,
  availableSizes: number[],
  jobId?: string,
): Promise<{ buffer: Buffer; filename: string; mimeType: string }> {
  try {
    // Apply macOS icon scaling to match system icon appearance
    // User's 100% scale becomes ~80.5% to add proper padding
    const macosAdjustedScale = scale * MACOS_ICON_SCALE;

    log(
      'verbose',
      `Rendering ICNS at ${availableSizes.length} sizes with macOS scaling (${scale}% → ${macosAdjustedScale.toFixed(1)}%)`,
      jobId,
    );

    // Render all available sizes with the macOS-adjusted scale
    const pngBuffers = await renderToPngs(
      context,
      availableSizes,
      macosAdjustedScale,
      cornerRadius,
      jobId,
    );

    // Create a map of size -> PNG buffer for easy lookup
    const pngBySize = new Map<number, Buffer>();
    availableSizes.forEach((size, index) => {
      pngBySize.set(size, pngBuffers[index]);
    });

    // Build ICNS file with icon types that we have sizes for
    const availableIconTypes = ICNS_ICON_TYPES.filter((t) => availableSizes.includes(t.size));
    log('verbose', `Encoding ICNS file with ${availableIconTypes.length} icon entries`, jobId);
    const icns = new Icns();

    for (const { osType, size } of availableIconTypes) {
      const pngBuffer = pngBySize.get(size);
      if (pngBuffer) {
        const image = IcnsImage.fromPNG(pngBuffer, osType);
        icns.append(image);
      }
    }

    return {
      buffer: Buffer.from(icns.data),
      filename: `${baseName}.icns`,
      mimeType: 'image/icns',
    };
  } catch (error) {
    throw new Error(extractErrorMessage(error, 'ICNS conversion'));
  }
}

/**
 * Get the intrinsic dimensions of an SVG
 */
function getSvgDimensions(svgString: string): { width: number; height: number } {
  // Try viewBox first
  const viewBoxMatch = svgString.match(/viewBox=["']([^"']+)["']/i);
  if (viewBoxMatch) {
    const parts = viewBoxMatch[1].split(/[\s,]+/).map(Number);
    if (parts.length >= 4 && !isNaN(parts[2]) && !isNaN(parts[3])) {
      return { width: parts[2], height: parts[3] };
    }
  }

  // Fall back to width/height attributes
  const widthMatch = svgString.match(/\bwidth=["']([^"']+)["']/i);
  const heightMatch = svgString.match(/\bheight=["']([^"']+)["']/i);
  const width = widthMatch ? parseFloat(widthMatch[1]) : 100;
  const height = heightMatch ? parseFloat(heightMatch[1]) : 100;

  return { width: isNaN(width) ? 100 : width, height: isNaN(height) ? 100 : height };
}

/**
 * Render source (SVG or PNG) to PNG buffers at specified sizes.
 * For PNG sources, only downscaling is performed (never upscaling).
 */
async function renderToPngs(
  context: ConversionContext,
  sizes: number[],
  scale: number,
  cornerRadius: RoundnessValue,
  jobId?: string,
): Promise<Buffer[]> {
  const { svgBuffer, pngBuffer, sourceType, sourceDimensions } = context;

  log(
    'verbose',
    `Rendering ${sizes.length} size(s): [${sizes.join(', ')}]px from ${sourceType}`,
    jobId,
  );

  if (sourceType === 'svg' && svgBuffer) {
    return renderSvgSourceToPngs(svgBuffer, sizes, scale, cornerRadius, jobId);
  } else if (sourceType === 'png' && pngBuffer && sourceDimensions) {
    return renderPngSourceToPngs(pngBuffer, sourceDimensions, sizes, scale, cornerRadius, jobId);
  } else {
    throw new Error('Invalid conversion context: missing source buffer');
  }
}

/**
 * Render SVG source to PNG buffers at specified sizes
 */
async function renderSvgSourceToPngs(
  svgBuffer: Buffer,
  sizes: number[],
  scale: number,
  cornerRadius: RoundnessValue,
  jobId?: string,
): Promise<Buffer[]> {
  const svgString = svgBuffer.toString('utf-8');

  // Get SVG dimensions to handle rectangular SVGs
  const svgDimensions = getSvgDimensions(svgString);
  const largestDimension = Math.max(svgDimensions.width, svgDimensions.height);

  if (largestDimension === 0) {
    throw new Error('SVG has zero dimensions - cannot render');
  }

  const aspectRatio = {
    width: svgDimensions.width / largestDimension,
    height: svgDimensions.height / largestDimension,
  };

  return Promise.all(
    sizes.map(async (size) => {
      try {
        const scaleFactor = scale / 100;
        let pngResultBuffer: Buffer;

        if (scaleFactor <= 1) {
          // Scale <= 100%: render smaller icon with padding
          const iconSize = Math.round(size * scaleFactor);
          const renderWidth = Math.round(iconSize * aspectRatio.width);
          const renderHeight = Math.round(iconSize * aspectRatio.height);

          log('verbose', `Size ${size}px: rendering SVG at ${iconSize}px (${scale}% scale)`, jobId);

          const resvg = new Resvg(svgString, {
            fitTo: {
              mode: svgDimensions.width >= svgDimensions.height ? 'width' : 'height',
              value: iconSize,
            },
            background: 'rgba(0, 0, 0, 0)',
          });

          const rendered = resvg.render();
          const pngData = rendered.asPng();

          // Calculate padding to center the icon
          const paddingLeft = Math.round((size - renderWidth) / 2);
          const paddingRight = size - renderWidth - paddingLeft;
          const paddingTop = Math.round((size - renderHeight) / 2);
          const paddingBottom = size - renderHeight - paddingTop;

          pngResultBuffer = await sharp(Buffer.from(pngData))
            .extend({
              top: paddingTop,
              bottom: paddingBottom,
              left: paddingLeft,
              right: paddingRight,
              background: { r: 0, g: 0, b: 0, alpha: 0 },
            })
            .resize(size, size, { fit: 'fill' })
            .png()
            .toBuffer();
        } else {
          // Scale > 100%: render larger and crop center
          const renderSize = Math.round(size * scaleFactor);

          log(
            'verbose',
            `Size ${size}px: rendering SVG at ${renderSize}px then cropping (${scale}% scale)`,
            jobId,
          );

          const resvg = new Resvg(svgString, {
            fitTo: {
              mode: svgDimensions.width >= svgDimensions.height ? 'width' : 'height',
              value: renderSize,
            },
            background: 'rgba(0, 0, 0, 0)',
          });

          const rendered = resvg.render();
          const pngData = rendered.asPng();

          const renderedPngBuffer = Buffer.from(pngData);
          const metadata = await sharp(renderedPngBuffer).metadata();
          const actualWidth = metadata.width || renderSize;
          const actualHeight = metadata.height || renderSize;

          const canvasSize = Math.max(actualWidth, actualHeight);
          const extendLeft = Math.round((canvasSize - actualWidth) / 2);
          const extendRight = canvasSize - actualWidth - extendLeft;
          const extendTop = Math.round((canvasSize - actualHeight) / 2);
          const extendBottom = canvasSize - actualHeight - extendTop;

          const offset = Math.round((canvasSize - size) / 2);
          const safeOffset = Math.max(0, offset);
          const maxExtractSize = canvasSize - safeOffset;
          const extractSize = Math.min(size, maxExtractSize);

          const extendedBuffer = await sharp(renderedPngBuffer)
            .extend({
              top: extendTop,
              bottom: extendBottom,
              left: extendLeft,
              right: extendRight,
              background: { r: 0, g: 0, b: 0, alpha: 0 },
            })
            .png()
            .toBuffer();

          pngResultBuffer = await sharp(extendedBuffer)
            .extract({
              left: safeOffset,
              top: safeOffset,
              width: extractSize,
              height: extractSize,
            })
            .resize(size, size, { fit: 'fill' })
            .png()
            .toBuffer();
        }

        // Apply corner radius mask if specified
        if (cornerRadius > 0) {
          log('verbose', `Applying ${cornerRadius}% corner radius to ${size}px image`, jobId);
          const maskBuffer = createRoundedMask(size, cornerRadius);
          pngResultBuffer = await sharp(pngResultBuffer)
            .composite([
              {
                input: maskBuffer,
                blend: 'dest-in',
              },
            ])
            .resize(size, size, { fit: 'fill' })
            .png()
            .toBuffer();
        }

        // Final size verification
        pngResultBuffer = await sharp(pngResultBuffer)
          .resize(size, size, { fit: 'fill' })
          .png()
          .toBuffer();

        return pngResultBuffer;
      } catch (error) {
        log(
          'error',
          `Failed to render ${size}px PNG from SVG: ${error instanceof Error ? error.message : 'Unknown error'}`,
          jobId,
        );
        throw new Error(
          `Failed to render ${size}px image: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }),
  );
}

/**
 * Render PNG source to PNG buffers at specified sizes.
 * Only downscales - never upscales to avoid quality loss.
 */
async function renderPngSourceToPngs(
  pngSourceBuffer: Buffer,
  sourceDimensions: SourceDimensions,
  sizes: number[],
  scale: number,
  cornerRadius: RoundnessValue,
  jobId?: string,
): Promise<Buffer[]> {
  const sourceSize = Math.min(sourceDimensions.width, sourceDimensions.height);

  return Promise.all(
    sizes.map(async (size) => {
      try {
        // Ensure we never upscale
        if (size > sourceSize) {
          throw new Error(
            `Cannot render ${size}px from ${sourceSize}px source (upscaling not allowed)`,
          );
        }

        const scaleFactor = scale / 100;
        let pngResultBuffer: Buffer;

        // Get the source image, resized to a square based on the smaller dimension
        const squareSource = await sharp(pngSourceBuffer)
          .resize(sourceSize, sourceSize, { fit: 'cover', position: 'center' })
          .png()
          .toBuffer();

        if (scaleFactor <= 1) {
          // Scale <= 100%: render smaller icon with padding
          const iconSize = Math.round(size * scaleFactor);

          log('verbose', `Size ${size}px: resizing PNG to ${iconSize}px (${scale}% scale)`, jobId);

          // Resize the source to icon size
          const resizedIcon = await sharp(squareSource)
            .resize(iconSize, iconSize, { fit: 'fill' })
            .png()
            .toBuffer();

          // Calculate padding to center the icon
          const padding = Math.round((size - iconSize) / 2);
          const paddingRight = size - iconSize - padding;
          const paddingBottom = size - iconSize - padding;

          pngResultBuffer = await sharp(resizedIcon)
            .extend({
              top: padding,
              bottom: paddingBottom,
              left: padding,
              right: paddingRight,
              background: { r: 0, g: 0, b: 0, alpha: 0 },
            })
            .resize(size, size, { fit: 'fill' })
            .png()
            .toBuffer();
        } else {
          // Scale > 100%: render larger and crop center
          const renderSize = Math.round(size * scaleFactor);
          // But don't exceed source size
          const actualRenderSize = Math.min(renderSize, sourceSize);

          log(
            'verbose',
            `Size ${size}px: resizing PNG to ${actualRenderSize}px then cropping (${scale}% scale)`,
            jobId,
          );

          const resizedBuffer = await sharp(squareSource)
            .resize(actualRenderSize, actualRenderSize, { fit: 'fill' })
            .png()
            .toBuffer();

          // Center crop to target size
          const offset = Math.round((actualRenderSize - size) / 2);
          const safeOffset = Math.max(0, offset);
          const extractSize = Math.min(size, actualRenderSize - safeOffset);

          pngResultBuffer = await sharp(resizedBuffer)
            .extract({
              left: safeOffset,
              top: safeOffset,
              width: extractSize,
              height: extractSize,
            })
            .resize(size, size, { fit: 'fill' })
            .png()
            .toBuffer();
        }

        // Apply corner radius mask if specified
        if (cornerRadius > 0) {
          log('verbose', `Applying ${cornerRadius}% corner radius to ${size}px image`, jobId);
          const maskBuffer = createRoundedMask(size, cornerRadius);
          pngResultBuffer = await sharp(pngResultBuffer)
            .composite([
              {
                input: maskBuffer,
                blend: 'dest-in',
              },
            ])
            .resize(size, size, { fit: 'fill' })
            .png()
            .toBuffer();
        }

        // Final size verification
        pngResultBuffer = await sharp(pngResultBuffer)
          .resize(size, size, { fit: 'fill' })
          .png()
          .toBuffer();

        return pngResultBuffer;
      } catch (error) {
        log(
          'error',
          `Failed to render ${size}px PNG from source: ${error instanceof Error ? error.message : 'Unknown error'}`,
          jobId,
        );
        throw new Error(
          `Failed to render ${size}px image: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }),
  );
}

// Handle messages from main thread
port.on('message', async (message: WorkerMessage) => {
  if (message.type === 'shutdown') {
    log('log', 'Received shutdown signal, exiting gracefully');
    process.exit(0);
  }

  if (message.type === 'job') {
    try {
      const result = await processJob(message.data);
      const response: WorkerResponse = { type: 'result', data: result };
      port.postMessage(response);
    } catch (error) {
      // This should rarely happen since processJob handles its own errors
      const errorMsg = error instanceof Error ? error.message : 'Unknown worker error';
      log('error', `Unhandled error in job processing: ${errorMsg}`);
      const response: WorkerResponse = {
        type: 'error',
        error: errorMsg,
        jobId: message.data.jobId,
      };
      port.postMessage(response);
    }
  }
});

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  log('error', `Uncaught exception: ${error.message}`);
  if (error.stack) {
    log('debug', `Stack: ${error.stack}`);
  }
});

process.on('unhandledRejection', (reason) => {
  log('error', `Unhandled rejection: ${reason}`);
});

// Signal that worker is ready
log('log', 'Worker initialized and ready');
const readyResponse: WorkerResponse = { type: 'ready' };
port.postMessage(readyResponse);
