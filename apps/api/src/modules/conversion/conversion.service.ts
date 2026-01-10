import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import {
  containsDangerousPatterns,
  isQuickSafe,
  sanitizeSvg,
} from '../../common/security/index.js';
import { WorkerPoolService } from '../workers/worker-pool.service.js';
import type {
  BackgroundRemovalMode,
  OutputFormat,
  PngColorDepth,
  PngColorspace,
  RoundnessValue,
  SourceFileType,
} from './dto/convert.dto.js';

export interface ConversionResult {
  buffer: Buffer;
  filename: string;
  mimeType: string;
}

export interface SourceDimensions {
  width: number;
  height: number;
}

export interface ConversionOptions {
  scale: number;
  cornerRadius: RoundnessValue;
  backgroundRemovalMode: BackgroundRemovalMode;
  backgroundRemovalColor?: string;
  outputSize: number;
  pngDpi?: number;
  pngColorspace?: PngColorspace;
  pngColorDepth?: PngColorDepth;
  sourceDimensions?: SourceDimensions;
}

@Injectable()
export class ConversionService {
  private readonly logger = new Logger(ConversionService.name);

  constructor(private readonly workerPool: WorkerPoolService) {}

  async convert(
    inputBuffer: Buffer,
    originalFilename: string,
    format: OutputFormat,
    options: ConversionOptions,
  ): Promise<ConversionResult | ConversionResult[]> {
    const inputSize = inputBuffer.length;
    const sourceType = this.detectSourceType(originalFilename);

    this.logger.log(
      `Received conversion request: ${originalFilename} (${this.formatBytes(inputSize)}, type: ${sourceType})`,
    );

    // Validate and sanitize based on source type
    if (sourceType === 'svg') {
      let svgString = inputBuffer.toString('utf-8');

      if (!this.isValidSvg(svgString)) {
        this.logger.warn(`Rejected invalid SVG: ${originalFilename}`);
        throw new BadRequestException(
          'The uploaded file is not a valid SVG. Expected file to start with <svg or <?xml declaration.',
        );
      }

      // Quick security check for obviously malicious content
      if (!isQuickSafe(svgString)) {
        this.logger.warn(`Rejected SVG with dangerous patterns: ${originalFilename}`);
        throw new BadRequestException(
          'The uploaded SVG contains potentially dangerous content and has been rejected for security reasons.',
        );
      }

      // Full sanitization to remove XSS, XXE, and other threats
      try {
        const sanitizeResult = sanitizeSvg(svgString);
        if (sanitizeResult.wasModified) {
          this.logger.debug(
            `SVG sanitized for ${originalFilename}: removed ${sanitizeResult.removedElements.join(', ') || 'unsafe content'}`,
          );
          // Use sanitized content for conversion
          inputBuffer = Buffer.from(sanitizeResult.sanitized, 'utf-8');
        }

        // Additional check for dangerous patterns after sanitization
        if (containsDangerousPatterns(sanitizeResult.sanitized)) {
          this.logger.warn(`SVG still contains dangerous patterns after sanitization: ${originalFilename}`);
          throw new BadRequestException(
            'The uploaded SVG could not be safely processed. Please ensure it does not contain scripts or external references.',
          );
        }
      } catch (error) {
        if (error instanceof BadRequestException) {
          throw error;
        }
        this.logger.warn(`SVG sanitization failed for ${originalFilename}: ${error}`);
        throw new BadRequestException(
          'The uploaded SVG could not be processed due to security validation. Please try a different file.',
        );
      }
    } else if (sourceType === 'png') {
      if (!this.isValidPng(inputBuffer)) {
        this.logger.warn(`Rejected invalid PNG: ${originalFilename}`);
        throw new BadRequestException(
          'The uploaded file is not a valid PNG. Please upload a valid PNG image.',
        );
      }
    }

    const dimensionsInfo = options.sourceDimensions
      ? ` (source: ${options.sourceDimensions.width}x${options.sourceDimensions.height}px)`
      : '';

    this.logger.debug(
      `Submitting job: ${originalFilename} -> ${format} (scale: ${options.scale}%, corner: ${options.cornerRadius}%, bg: ${options.backgroundRemovalMode}, size: ${options.outputSize}px)${dimensionsInfo}`,
    );

    try {
      // Submit job to worker pool
      const result = await this.workerPool.submitJob({
        inputBuffer,
        sourceType,
        originalFilename,
        format,
        scale: options.scale,
        cornerRadius: options.cornerRadius,
        backgroundRemovalMode: options.backgroundRemovalMode,
        backgroundRemovalColor: options.backgroundRemovalColor,
        outputSize: options.outputSize,
        pngDpi: options.pngDpi,
        pngColorspace: options.pngColorspace,
        pngColorDepth: options.pngColorDepth,
        sourceDimensions: options.sourceDimensions,
      });

      if (!result.success) {
        this.logger.error(`Conversion failed for ${originalFilename}: ${result.error}`);
        // Pass through the detailed error message from the worker
        throw new BadRequestException(
          result.error || 'Conversion failed. Please try a different file.',
        );
      }

      if (!result.results || result.results.length === 0) {
        this.logger.error(`No results produced for ${originalFilename}`);
        throw new InternalServerErrorException(
          'Conversion completed but no output was produced. This is unexpected - please try again.',
        );
      }

      const totalOutputSize = result.results.reduce((sum, r) => sum + r.buffer.length, 0);
      this.logger.log(
        `Conversion successful: ${originalFilename} -> ${result.results.map((r) => r.filename).join(', ')} (${this.formatBytes(totalOutputSize)}) in ${result.processingTimeMs}ms`,
      );

      // Return single result or array based on format
      if (result.results.length === 1) {
        return result.results[0];
      }
      return result.results;
    } catch (error) {
      // Re-throw HTTP exceptions as-is
      if (error instanceof BadRequestException || error instanceof InternalServerErrorException) {
        throw error;
      }

      // Wrap unexpected errors
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Unexpected error converting ${originalFilename}: ${message}`);
      throw new InternalServerErrorException(
        `An unexpected error occurred during conversion: ${message}`,
      );
    }
  }

  private detectSourceType(filename: string): SourceFileType {
    const lower = filename.toLowerCase();
    if (lower.endsWith('.png')) {
      return 'png';
    }
    return 'svg';
  }

  private isValidSvg(content: string): boolean {
    const trimmed = content.trim();
    // Must have <svg tag somewhere
    if (!trimmed.includes('<svg')) {
      return false;
    }
    // Can start with XML declaration or directly with <svg
    return trimmed.startsWith('<svg') || trimmed.startsWith('<?xml');
  }

  private isValidPng(buffer: Buffer): boolean {
    // PNG files start with an 8-byte signature: 89 50 4E 47 0D 0A 1A 0A
    if (buffer.length < 8) {
      return false;
    }
    const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    for (let i = 0; i < 8; i++) {
      if (buffer[i] !== pngSignature[i]) {
        return false;
      }
    }
    return true;
  }

  private formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
}
