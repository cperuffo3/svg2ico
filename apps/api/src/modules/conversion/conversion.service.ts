import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { WorkerPoolService } from '../workers/worker-pool.service.js';
import type { BackgroundRemovalMode, OutputFormat, RoundnessValue } from './dto/convert.dto.js';

export interface ConversionResult {
  buffer: Buffer;
  filename: string;
  mimeType: string;
}

export interface ConversionOptions {
  scale: number;
  cornerRadius: RoundnessValue;
  backgroundRemovalMode: BackgroundRemovalMode;
  backgroundRemovalColor?: string;
  outputSize: number;
}

@Injectable()
export class ConversionService {
  private readonly logger = new Logger(ConversionService.name);

  constructor(private readonly workerPool: WorkerPoolService) {}

  async convert(
    svgBuffer: Buffer,
    originalFilename: string,
    format: OutputFormat,
    options: ConversionOptions,
  ): Promise<ConversionResult | ConversionResult[]> {
    const inputSize = svgBuffer.length;
    this.logger.log(
      `Received conversion request: ${originalFilename} (${this.formatBytes(inputSize)})`,
    );

    // Quick validation before submitting to worker
    const svgString = svgBuffer.toString('utf-8');
    if (!this.isValidSvg(svgString)) {
      this.logger.warn(`Rejected invalid SVG: ${originalFilename}`);
      throw new BadRequestException(
        'The uploaded file is not a valid SVG. Expected file to start with <svg or <?xml declaration.',
      );
    }

    this.logger.debug(
      `Submitting job: ${originalFilename} -> ${format} (scale: ${options.scale}%, corner: ${options.cornerRadius}%, bg: ${options.backgroundRemovalMode}, size: ${options.outputSize}px)`,
    );

    try {
      // Submit job to worker pool
      const result = await this.workerPool.submitJob({
        svgBuffer,
        originalFilename,
        format,
        scale: options.scale,
        cornerRadius: options.cornerRadius,
        backgroundRemovalMode: options.backgroundRemovalMode,
        backgroundRemovalColor: options.backgroundRemovalColor,
        outputSize: options.outputSize,
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

  private isValidSvg(content: string): boolean {
    const trimmed = content.trim();
    // Must have <svg tag somewhere
    if (!trimmed.includes('<svg')) {
      return false;
    }
    // Can start with XML declaration or directly with <svg
    return trimmed.startsWith('<svg') || trimmed.startsWith('<?xml');
  }

  private formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
}
