import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Resvg } from '@resvg/resvg-js';
import png2icons from 'png2icons';
import sharp from 'sharp';
import { encode as encodeIco } from 'sharp-ico';
import type { BackgroundRemovalMode, OutputFormat, RoundnessValue } from './dto/convert.dto.js';
import { processSvg } from './svg-processor.js';

// ICO sizes: standard Windows icon sizes
const ICO_SIZES = [16, 32, 48, 256];

// Note: png2icons handles all macOS icon sizes internally from a single 1024px PNG

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

@Injectable()
export class ConversionService {
  private readonly logger = new Logger(ConversionService.name);

  async convert(
    svgBuffer: Buffer,
    originalFilename: string,
    format: OutputFormat,
    options: ConversionOptions,
  ): Promise<ConversionResult | ConversionResult[]> {
    // Validate SVG
    const svgString = svgBuffer.toString('utf-8');
    if (!this.isValidSvg(svgString)) {
      throw new BadRequestException('Invalid SVG file');
    }

    // Process SVG with background removal (corner radius applied at PNG level)
    const processedSvg = processSvg(svgString, {
      backgroundRemovalMode: options.backgroundRemovalMode,
      backgroundRemovalColor: options.backgroundRemovalColor,
      cornerRadius: 0, // Skip SVG-level corner radius, apply at PNG level
    });
    const processedBuffer = Buffer.from(processedSvg, 'utf-8');

    const baseName = originalFilename.replace(/\.svg$/i, '');

    if (format === 'png') {
      return this.convertToPng(processedBuffer, baseName, options);
    } else if (format === 'ico') {
      return this.convertToIco(processedBuffer, baseName, options.scale, options.cornerRadius);
    } else if (format === 'icns') {
      return this.convertToIcns(processedBuffer, baseName, options.scale, options.cornerRadius);
    } else {
      // Both formats
      const [ico, icns] = await Promise.all([
        this.convertToIco(processedBuffer, baseName, options.scale, options.cornerRadius),
        this.convertToIcns(processedBuffer, baseName, options.scale, options.cornerRadius),
      ]);
      return [ico, icns];
    }
  }

  private isValidSvg(content: string): boolean {
    const trimmed = content.trim();
    return trimmed.startsWith('<svg') || trimmed.startsWith('<?xml') || trimmed.includes('<svg');
  }

  private async convertToIco(
    svgBuffer: Buffer,
    baseName: string,
    scale: number,
    cornerRadius: RoundnessValue,
  ): Promise<ConversionResult> {
    const pngBuffers = await this.renderSvgToPngs(svgBuffer, ICO_SIZES, scale, cornerRadius);

    // Use encode function for in-memory ICO creation
    const icoBuffer = encodeIco(pngBuffers);

    return {
      buffer: icoBuffer,
      filename: `${baseName}.ico`,
      mimeType: 'image/x-icon',
    };
  }

  private async convertToIcns(
    svgBuffer: Buffer,
    baseName: string,
    scale: number,
    cornerRadius: RoundnessValue,
  ): Promise<ConversionResult> {
    // png2icons needs a single large PNG and generates all sizes
    const [largestPng] = await this.renderSvgToPngs(svgBuffer, [1024], scale, cornerRadius);

    const icnsBuffer = png2icons.createICNS(
      largestPng,
      png2icons.BICUBIC,
      0, // No PNG compression artifacts
    );

    if (!icnsBuffer) {
      throw new BadRequestException('Failed to create ICNS file');
    }

    return {
      buffer: Buffer.from(icnsBuffer),
      filename: `${baseName}.icns`,
      mimeType: 'image/icns',
    };
  }

  private async convertToPng(
    svgBuffer: Buffer,
    baseName: string,
    options: ConversionOptions,
  ): Promise<ConversionResult> {
    const [pngBuffer] = await this.renderSvgToPngs(
      svgBuffer,
      [options.outputSize],
      options.scale,
      options.cornerRadius,
    );

    return {
      buffer: pngBuffer,
      filename: `${baseName}.png`,
      mimeType: 'image/png',
    };
  }

  /**
   * Get the intrinsic dimensions of an SVG
   */
  private getSvgDimensions(svgString: string): { width: number; height: number } {
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

  private async renderSvgToPngs(
    svgBuffer: Buffer,
    sizes: number[],
    scale: number,
    cornerRadius: RoundnessValue,
  ): Promise<Buffer[]> {
    const svgString = svgBuffer.toString('utf-8');

    // Get SVG dimensions to handle rectangular SVGs
    const svgDimensions = this.getSvgDimensions(svgString);
    const largestDimension = Math.max(svgDimensions.width, svgDimensions.height);
    const aspectRatio = {
      width: svgDimensions.width / largestDimension,
      height: svgDimensions.height / largestDimension,
    };

    this.logger.debug(
      `SVG dimensions: ${svgDimensions.width}x${svgDimensions.height}, aspect ratio: ${aspectRatio.width}x${aspectRatio.height}`,
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

            this.logger.debug(
              `Rendering size ${size} at scale ${scale}%: iconSize=${iconSize}, renderWidth=${renderWidth}, renderHeight=${renderHeight}`,
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

            this.logger.debug(
              `Padding: top=${paddingTop}, bottom=${paddingBottom}, left=${paddingLeft}, right=${paddingRight}`,
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
            // We need the icon to appear at scaleFactor size, then crop to get the center 'size' pixels
            const renderSize = Math.round(size * scaleFactor);

            this.logger.debug(
              `Rendering size ${size} at scale ${scale}% (>100%): renderSize=${renderSize}`,
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

            this.logger.debug(
              `Actual rendered dimensions: ${actualWidth}x${actualHeight}`,
            );

            // Calculate the square canvas size (should be the larger dimension)
            const canvasSize = Math.max(actualWidth, actualHeight);

            // Calculate extension to center the image in a square canvas
            const extendLeft = Math.round((canvasSize - actualWidth) / 2);
            const extendRight = canvasSize - actualWidth - extendLeft;
            const extendTop = Math.round((canvasSize - actualHeight) / 2);
            const extendBottom = canvasSize - actualHeight - extendTop;

            this.logger.debug(
              `Canvas size: ${canvasSize}, Extend: top=${extendTop}, bottom=${extendBottom}, left=${extendLeft}, right=${extendRight}`,
            );

            // Extract the center 'size' pixels from the square canvas
            const offset = Math.round((canvasSize - size) / 2);

            this.logger.debug(
              `Extract offset=${offset}, target size=${size}`,
            );

            // Ensure we don't extract outside bounds
            const safeOffset = Math.max(0, offset);
            const maxExtractSize = canvasSize - safeOffset;
            const extractSize = Math.min(size, maxExtractSize);

            this.logger.debug(
              `Safe extract: offset=${safeOffset}, extractSize=${extractSize}`,
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

          // Apply corner radius mask if specified
          if (cornerRadius > 0) {
            const maskBuffer = createRoundedMask(size, cornerRadius);
            pngBuffer = await sharp(pngBuffer)
              .composite([
                {
                  input: maskBuffer,
                  blend: 'dest-in', // Use mask alpha to clip the image
                },
              ])
              .png()
              .toBuffer();
          }

          return pngBuffer;
        } catch (error) {
          this.logger.error(
            `Error rendering PNG at size ${size} with scale ${scale}%: ${error instanceof Error ? error.message : error}`,
          );
          this.logger.error(`SVG dimensions: ${JSON.stringify(svgDimensions)}`);
          this.logger.error(`Aspect ratio: ${JSON.stringify(aspectRatio)}`);
          throw error;
        }
      }),
    );
  }
}
