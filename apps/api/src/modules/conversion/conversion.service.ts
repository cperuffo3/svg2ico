import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import {
  analyzeThreats,
  containsDangerousPatterns,
  createMalformedAnalysis,
  detectExternalReferences,
  inlineExternalImages,
  isQuickSafe,
  sanitizeSvg,
  ThreatClassification,
  type ExternalReferenceAnalysis,
  type PatternMatchLocation,
  type ThreatAnalysis,
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

export type SvgErrorType =
  | 'invalid_format'
  | 'security_pre_sanitize'
  | 'security_post_sanitize'
  | 'sanitization_failed'
  | 'external_resource_invalid';

export interface SvgErrorPayload {
  message: string;
  errorType: SvgErrorType;
  classification?: ThreatClassification;
  matchedPatterns?: string[];
  patternLocations?: PatternMatchLocation[];
  /**
   * Whether the dialog with the SVG editor should be offered to the user.
   * True for SVG validation/security errors where we have the file contents.
   */
  canSubmit: boolean;
}

function svgError(payload: SvgErrorPayload): BadRequestException {
  return new BadRequestException({
    statusCode: 400,
    error: 'Bad Request',
    ...payload,
  });
}

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
      const svgString = inputBuffer.toString('utf-8');

      if (!this.isValidSvg(svgString)) {
        const analysis = createMalformedAnalysis(
          ThreatClassification.INVALID_FORMAT,
          'File does not start with <svg or <?xml declaration',
        );
        this.logSecurityEvent(originalFilename, analysis);
        throw svgError({
          message:
            'The uploaded file is not a valid SVG. Expected file to start with <svg or <?xml declaration.',
          errorType: 'invalid_format',
          classification: analysis.classification,
          canSubmit: true,
        });
      }

      // Analyze for attack patterns before processing
      const threatAnalysis = analyzeThreats(svgString);
      if (threatAnalysis) {
        this.logSecurityEvent(originalFilename, threatAnalysis);
        throw svgError({
          message:
            'The uploaded SVG contains potentially dangerous content and has been rejected for security reasons.',
          errorType: 'security_pre_sanitize',
          classification: threatAnalysis.classification,
          matchedPatterns: threatAnalysis.matchedPatterns,
          patternLocations: threatAnalysis.patternLocations,
          canSubmit: true,
        });
      }

      // Quick security check (backup - should be caught by analyzeThreats)
      if (!isQuickSafe(svgString)) {
        const analysis = createMalformedAnalysis(
          ThreatClassification.INVALID_FORMAT,
          'Failed quick safety check',
        );
        this.logSecurityEvent(originalFilename, analysis);
        throw svgError({
          message:
            'The uploaded SVG contains potentially dangerous content and has been rejected for security reasons.',
          errorType: 'security_pre_sanitize',
          classification: analysis.classification,
          canSubmit: true,
        });
      }

      // Detect external references (log but don't block)
      // Note: resvg does NOT fetch external URLs by default, so this is primarily for visibility
      const externalRefs = detectExternalReferences(svgString);
      if (externalRefs.hasExternalReferences) {
        this.logExternalReferenceWarning(originalFilename, externalRefs);
      }

      // Inline external <image href="https://..."> so resvg can actually render
      // them. Performs SSRF-safe fetches. Any 'rejected' resource (non-image
      // content-type, blocked host, oversized, etc.) is a hard error — the
      // file is referencing something that cannot be treated as an image.
      // Transient 'failed' outcomes (network/HTTP) are soft: original URL is
      // left in place and resvg will render that one image blank.
      let workingSvg = svgString;
      try {
        const inlineResult = await inlineExternalImages(svgString);
        if (inlineResult.inlined > 0 || inlineResult.failed > 0) {
          this.logger.log(
            `Inlined ${inlineResult.inlined} external resource(s) for ${originalFilename}, ${inlineResult.failed} failed/blocked`,
          );
          for (const d of inlineResult.details) {
            if (d.status !== 'inlined') {
              this.logger.warn(`  ${d.status} ${d.url}: ${d.reason ?? ''}`);
            }
          }
        }
        const bad = inlineResult.details.filter((d) => d.status !== 'inlined');
        if (bad.length > 0) {
          const matchedPatterns = bad.map((d) => `${d.url} — ${d.reason ?? d.status}`);
          const patternLocations: PatternMatchLocation[] = bad.map((d) => {
            const { line, column } = this.offsetToLineColumn(svgString, d.tagStart);
            return {
              description: `External resource could not be loaded as an image: ${d.url} (${d.reason ?? d.status})`,
              line,
              column,
              startOffset: d.tagStart,
              endOffset: d.tagEnd,
              snippet: svgString.slice(d.tagStart, Math.min(d.tagEnd, d.tagStart + 200)),
            };
          });
          throw svgError({
            message:
              bad.length === 1
                ? 'An external image reference could not be loaded as an image.'
                : `${bad.length} external image references could not be loaded as images.`,
            errorType: 'external_resource_invalid',
            matchedPatterns,
            patternLocations,
            canSubmit: true,
          });
        }
        workingSvg = inlineResult.result;
      } catch (err) {
        if (err instanceof BadRequestException) {
          throw err;
        }
        this.logger.warn(
          `External resource inlining threw for ${originalFilename}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }

      // Full sanitization to remove XSS, XXE, and other threats
      try {
        const sanitizeResult = sanitizeSvg(workingSvg);
        if (sanitizeResult.wasModified) {
          this.logger.debug(
            `SVG sanitized for ${originalFilename}: removed ${sanitizeResult.removedElements.join(', ') || 'unsafe content'}`,
          );
          // Use sanitized content for conversion
          inputBuffer = Buffer.from(sanitizeResult.sanitized, 'utf-8');
        }

        // Additional check for dangerous patterns after sanitization
        if (containsDangerousPatterns(sanitizeResult.sanitized)) {
          const postAnalysis = analyzeThreats(sanitizeResult.sanitized);
          // Run analysis on the ORIGINAL content so the highlights match what the
          // user uploaded (sanitization may have re-encoded/reordered content).
          const originalAnalysis = analyzeThreats(svgString);
          const analysisForLog =
            postAnalysis ??
            createMalformedAnalysis(
              ThreatClassification.INVALID_FORMAT,
              'Dangerous patterns remain after sanitization',
            );
          this.logSecurityEvent(originalFilename, analysisForLog);
          throw svgError({
            message:
              'The uploaded SVG could not be safely processed. Please ensure it does not contain scripts or external references.',
            errorType: 'security_post_sanitize',
            classification: analysisForLog.classification,
            matchedPatterns: originalAnalysis?.matchedPatterns ?? analysisForLog.matchedPatterns,
            patternLocations: originalAnalysis?.patternLocations,
            canSubmit: true,
          });
        }
      } catch (error) {
        if (error instanceof BadRequestException) {
          throw error;
        }
        const analysis = createMalformedAnalysis(
          ThreatClassification.CORRUPTED_FILE,
          `Sanitization failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
        this.logSecurityEvent(originalFilename, analysis);
        throw svgError({
          message:
            'The uploaded SVG could not be processed due to security validation. Please try a different file.',
          errorType: 'sanitization_failed',
          classification: analysis.classification,
          canSubmit: true,
        });
      }
    } else if (sourceType === 'png') {
      if (!this.isValidPng(inputBuffer)) {
        const analysis = createMalformedAnalysis(
          ThreatClassification.WRONG_FILE_TYPE,
          'File does not have valid PNG signature',
        );
        this.logSecurityEvent(originalFilename, analysis);
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

  private offsetToLineColumn(content: string, offset: number): { line: number; column: number } {
    let line = 1;
    let column = 1;
    const end = Math.min(offset, content.length);
    for (let i = 0; i < end; i++) {
      if (content[i] === '\n') {
        line++;
        column = 1;
      } else {
        column++;
      }
    }
    return { line, column };
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

  /**
   * Log security events with appropriate severity based on threat classification.
   * Attack attempts are logged at ERROR level; malformed files at WARN level.
   */
  private logSecurityEvent(filename: string, analysis: ThreatAnalysis): void {
    const details = {
      filename,
      classification: analysis.classification,
      isLikelyAttack: analysis.isLikelyAttack,
      patterns: analysis.matchedPatterns,
    };

    if (analysis.isLikelyAttack) {
      // Likely attack - log at error level for alerting
      this.logger.error(
        `SECURITY: Possible attack detected in "${filename}" - ${analysis.description}`,
        JSON.stringify(details),
      );
    } else {
      // Likely malformed file - log at warn level
      this.logger.warn(`Rejected malformed file "${filename}" - ${analysis.description}`);
    }
  }

  /**
   * Log external reference warnings. These are suspicious but allowed to proceed.
   * SSRF indicators are logged at WARN level; regular external refs at DEBUG.
   *
   * Note: resvg does NOT fetch external URLs by default (only local filesystem),
   * so these are logged for visibility rather than active threat prevention.
   */
  private logExternalReferenceWarning(filename: string, analysis: ExternalReferenceAnalysis): void {
    const details = {
      filename,
      references: analysis.references,
      hasSsrfIndicators: analysis.hasSsrfIndicators,
    };

    if (analysis.hasSsrfIndicators) {
      // Potential SSRF attempt - log at warn level
      this.logger.warn(
        `SECURITY: Potential SSRF indicators in "${filename}" - ${analysis.references.join(', ')}`,
        JSON.stringify(details),
      );
    } else {
      // Regular external references - log at debug level (informational)
      this.logger.debug(
        `External references detected in "${filename}": ${analysis.references.join(', ')}`,
      );
    }
  }
}
