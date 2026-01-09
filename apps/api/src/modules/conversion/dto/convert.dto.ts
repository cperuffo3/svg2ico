import { ApiProperty } from '@nestjs/swagger';

export type OutputFormat = 'ico' | 'icns' | 'both';

export class ConvertOptionsDto {
  @ApiProperty({
    description: 'Output format for the conversion',
    enum: ['ico', 'icns', 'both'],
    default: 'ico',
    example: 'ico',
  })
  format: OutputFormat = 'ico';

  @ApiProperty({
    description: 'Scale/padding factor (50-100%)',
    minimum: 50,
    maximum: 100,
    default: 100,
    example: 100,
  })
  scale: number = 100;
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
