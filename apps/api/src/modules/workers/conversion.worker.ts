import { Icns, IcnsImage, type OSType } from '@fiahfy/icns';
import { Resvg } from '@resvg/resvg-js';
import sharp from 'sharp';
import { encode as encodeIco } from 'sharp-ico';
import { parentPort, threadId } from 'worker_threads';
import type { RoundnessValue } from '../conversion/dto/convert.dto.js';
import { processSvg } from '../conversion/svg-processor.js';
import type {
  ConversionJobData,
  ConversionJobResult,
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
 * Main job processing function
 */
async function processJob(data: ConversionJobData): Promise<ConversionJobResult> {
  const startTime = Date.now();
  const {
    jobId,
    originalFilename,
    format,
    scale,
    cornerRadius,
    backgroundRemovalMode,
    outputSize,
  } = data;

  log('log', `Starting conversion: ${originalFilename} -> ${format}`, jobId);
  log(
    'debug',
    `Options: scale=${scale}%, cornerRadius=${cornerRadius}%, bgRemoval=${backgroundRemovalMode}, outputSize=${outputSize}px`,
    jobId,
  );

  try {
    // Buffer gets serialized to Uint8Array when passed through postMessage
    // Convert it back to a proper Buffer
    const svgBuffer = Buffer.from(data.svgBuffer);
    const inputSize = svgBuffer.length;
    log('verbose', `Input SVG size: ${formatBytes(inputSize)}`, jobId);

    const svgString = svgBuffer.toString('utf-8');

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
    const processedSvgBuffer = Buffer.from(processedSvg, 'utf-8');
    log('verbose', `SVG preprocessing complete`, jobId);

    const baseName = originalFilename.replace(/\.svg$/i, '');
    const results: { buffer: Buffer; filename: string; mimeType: string }[] = [];

    // Convert based on format
    if (format === 'png') {
      log('debug', `Converting to PNG (${outputSize}x${outputSize}px)`, jobId);
      const pngResult = await convertToPng(
        processedSvgBuffer,
        baseName,
        scale,
        cornerRadius,
        outputSize,
        jobId,
      );
      log('verbose', `PNG output size: ${formatBytes(pngResult.buffer.length)}`, jobId);
      results.push(pngResult);
    } else if (format === 'ico') {
      log('debug', `Converting to ICO (sizes: ${ICO_SIZES.join(', ')}px)`, jobId);
      const icoResult = await convertToIco(
        processedSvgBuffer,
        baseName,
        scale,
        cornerRadius,
        jobId,
      );
      log('verbose', `ICO output size: ${formatBytes(icoResult.buffer.length)}`, jobId);
      results.push(icoResult);
    } else if (format === 'icns') {
      log('debug', `Converting to ICNS (1024px base)`, jobId);
      const icnsResult = await convertToIcns(
        processedSvgBuffer,
        baseName,
        scale,
        cornerRadius,
        jobId,
      );
      log('verbose', `ICNS output size: ${formatBytes(icnsResult.buffer.length)}`, jobId);
      results.push(icnsResult);
    } else if (format === 'favicon') {
      log('debug', `Converting to Favicon (sizes: ${FAVICON_SIZES.join(', ')}px)`, jobId);
      const faviconResult = await convertToFavicon(
        processedSvgBuffer,
        baseName,
        scale,
        cornerRadius,
        jobId,
      );
      log('verbose', `Favicon output size: ${formatBytes(faviconResult.buffer.length)}`, jobId);
      results.push(faviconResult);
    } else {
      // All formats: ICO, ICNS, Favicon, PNG (1024px), and original SVG
      log('debug', `Converting to all formats (ICO, ICNS, Favicon, PNG, SVG)`, jobId);

      const [icoResult, icnsResult, faviconResult, pngResult] = await Promise.all([
        convertToIco(processedSvgBuffer, 'icon', scale, cornerRadius, jobId),
        convertToIcns(processedSvgBuffer, 'icon', scale, cornerRadius, jobId),
        convertToFavicon(processedSvgBuffer, 'favicon', scale, cornerRadius, jobId),
        convertToPng(processedSvgBuffer, 'icon', scale, cornerRadius, 1024, jobId),
      ]);

      // Include original SVG
      const svgResult = {
        buffer: processedSvgBuffer,
        filename: 'icon.svg',
        mimeType: 'image/svg+xml',
      };

      log(
        'verbose',
        `All formats - ICO: ${formatBytes(icoResult.buffer.length)}, ICNS: ${formatBytes(icnsResult.buffer.length)}, Favicon: ${formatBytes(faviconResult.buffer.length)}, PNG: ${formatBytes(pngResult.buffer.length)}, SVG: ${formatBytes(svgResult.buffer.length)}`,
        jobId,
      );

      results.push(icoResult, icnsResult, faviconResult, pngResult, svgResult);
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
 * Convert SVG to PNG format
 */
async function convertToPng(
  svgBuffer: Buffer,
  baseName: string,
  scale: number,
  cornerRadius: RoundnessValue,
  outputSize: number,
  jobId?: string,
): Promise<{ buffer: Buffer; filename: string; mimeType: string }> {
  try {
    const [pngBuffer] = await renderSvgToPngs(svgBuffer, [outputSize], scale, cornerRadius, jobId);
    return {
      buffer: pngBuffer,
      filename: `${baseName}.png`,
      mimeType: 'image/png',
    };
  } catch (error) {
    throw new Error(extractErrorMessage(error, 'PNG conversion'));
  }
}

/**
 * Convert SVG to ICO format (Windows icon)
 */
async function convertToIco(
  svgBuffer: Buffer,
  baseName: string,
  scale: number,
  cornerRadius: RoundnessValue,
  jobId?: string,
): Promise<{ buffer: Buffer; filename: string; mimeType: string }> {
  try {
    log('verbose', `Rendering ${ICO_SIZES.length} PNG sizes for ICO`, jobId);
    const pngBuffers = await renderSvgToPngs(svgBuffer, ICO_SIZES, scale, cornerRadius, jobId);

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
 * Convert SVG to Favicon ICO format (web favicon)
 * Uses only 16, 32, and 48px sizes for web compatibility
 */
async function convertToFavicon(
  svgBuffer: Buffer,
  baseName: string,
  scale: number,
  cornerRadius: RoundnessValue,
  jobId?: string,
): Promise<{ buffer: Buffer; filename: string; mimeType: string }> {
  try {
    log('verbose', `Rendering ${FAVICON_SIZES.length} PNG sizes for favicon`, jobId);
    const pngBuffers = await renderSvgToPngs(svgBuffer, FAVICON_SIZES, scale, cornerRadius, jobId);

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
 * Convert SVG to ICNS format (macOS icon)
 *
 * macOS icons need automatic scaling to match system icon appearance.
 * Apple's design guidelines expect icons to have padding around them so they
 * visually align with other system icons. We apply MACOS_ICON_SCALE (~80.5%)
 * to the user's scale factor to achieve this.
 *
 * This function renders PNGs at each required size directly from the SVG
 * (rather than downsampling from a single large image) for optimal quality.
 */
async function convertToIcns(
  svgBuffer: Buffer,
  baseName: string,
  scale: number,
  cornerRadius: RoundnessValue,
  jobId?: string,
): Promise<{ buffer: Buffer; filename: string; mimeType: string }> {
  try {
    // Apply macOS icon scaling to match system icon appearance
    // User's 100% scale becomes ~80.5% to add proper padding
    const macosAdjustedScale = scale * MACOS_ICON_SCALE;

    // Get unique sizes needed (some OSTypes share the same pixel size)
    const uniqueSizes = [...new Set(ICNS_ICON_TYPES.map((t) => t.size))].sort((a, b) => a - b);

    log(
      'verbose',
      `Rendering ICNS at ${uniqueSizes.length} unique sizes with macOS scaling (${scale}% → ${macosAdjustedScale.toFixed(1)}%)`,
      jobId,
    );

    // Render all unique sizes with the macOS-adjusted scale
    const pngBuffers = await renderSvgToPngs(
      svgBuffer,
      uniqueSizes,
      macosAdjustedScale,
      cornerRadius,
      jobId,
    );

    // Create a map of size -> PNG buffer for easy lookup
    const pngBySize = new Map<number, Buffer>();
    uniqueSizes.forEach((size, index) => {
      pngBySize.set(size, pngBuffers[index]);
    });

    // Build ICNS file with all icon types
    log('verbose', `Encoding ICNS file with ${ICNS_ICON_TYPES.length} icon entries`, jobId);
    const icns = new Icns();

    for (const { osType, size } of ICNS_ICON_TYPES) {
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
 * Render SVG to PNG buffers at specified sizes
 */
async function renderSvgToPngs(
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

  log('verbose', `Rendering ${sizes.length} size(s): [${sizes.join(', ')}]px`, jobId);

  return Promise.all(
    sizes.map(async (size) => {
      try {
        const scaleFactor = scale / 100;
        let pngBuffer: Buffer;

        if (scaleFactor <= 1) {
          // Scale <= 100%: render smaller icon with padding
          const iconSize = Math.round(size * scaleFactor);
          const renderWidth = Math.round(iconSize * aspectRatio.width);
          const renderHeight = Math.round(iconSize * aspectRatio.height);

          log('verbose', `Size ${size}px: rendering at ${iconSize}px (${scale}% scale)`, jobId);

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

          pngBuffer = await sharp(Buffer.from(pngData))
            .extend({
              top: paddingTop,
              bottom: paddingBottom,
              left: paddingLeft,
              right: paddingRight,
              background: { r: 0, g: 0, b: 0, alpha: 0 },
            })
            .resize(size, size, { fit: 'fill' }) // Ensure exact dimensions
            .png()
            .toBuffer();
        } else {
          // Scale > 100%: render larger and crop center
          const renderSize = Math.round(size * scaleFactor);

          log(
            'verbose',
            `Size ${size}px: rendering at ${renderSize}px then cropping (${scale}% scale)`,
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

          pngBuffer = await sharp(extendedBuffer)
            .extract({
              left: safeOffset,
              top: safeOffset,
              width: extractSize,
              height: extractSize,
            })
            .resize(size, size, { fit: 'fill' }) // Ensure exact dimensions
            .png()
            .toBuffer();
        }

        // Apply corner radius mask if specified
        if (cornerRadius > 0) {
          log('verbose', `Applying ${cornerRadius}% corner radius to ${size}px image`, jobId);
          const maskBuffer = createRoundedMask(size, cornerRadius);
          pngBuffer = await sharp(pngBuffer)
            .composite([
              {
                input: maskBuffer,
                blend: 'dest-in',
              },
            ])
            .resize(size, size, { fit: 'fill' }) // Ensure exact dimensions after composite
            .png()
            .toBuffer();
        }

        // Final size verification - ensure output is exactly the target size
        pngBuffer = await sharp(pngBuffer).resize(size, size, { fit: 'fill' }).png().toBuffer();

        return pngBuffer;
      } catch (error) {
        log(
          'error',
          `Failed to render ${size}px PNG: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
