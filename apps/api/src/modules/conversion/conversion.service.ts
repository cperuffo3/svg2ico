import { BadRequestException, Injectable } from '@nestjs/common';
import { Resvg } from '@resvg/resvg-js';
import png2icons from 'png2icons';
import sharp from 'sharp';
import { encode as encodeIco } from 'sharp-ico';
import type { OutputFormat } from './dto/convert.dto.js';

// ICO sizes: standard Windows icon sizes
const ICO_SIZES = [16, 32, 48, 256];

// Note: png2icons handles all macOS icon sizes internally from a single 1024px PNG

export interface ConversionResult {
  buffer: Buffer;
  filename: string;
  mimeType: string;
}

@Injectable()
export class ConversionService {
  async convert(
    svgBuffer: Buffer,
    originalFilename: string,
    format: OutputFormat,
    scale: number,
  ): Promise<ConversionResult | ConversionResult[]> {
    // Validate SVG
    const svgString = svgBuffer.toString('utf-8');
    if (!this.isValidSvg(svgString)) {
      throw new BadRequestException('Invalid SVG file');
    }

    const baseName = originalFilename.replace(/\.svg$/i, '');

    if (format === 'ico') {
      return this.convertToIco(svgBuffer, baseName, scale);
    } else if (format === 'icns') {
      return this.convertToIcns(svgBuffer, baseName, scale);
    } else {
      // Both formats
      const [ico, icns] = await Promise.all([
        this.convertToIco(svgBuffer, baseName, scale),
        this.convertToIcns(svgBuffer, baseName, scale),
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
  ): Promise<ConversionResult> {
    const pngBuffers = await this.renderSvgToPngs(svgBuffer, ICO_SIZES, scale);

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
  ): Promise<ConversionResult> {
    // png2icons needs a single large PNG and generates all sizes
    const [largestPng] = await this.renderSvgToPngs(svgBuffer, [1024], scale);

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

  private async renderSvgToPngs(
    svgBuffer: Buffer,
    sizes: number[],
    scale: number,
  ): Promise<Buffer[]> {
    const svgString = svgBuffer.toString('utf-8');

    return Promise.all(
      sizes.map(async (size) => {
        // Apply scale factor (scale is 50-100, representing padding)
        // At 100%, icon fills the entire space
        // At 50%, icon is half size with padding around it
        const scaleFactor = scale / 100;
        const iconSize = Math.round(size * scaleFactor);
        const padding = Math.round((size - iconSize) / 2);

        // Render SVG to PNG at the icon size
        const resvg = new Resvg(svgString, {
          fitTo: {
            mode: 'width',
            value: iconSize,
          },
          background: 'rgba(0, 0, 0, 0)', // Transparent background
        });

        const rendered = resvg.render();
        const pngData = rendered.asPng();

        // If scale is 100%, no padding needed
        if (scale === 100) {
          return Buffer.from(pngData);
        }

        // Add padding using sharp to center the icon
        const paddedPng = await sharp(Buffer.from(pngData))
          .extend({
            top: padding,
            bottom: padding,
            left: padding,
            right: padding,
            background: { r: 0, g: 0, b: 0, alpha: 0 },
          })
          .resize(size, size) // Ensure exact size after padding
          .png()
          .toBuffer();

        return paddedPng;
      }),
    );
  }
}
