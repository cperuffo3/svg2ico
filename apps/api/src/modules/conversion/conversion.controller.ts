import {
  BadRequestException,
  Body,
  Controller,
  MaxFileSizeValidator,
  ParseFilePipe,
  Post,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import archiver from 'archiver';
import { Request, Response } from 'express';
import { MetricsService } from '../metrics/metrics.service.js';
import { ConversionService, type ConversionOptions } from './conversion.service.js';
import {
  ConvertOptionsDto,
  type BackgroundRemovalMode,
  type OutputFormat,
  type PngColorDepth,
  type PngColorspace,
  type RoundnessValue,
} from './dto/convert.dto.js';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

@ApiTags('Conversion')
@Controller('convert')
@UseGuards(ThrottlerGuard)
export class ConversionController {
  constructor(
    private readonly conversionService: ConversionService,
    private readonly metricsService: MetricsService,
  ) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({
    summary: 'Convert SVG or PNG to ICO/ICNS',
    description:
      'Upload an SVG or PNG file and convert it to ICO, ICNS, or both formats. PNG files will only generate sizes up to the source dimensions (no upscaling).',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'SVG or PNG file to convert',
        },
        format: {
          type: 'string',
          enum: ['ico', 'icns', 'both', 'png'],
          default: 'ico',
          description: 'Output format',
        },
        scale: {
          type: 'number',
          minimum: 50,
          maximum: 200,
          default: 100,
          description: 'Scale/padding factor (50-200%)',
        },
        cornerRadius: {
          type: 'number',
          enum: [0, 12.5, 25, 37.5, 50],
          default: 0,
          description: 'Corner radius as percentage (0, 12.5, 25, 37.5, or 50)',
        },
        backgroundRemovalMode: {
          type: 'string',
          enum: ['none', 'color', 'smart'],
          default: 'none',
          description: 'Background removal mode',
        },
        backgroundRemovalColor: {
          type: 'string',
          description: 'Color to remove (hex format, e.g., #ffffff)',
        },
        outputSize: {
          type: 'number',
          minimum: 16,
          maximum: 2048,
          default: 512,
          description: 'Output size in pixels (for PNG format)',
        },
        pngDpi: {
          type: 'number',
          minimum: 1,
          maximum: 600,
          default: 72,
          description: 'DPI/resolution for PNG output (1-600)',
        },
        pngColorspace: {
          type: 'string',
          enum: ['srgb', 'p3', 'cmyk'],
          default: 'srgb',
          description: 'Colorspace for PNG output',
        },
        pngColorDepth: {
          type: 'number',
          enum: [8, 24, 32],
          default: 32,
          description:
            'Color depth for PNG output (8=256 colors, 24=truecolor, 32=truecolor+alpha)',
        },
        sourceWidth: {
          type: 'number',
          description: 'Source image width in pixels (for PNG input)',
        },
        sourceHeight: {
          type: 'number',
          description: 'Source image height in pixels (for PNG input)',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Conversion successful - returns the icon file(s)',
    content: {
      'image/x-icon': {
        schema: { type: 'string', format: 'binary' },
      },
      'image/icns': {
        schema: { type: 'string', format: 'binary' },
      },
      'image/png': {
        schema: { type: 'string', format: 'binary' },
      },
      'application/zip': {
        schema: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid file or parameters' })
  @ApiResponse({ status: 413, description: 'File too large' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  async convert(
    @UploadedFile(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: MAX_FILE_SIZE })],
      }),
    )
    file: Express.Multer.File,
    @Body() options: ConvertOptionsDto,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const startTime = Date.now();
    const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';

    // Parse and validate options
    const format = this.parseFormat(options.format);
    const sourceDimensions = this.parseSourceDimensions(options.sourceWidth, options.sourceHeight);
    const conversionOptions: ConversionOptions = {
      scale: this.parseScale(options.scale),
      cornerRadius: this.parseCornerRadius(options.cornerRadius),
      backgroundRemovalMode: this.parseBackgroundRemovalMode(options.backgroundRemovalMode),
      backgroundRemovalColor: options.backgroundRemovalColor,
      outputSize: this.parseOutputSize(options.outputSize),
      pngDpi: this.parsePngDpi(options.pngDpi),
      pngColorspace: this.parsePngColorspace(options.pngColorspace),
      pngColorDepth: this.parsePngColorDepth(options.pngColorDepth),
      sourceDimensions,
    };

    let success = false;
    let outputSizeBytes: number | undefined;
    let errorMessage: string | undefined;

    try {
      const result = await this.conversionService.convert(
        file.buffer,
        file.originalname,
        format,
        conversionOptions,
      );

      const processingTimeMs = Date.now() - startTime;
      res.setHeader('X-Processing-Time-Ms', processingTimeMs.toString());

      if (Array.isArray(result)) {
        outputSizeBytes = result.reduce((sum, r) => sum + r.buffer.length, 0);
        await this.sendAsZip(res, result);
      } else {
        outputSizeBytes = result.buffer.length;
        res.setHeader('Content-Type', result.mimeType);
        res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
        res.send(result.buffer);
      }

      success = true;
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw error;
    } finally {
      // Log metrics asynchronously
      const processingTimeMs = Date.now() - startTime;
      const inputFormat = file.originalname.toLowerCase().endsWith('.png') ? 'png' : 'svg';
      this.metricsService
        .logConversion({
          ipAddress,
          inputFormat,
          outputFormat: format,
          inputSizeBytes: file.size,
          outputSizeBytes,
          processingTimeMs,
          success,
          errorMessage,
        })
        .catch(() => {
          // Ignore metrics errors
        });
    }
  }

  private parseFormat(format: string | undefined): OutputFormat {
    const normalized = (format || 'ico').toLowerCase();
    if (!['ico', 'icns', 'both', 'png', 'favicon'].includes(normalized)) {
      throw new BadRequestException(
        'Invalid format. Must be "ico", "icns", "both", "png", or "favicon"',
      );
    }
    return normalized as OutputFormat;
  }

  private parseScale(scale: string | number | undefined): number {
    const parsed = typeof scale === 'string' ? parseFloat(scale) : (scale ?? 100);
    if (isNaN(parsed) || parsed < 50 || parsed > 200) {
      throw new BadRequestException('Scale must be between 50 and 200');
    }
    return parsed;
  }

  private parseCornerRadius(cornerRadius: string | number | undefined): RoundnessValue {
    const parsed =
      typeof cornerRadius === 'string' ? parseFloat(cornerRadius) : (cornerRadius ?? 0);
    const validValues: RoundnessValue[] = [0, 12.5, 25, 37.5, 50];
    if (!validValues.includes(parsed as RoundnessValue)) {
      throw new BadRequestException('Corner radius must be 0, 12.5, 25, 37.5, or 50');
    }
    return parsed as RoundnessValue;
  }

  private parseBackgroundRemovalMode(mode: string | undefined): BackgroundRemovalMode {
    const normalized = (mode || 'none').toLowerCase();
    if (!['none', 'color', 'smart'].includes(normalized)) {
      throw new BadRequestException('Background removal mode must be "none", "color", or "smart"');
    }
    return normalized as BackgroundRemovalMode;
  }

  private parseOutputSize(size: string | number | undefined): number {
    const parsed = typeof size === 'string' ? parseInt(size, 10) : (size ?? 512);
    if (isNaN(parsed) || parsed < 16 || parsed > 2048) {
      throw new BadRequestException('Output size must be between 16 and 2048');
    }
    return parsed;
  }

  private parsePngDpi(dpi: string | number | undefined): number {
    const parsed = typeof dpi === 'string' ? parseInt(dpi, 10) : (dpi ?? 72);
    if (isNaN(parsed) || parsed < 1 || parsed > 600) {
      throw new BadRequestException('PNG DPI must be between 1 and 600');
    }
    return parsed;
  }

  private parsePngColorspace(colorspace: string | undefined): PngColorspace {
    const normalized = (colorspace || 'srgb').toLowerCase();
    if (!['srgb', 'p3', 'cmyk'].includes(normalized)) {
      throw new BadRequestException('PNG colorspace must be "srgb", "p3", or "cmyk"');
    }
    return normalized as PngColorspace;
  }

  private parsePngColorDepth(colorDepth: string | number | undefined): PngColorDepth {
    const parsed = typeof colorDepth === 'string' ? parseInt(colorDepth, 10) : (colorDepth ?? 32);
    const validValues: PngColorDepth[] = [8, 24, 32];
    if (!validValues.includes(parsed as PngColorDepth)) {
      throw new BadRequestException('PNG color depth must be 8, 24, or 32');
    }
    return parsed as PngColorDepth;
  }

  private parseSourceDimensions(
    width: string | number | undefined,
    height: string | number | undefined,
  ): { width: number; height: number } | undefined {
    if (width === undefined || height === undefined) {
      return undefined;
    }
    const parsedWidth = typeof width === 'string' ? parseInt(width, 10) : width;
    const parsedHeight = typeof height === 'string' ? parseInt(height, 10) : height;
    if (isNaN(parsedWidth) || isNaN(parsedHeight) || parsedWidth <= 0 || parsedHeight <= 0) {
      return undefined;
    }
    return { width: parsedWidth, height: parsedHeight };
  }

  private async sendAsZip(
    res: Response,
    results: { buffer: Buffer; filename: string }[],
  ): Promise<void> {
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="icons.zip"');

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.pipe(res);

    for (const result of results) {
      // Ensure buffer is a proper Buffer instance (worker thread transfer can convert to Uint8Array)
      const buffer = Buffer.isBuffer(result.buffer) ? result.buffer : Buffer.from(result.buffer);
      archive.append(buffer, { name: result.filename });
    }

    await archive.finalize();
  }
}
