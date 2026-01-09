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

// PNG background removal state (AI-powered, runs in browser)
export type PngBackgroundRemovalState =
  | 'idle'
  | 'loading-model'
  | 'processing'
  | 'completed'
  | 'error';

export interface PngBackgroundRemovalProgress {
  state: PngBackgroundRemovalState;
  progress?: number; // 0-100
  error?: string;
}

export interface ConversionOptions {
  scale: number;
  backgroundRemoval: BackgroundRemovalOption;
  cornerRadius: RoundnessValue;
  outputFormat: OutputFormat;
}

export type SourceFileType = 'svg' | 'png';

export interface ImageDimensions {
  width: number;
  height: number;
}

export interface UploadedFile {
  file: File;
  name: string;
  size: number;
  dataUrl: string;
  type: SourceFileType;
  dimensions?: ImageDimensions; // Only set for PNG files
}

// Icon sizes used in output formats
export const ICO_SIZES = [16, 32, 48, 64, 128, 256] as const;
export const ICNS_SIZES = [16, 32, 64, 128, 256, 512, 1024] as const;
export const FAVICON_SIZES = [16, 32, 48] as const;

/**
 * Get the available output sizes based on source PNG dimensions.
 * We never upscale PNG images, so we filter to sizes <= source size.
 */
export function getAvailableSizes(
  sourceDimensions: ImageDimensions | undefined,
  targetSizes: readonly number[],
): number[] {
  if (!sourceDimensions) {
    // SVG files can generate any size
    return [...targetSizes];
  }
  const maxSourceSize = Math.min(sourceDimensions.width, sourceDimensions.height);
  return targetSizes.filter((size) => size <= maxSourceSize);
}

/**
 * Check if source PNG is large enough for a format.
 * Returns info about which sizes will be included.
 */
export function getSizeAvailabilityInfo(
  sourceDimensions: ImageDimensions | undefined,
  format: OutputFormat,
): { availableSizes: number[]; allSizes: readonly number[]; isLimited: boolean } {
  if (!sourceDimensions) {
    // SVG can generate all sizes
    const allSizes = format === 'favicon' ? FAVICON_SIZES : format === 'ico' ? ICO_SIZES : ICNS_SIZES;
    return { availableSizes: [...allSizes], allSizes, isLimited: false };
  }

  let allSizes: readonly number[];
  switch (format) {
    case 'favicon':
      allSizes = FAVICON_SIZES;
      break;
    case 'ico':
      allSizes = ICO_SIZES;
      break;
    case 'icns':
    case 'all':
      allSizes = ICNS_SIZES;
      break;
    default:
      allSizes = ICO_SIZES;
  }

  const availableSizes = getAvailableSizes(sourceDimensions, allSizes);
  return {
    availableSizes,
    allSizes,
    isLimited: availableSizes.length < allSizes.length,
  };
}
