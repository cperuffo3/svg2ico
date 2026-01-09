export type OutputFormat = 'ico' | 'icns' | 'favicon' | 'all';

export type ConversionStep = {
  id: string;
  label: string;
  status: 'pending' | 'in_progress' | 'completed' | 'error';
};

export type ConversionState = 'idle' | 'converting' | 'completed' | 'error';

export type RoundnessValue = 0 | 12.5 | 25 | 37.5 | 50;

export type BackgroundRemovalMode = 'none' | 'color' | 'smart';

export interface BackgroundRemovalOption {
  mode: BackgroundRemovalMode;
  color?: string; // Only used when mode is 'color'
}

export interface ConversionOptions {
  scale: number;
  backgroundRemoval: BackgroundRemovalOption;
  cornerRadius: RoundnessValue;
  outputFormat: OutputFormat;
}

export interface UploadedFile {
  file: File;
  name: string;
  size: number;
  dataUrl: string;
}
