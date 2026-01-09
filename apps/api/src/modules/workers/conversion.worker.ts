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
      const icoResult = await convertToIco(data.svgBuffer, baseName, data.scale);
      results.push(icoResult);
    }

    if (data.format === 'icns' || data.format === 'both') {
      log('debug', `Converting to ICNS for job ${data.jobId}`, data.jobId);
      const icnsResult = await convertToIcns(data.svgBuffer, baseName, data.scale);
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
): Promise<{ buffer: Buffer; filename: string; mimeType: string }> {
  const pngBuffers = await renderSvgToPngs(svgBuffer, ICO_SIZES, scale);
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
): Promise<{ buffer: Buffer; filename: string; mimeType: string }> {
  const [largestPng] = await renderSvgToPngs(svgBuffer, [1024], scale);

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

async function renderSvgToPngs(
  svgBuffer: Buffer,
  sizes: number[],
  scale: number,
): Promise<Buffer[]> {
  const svgString = svgBuffer.toString('utf-8');

  return Promise.all(
    sizes.map(async (size) => {
      const scaleFactor = scale / 100;
      const iconSize = Math.round(size * scaleFactor);
      const padding = Math.round((size - iconSize) / 2);

      const resvg = new Resvg(svgString, {
        fitTo: {
          mode: 'width',
          value: iconSize,
        },
        background: 'rgba(0, 0, 0, 0)',
      });

      const rendered = resvg.render();
      const pngData = rendered.asPng();

      if (scale === 100) {
        return Buffer.from(pngData);
      }

      const paddedPng = await sharp(Buffer.from(pngData))
        .extend({
          top: padding,
          bottom: padding,
          left: padding,
          right: padding,
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .resize(size, size)
        .png()
        .toBuffer();

      return paddedPng;
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
