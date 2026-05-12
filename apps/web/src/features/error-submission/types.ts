export type SvgErrorType =
  | 'invalid_format'
  | 'security_pre_sanitize'
  | 'security_post_sanitize'
  | 'sanitization_failed'
  | 'external_resource_invalid';

export interface PatternMatchLocation {
  description: string;
  line: number;
  column: number;
  startOffset: number;
  endOffset: number;
  snippet: string;
}

export interface SvgConversionErrorInfo {
  message: string;
  errorType: SvgErrorType;
  classification?: string;
  matchedPatterns?: string[];
  patternLocations?: PatternMatchLocation[];
  canSubmit: boolean;
}

export interface SvgErrorDialogData extends SvgConversionErrorInfo {
  svgContent: string;
  originalFilename: string;
  fileSizeBytes: number;
}
