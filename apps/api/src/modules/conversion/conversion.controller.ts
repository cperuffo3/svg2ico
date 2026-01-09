import {
  BadRequestException,
  Body,
  Controller,
  FileTypeValidator,
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
import { ConversionService } from './conversion.service.js';
import { ConvertOptionsDto, type OutputFormat } from './dto/convert.dto.js';

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
    summary: 'Convert SVG to ICO/ICNS',
    description: 'Upload an SVG file and convert it to ICO, ICNS, or both formats',
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
          description: 'SVG file to convert',
        },
        format: {
          type: 'string',
          enum: ['ico', 'icns', 'both'],
          default: 'ico',
          description: 'Output format',
        },
        scale: {
          type: 'number',
          minimum: 50,
          maximum: 100,
          default: 100,
          description: 'Scale/padding factor (50-100%)',
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
        validators: [
          new MaxFileSizeValidator({ maxSize: MAX_FILE_SIZE }),
          new FileTypeValidator({ fileType: /(svg|xml)/ }),
        ],
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
    const scale = this.parseScale(options.scale);

    let success = false;
    let outputSizeBytes: number | undefined;
    let errorMessage: string | undefined;

    try {
      const result = await this.conversionService.convert(
        file.buffer,
        file.originalname,
        format,
        scale,
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
      this.metricsService
        .logConversion({
          ipAddress,
          inputFormat: 'svg',
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
    if (!['ico', 'icns', 'both'].includes(normalized)) {
      throw new BadRequestException('Invalid format. Must be "ico", "icns", or "both"');
    }
    return normalized as OutputFormat;
  }

  private parseScale(scale: string | number | undefined): number {
    const parsed = typeof scale === 'string' ? parseInt(scale, 10) : (scale ?? 100);
    if (isNaN(parsed) || parsed < 50 || parsed > 100) {
      throw new BadRequestException('Scale must be between 50 and 100');
    }
    return parsed;
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
      archive.append(result.buffer, { name: result.filename });
    }

    await archive.finalize();
  }
}
