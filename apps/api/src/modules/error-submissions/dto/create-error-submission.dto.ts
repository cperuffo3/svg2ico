import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateErrorSubmissionDto {
  @ApiProperty({ description: 'Raw SVG file content (max 10MB)' })
  svgContent!: string;

  @ApiProperty()
  originalFilename!: string;

  @ApiProperty()
  errorMessage!: string;

  @ApiProperty({
    description: 'Backend error classifier - invalid_format, security_pre_sanitize, etc.',
  })
  errorType!: string;

  @ApiPropertyOptional()
  classification?: string;

  @ApiPropertyOptional({ type: [String] })
  matchedPatterns?: string[];

  @ApiPropertyOptional({ description: 'Pattern match locations from the backend response' })
  patternLocations?: Array<Record<string, unknown>>;

  @ApiPropertyOptional({ description: 'Optional free-form note from the user' })
  userNotes?: string;
}

export class ErrorSubmissionSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  originalFilename!: string;

  @ApiProperty()
  fileSizeBytes!: number;

  @ApiProperty()
  errorType!: string;

  @ApiPropertyOptional()
  classification?: string | null;

  @ApiProperty()
  errorMessage!: string;

  @ApiProperty()
  reviewed!: boolean;

  @ApiProperty()
  createdAt!: string;
}

export class ErrorSubmissionDetailDto extends ErrorSubmissionSummaryDto {
  @ApiProperty()
  svgContent!: string;

  @ApiPropertyOptional({ type: [String] })
  matchedPatterns?: string[] | null;

  @ApiPropertyOptional()
  patternLocations?: Array<Record<string, unknown>> | null;

  @ApiPropertyOptional()
  userNotes?: string | null;

  @ApiPropertyOptional()
  reviewerNotes?: string | null;

  @ApiPropertyOptional()
  reviewedAt?: string | null;
}

export class UpdateErrorSubmissionDto {
  @ApiPropertyOptional()
  reviewed?: boolean;

  @ApiPropertyOptional()
  reviewerNotes?: string | null;
}
