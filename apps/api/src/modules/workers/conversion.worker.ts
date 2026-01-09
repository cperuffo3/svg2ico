import { Resvg } from '@resvg/resvg-js';
import png2icons from 'png2icons';
import sharp from 'sharp';
import { encode as encodeIco } from 'sharp-ico';
import { parentPort, threadId } from 'worker_threads';
import type {
  ConversionJobData,
  ConversionJobResult,
  WorkerLogLevel,
  WorkerMessage,
  WorkerResponse,
} from './types/worker-messages.js';

const ICO_SIZES = [16, 32, 48, 256];

if (!parentPort) {
  throw new Error('This file must be run as a worker thread');
}

const port = parentPort;

function log(level: WorkerLogLevel, message: string, jobId?: string): void {
  const response: WorkerResponse = {
    type: 'log',
    level,
    message: `[Worker ${threadId}] ${message}`,
    jobId,
  };
  port.postMessage(response);
}

async function processJob(data: ConversionJobData): Promise<ConversionJobResult> {
  const startTime = Date.now();
  log(
    'debug',
    `Processing job ${data.jobId}: ${data.originalFilename} -> ${data.format}`,
    data.jobId,
  );

  try {
    const svgString = data.svgBuffer.toString('utf-8');

    if (!isValidSvg(svgString)) {
      log('warn', `Invalid SVG file for job ${data.jobId}`, data.jobId);
      return {
        jobId: data.jobId,
        success: false,
        error: 'Invalid SVG file',
        processingTimeMs: Date.now() - startTime,
      };
    }

    const baseName = data.originalFilename.replace(/\.svg$/i, '');
    const results: { buffer: Buffer; filename: string; mimeType: string }[] = [];

    if (data.format === 'ico' || data.format === 'both') {
      log('debug', `Converting to ICO for job ${data.jobId}`, data.jobId);
      const icoResult = await convertToIco(data.svgBuffer, baseName, data.scale, data.jobId);
      results.push(icoResult);
    }

    if (data.format === 'icns' || data.format === 'both') {
      log('debug', `Converting to ICNS for job ${data.jobId}`, data.jobId);
      const icnsResult = await convertToIcns(data.svgBuffer, baseName, data.scale, data.jobId);
      results.push(icnsResult);
    }

    log(
      'log',
      `Job ${data.jobId} completed successfully in ${Date.now() - startTime}ms`,
      data.jobId,
    );
    return {
      jobId: data.jobId,
      success: true,
      results,
      processingTimeMs: Date.now() - startTime,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    log('error', `Job ${data.jobId} failed: ${errorMsg}`, data.jobId);
    return {
      jobId: data.jobId,
      success: false,
      error: errorMsg,
      processingTimeMs: Date.now() - startTime,
    };
  }
}

function isValidSvg(content: string): boolean {
  const trimmed = content.trim();
  return trimmed.startsWith('<svg') || trimmed.startsWith('<?xml') || trimmed.includes('<svg');
}

async function convertToIco(
  svgBuffer: Buffer,
  baseName: string,
  scale: number,
  jobId?: string,
): Promise<{ buffer: Buffer; filename: string; mimeType: string }> {
  const pngBuffers = await renderSvgToPngs(svgBuffer, ICO_SIZES, scale, jobId);
  const icoBuffer = encodeIco(pngBuffers);

  return {
    buffer: icoBuffer,
    filename: `${baseName}.ico`,
    mimeType: 'image/x-icon',
  };
}

async function convertToIcns(
  svgBuffer: Buffer,
  baseName: string,
  scale: number,
  jobId?: string,
): Promise<{ buffer: Buffer; filename: string; mimeType: string }> {
  const [largestPng] = await renderSvgToPngs(svgBuffer, [1024], scale, jobId);

  const icnsBuffer = png2icons.createICNS(largestPng, png2icons.BICUBIC, 0);

  if (!icnsBuffer) {
    throw new Error('Failed to create ICNS file');
  }

  return {
    buffer: Buffer.from(icnsBuffer),
    filename: `${baseName}.icns`,
    mimeType: 'image/icns',
  };
}

/**
 * Get the intrinsic dimensions of an SVG
 */
function getSvgDimensions(svgString: string): { width: number; height: number } {
  // Try viewBox first
  const viewBoxMatch = svgString.match(/viewBox=["']([^"']+)["']/i);
  if (viewBoxMatch) {
    const parts = viewBoxMatch[1].split(/[\s,]+/).map(Number);
    if (parts.length >= 4) {
      return { width: parts[2], height: parts[3] };
    }
  }

  // Fall back to width/height attributes
  const widthMatch = svgString.match(/\bwidth=["']([^"']+)["']/i);
  const heightMatch = svgString.match(/\bheight=["']([^"']+)["']/i);
  const width = widthMatch ? parseFloat(widthMatch[1]) : 100;
  const height = heightMatch ? parseFloat(heightMatch[1]) : 100;

  return { width, height };
}

async function renderSvgToPngs(
  svgBuffer: Buffer,
  sizes: number[],
  scale: number,
  jobId?: string,
): Promise<Buffer[]> {
  const svgString = svgBuffer.toString('utf-8');

  // Get SVG dimensions to handle rectangular SVGs
  const svgDimensions = getSvgDimensions(svgString);
  const largestDimension = Math.max(svgDimensions.width, svgDimensions.height);
  const aspectRatio = {
    width: svgDimensions.width / largestDimension,
    height: svgDimensions.height / largestDimension,
  };

  log(
    'debug',
    `SVG dimensions: ${svgDimensions.width}x${svgDimensions.height}, aspect ratio: ${aspectRatio.width}x${aspectRatio.height}`,
    jobId,
  );

  return Promise.all(
    sizes.map(async (size) => {
      try {
        // Scale factor: 50-200%
        // At 100%, icon fills the entire space (largest dimension fits)
        // At 50%, icon is half size with transparent padding around it
        // At 200%, icon is rendered at 2x size and cropped to fit
        const scaleFactor = scale / 100;
        let pngBuffer: Buffer;

        if (scaleFactor <= 1) {
          // Scale <= 100%: render smaller icon with padding
          const iconSize = Math.round(size * scaleFactor);

          // Calculate the actual render dimensions based on aspect ratio
          // The largest dimension will be iconSize, the other will be smaller
          const renderWidth = Math.round(iconSize * aspectRatio.width);
          const renderHeight = Math.round(iconSize * aspectRatio.height);

          log(
            'debug',
            `Rendering size ${size} at scale ${scale}%: iconSize=${iconSize}, renderWidth=${renderWidth}, renderHeight=${renderHeight}`,
            jobId,
          );

          // Render SVG to PNG fitting to the largest dimension
          const resvg = new Resvg(svgString, {
            fitTo: {
              mode: svgDimensions.width >= svgDimensions.height ? 'width' : 'height',
              value: iconSize,
            },
            background: 'rgba(0, 0, 0, 0)', // Transparent background
          });

          const rendered = resvg.render();
          const pngData = rendered.asPng();

          // Always center the icon in a square canvas
          // Calculate padding to center the (possibly rectangular) icon
          const paddingLeft = Math.round((size - renderWidth) / 2);
          const paddingRight = size - renderWidth - paddingLeft;
          const paddingTop = Math.round((size - renderHeight) / 2);
          const paddingBottom = size - renderHeight - paddingTop;

          log(
            'debug',
            `Padding: top=${paddingTop}, bottom=${paddingBottom}, left=${paddingLeft}, right=${paddingRight}`,
            jobId,
          );

          // Add padding using sharp to center the icon in square canvas
          pngBuffer = await sharp(Buffer.from(pngData))
            .extend({
              top: paddingTop,
              bottom: paddingBottom,
              left: paddingLeft,
              right: paddingRight,
              background: { r: 0, g: 0, b: 0, alpha: 0 },
            })
            .resize(size, size) // Ensure exact size after padding
            .png()
            .toBuffer();
        } else {
          // Scale > 100%: render larger and crop center
          const renderSize = Math.round(size * scaleFactor);

          log(
            'debug',
            `Rendering size ${size} at scale ${scale}% (>100%): renderSize=${renderSize}`,
            jobId,
          );

          // For rectangular SVGs, render at a size where the largest dimension = renderSize
          const resvg = new Resvg(svgString, {
            fitTo: {
              mode: svgDimensions.width >= svgDimensions.height ? 'width' : 'height',
              value: renderSize,
            },
            background: 'rgba(0, 0, 0, 0)', // Transparent background
          });

          const rendered = resvg.render();
          const pngData = rendered.asPng();

          // Get actual rendered dimensions from the PNG
          const renderedPngBuffer = Buffer.from(pngData);
          const metadata = await sharp(renderedPngBuffer).metadata();
          const actualWidth = metadata.width || renderSize;
          const actualHeight = metadata.height || renderSize;

          log(
            'debug',
            `Actual rendered dimensions: ${actualWidth}x${actualHeight}`,
            jobId,
          );

          // Calculate the square canvas size (should be the larger dimension)
          const canvasSize = Math.max(actualWidth, actualHeight);

          // Calculate extension to center the image in a square canvas
          const extendLeft = Math.round((canvasSize - actualWidth) / 2);
          const extendRight = canvasSize - actualWidth - extendLeft;
          const extendTop = Math.round((canvasSize - actualHeight) / 2);
          const extendBottom = canvasSize - actualHeight - extendTop;

          log(
            'debug',
            `Canvas size: ${canvasSize}, Extend: top=${extendTop}, bottom=${extendBottom}, left=${extendLeft}, right=${extendRight}`,
            jobId,
          );

          // Extract the center 'size' pixels from the square canvas
          const offset = Math.round((canvasSize - size) / 2);

          // Ensure we don't extract outside bounds
          const safeOffset = Math.max(0, offset);
          const maxExtractSize = canvasSize - safeOffset;
          const extractSize = Math.min(size, maxExtractSize);

          log(
            'debug',
            `Extract offset=${safeOffset}, extractSize=${extractSize}`,
            jobId,
          );

          // First extend to make it square
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

          // Then extract the center portion
          pngBuffer = await sharp(extendedBuffer)
            .extract({
              left: safeOffset,
              top: safeOffset,
              width: extractSize,
              height: extractSize,
            })
            .resize(size, size) // Ensure final size is correct
            .png()
            .toBuffer();
        }

        return pngBuffer;
      } catch (error) {
        log(
          'error',
          `Error rendering PNG at size ${size} with scale ${scale}%: ${error instanceof Error ? error.message : error}`,
          jobId,
        );
        log('error', `SVG dimensions: ${JSON.stringify(svgDimensions)}`, jobId);
        log('error', `Aspect ratio: ${JSON.stringify(aspectRatio)}`, jobId);
        throw error;
      }
    }),
  );
}

// Handle messages from main thread
port.on('message', async (message: WorkerMessage) => {
  if (message.type === 'shutdown') {
    log('log', 'Received shutdown signal');
    process.exit(0);
  }

  if (message.type === 'job') {
    const result = await processJob(message.data);
    const response: WorkerResponse = { type: 'result', data: result };
    port.postMessage(response);
  }
});

// Signal that worker is ready
log('log', 'Worker initialized and ready');
const readyResponse: WorkerResponse = { type: 'ready' };
port.postMessage(readyResponse);
