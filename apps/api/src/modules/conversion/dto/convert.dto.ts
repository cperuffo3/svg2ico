import { ApiProperty } from '@nestjs/swagger';

export type OutputFormat = 'ico' | 'icns' | 'both' | 'png' | 'favicon';
export type BackgroundRemovalMode = 'none' | 'color' | 'smart';
export type RoundnessValue = 0 | 12.5 | 25 | 37.5 | 50;
export type SourceFileType = 'svg' | 'png';

export class ConvertOptionsDto {
  @ApiProperty({
    description: 'Output format for the conversion',
    enum: ['ico', 'icns', 'both', 'png', 'favicon'],
    default: 'ico',
    example: 'ico',
  })
  format: OutputFormat = 'ico';

  @ApiProperty({
    description: 'Scale/padding factor (50-200%)',
    minimum: 50,
    maximum: 200,
    default: 100,
    example: 100,
  })
  scale: number = 100;

  @ApiProperty({
    description: 'Corner radius as percentage of icon size (0, 12.5, 25, 37.5, or 50)',
    enum: [0, 12.5, 25, 37.5, 50],
    default: 0,
    example: 0,
  })
  cornerRadius: RoundnessValue = 0;

  @ApiProperty({
    description: 'Background removal mode',
    enum: ['none', 'color', 'smart'],
    default: 'none',
    example: 'none',
  })
  backgroundRemovalMode: BackgroundRemovalMode = 'none';

  @ApiProperty({
    description: 'Color to remove when backgroundRemovalMode is "color" (hex format)',
    required: false,
    example: '#ffffff',
  })
  backgroundRemovalColor?: string;

  @ApiProperty({
    description: 'Output size in pixels (only used for PNG format)',
    minimum: 16,
    maximum: 1024,
    default: 512,
    example: 512,
  })
  outputSize: number = 512;

  @ApiProperty({
    description: 'Source image width in pixels (only for PNG input)',
    required: false,
    example: 1024,
  })
  sourceWidth?: number;

  @ApiProperty({
    description: 'Source image height in pixels (only for PNG input)',
    required: false,
    example: 1024,
  })
  sourceHeight?: number;
}

export class ConversionResultDto {
  @ApiProperty({
    description: 'Whether the conversion was successful',
    example: true,
  })
  success!: boolean;

  @ApiProperty({
    description: 'Output filename',
    example: 'icon.ico',
  })
  filename!: string;

  @ApiProperty({
    description: 'MIME type of the output file',
    example: 'image/x-icon',
  })
  mimeType!: string;

  @ApiProperty({
    description: 'Processing time in milliseconds',
    example: 150,
  })
  processingTimeMs!: number;
}
