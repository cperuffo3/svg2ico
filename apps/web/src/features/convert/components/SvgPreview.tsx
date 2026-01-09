import { RoundnessSelector } from '@/components/ui/roundness-selector';
import { ToggleSwitch } from '@/components/ui/toggle-switch';
import { faTrash } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useCallback, useMemo, useState } from 'react';
import type { BackgroundRemovalOption, RoundnessValue } from '../types';
import { processBackgroundRemoval } from '../utils/removeBackground';
import { BackgroundRemovalSelector } from './BackgroundRemovalSelector';
import { IconPreviewToolbar } from './IconPreviewToolbar';
import { previewBackgrounds, type PreviewContext, type PreviewTheme } from './previewBackgrounds';

const MIN_SCALE = 50;
const MAX_SCALE = 200;
const NOTCH_VALUE = 100;
const SNAP_THRESHOLD = 3;

interface ScaleSliderProps {
  scale: number;
  onScaleChange: (scale: number) => void;
}

function ScaleSlider({ scale, onScaleChange }: ScaleSliderProps) {
  // Calculate the position of the 100% notch
  // Account for thumb width (~16px) - the track doesn't extend to full edges
  const thumbHalfWidth = 8; // pixels
  const trackRatio = (NOTCH_VALUE - MIN_SCALE) / (MAX_SCALE - MIN_SCALE);
  // CSS calc: interpolate between thumbHalfWidth and (100% - thumbHalfWidth)
  const notchLeft = `calc(${thumbHalfWidth}px + ${trackRatio * 100}% - ${trackRatio * thumbHalfWidth * 2}px)`;

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      let value = Number(e.target.value);
      // Snap to 100% when close
      if (Math.abs(value - NOTCH_VALUE) <= SNAP_THRESHOLD) {
        value = NOTCH_VALUE;
      }
      onScaleChange(value);
    },
    [onScaleChange],
  );

  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">Scale & Padding</span>
        <span className="text-sm font-semibold text-primary">{scale}%</span>
      </div>
      <div className="relative">
        <input
          type="range"
          min={MIN_SCALE}
          max={MAX_SCALE}
          value={scale}
          onChange={handleChange}
          className="h-5 w-full cursor-pointer accent-primary"
        />
        {/* Notch indicator at 100% */}
        <div
          className="pointer-events-none absolute top-1/2 h-3 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-muted-foreground/50"
          style={{ left: notchLeft }}
        />
      </div>
      <div className="relative flex justify-between pt-0.5">
        <span className="text-xs text-muted-foreground">50%</span>
        <span
          className="absolute text-xs text-muted-foreground"
          style={{ left: notchLeft, transform: 'translateX(-50%)' }}
        >
          100%
        </span>
        <span className="text-xs text-muted-foreground">200%</span>
      </div>
    </div>
  );
}

interface SvgPreviewProps {
  fileName: string;
  fileSize: string;
  svgDataUrl: string; // Can be SVG or PNG data URL
  scale: number;
  cornerRadius: RoundnessValue;
  backgroundRemoval: BackgroundRemovalOption;
  onScaleChange: (scale: number) => void;
  onCornerRadiusChange: (cornerRadius: RoundnessValue) => void;
  onBackgroundRemovalChange: (backgroundRemoval: BackgroundRemovalOption) => void;
  onRemove: () => void;
}

export function SvgPreview({
  fileName,
  fileSize,
  svgDataUrl,
  scale,
  cornerRadius,
  backgroundRemoval,
  onScaleChange,
  onCornerRadiusChange,
  onBackgroundRemovalChange,
  onRemove,
}: SvgPreviewProps) {
  // Calculate border radius in pixels based on percentage of canvas height (160px)
  const canvasSize = 160; // h-40 = 10rem = 160px
  const borderRadiusPx = (cornerRadius / 100) * canvasSize;
  const [showAppColors, setShowAppColors] = useState(false);
  const [previewContext, setPreviewContext] = useState<PreviewContext>('chrome');
  const [previewTheme, setPreviewTheme] = useState<PreviewTheme>('light');

  const appBackgroundColor = previewBackgrounds[previewContext][previewTheme];

  // Check if this is a PNG file (background removal not supported for PNG preview)
  const isPng = svgDataUrl.startsWith('data:image/png');

  // Process SVG with background removal (only for SVG files)
  const processedSvgDataUrl = useMemo(() => {
    // PNG files don't support client-side background removal preview
    if (isPng) {
      return svgDataUrl;
    }

    if (backgroundRemoval.mode === 'none') {
      return svgDataUrl;
    }

    try {
      // Decode the data URL to get the SVG string
      const base64Match = svgDataUrl.match(/^data:image\/svg\+xml;base64,(.+)$/);
      if (base64Match) {
        const svgString = atob(base64Match[1]);
        const result = processBackgroundRemoval(
          svgString,
          backgroundRemoval.mode,
          backgroundRemoval.color,
        );
        // Re-encode as data URL
        return `data:image/svg+xml;base64,${btoa(result.svg)}`;
      }

      // Handle URL-encoded SVG
      const urlMatch = svgDataUrl.match(/^data:image\/svg\+xml,(.+)$/);
      if (urlMatch) {
        const svgString = decodeURIComponent(urlMatch[1]);
        const result = processBackgroundRemoval(
          svgString,
          backgroundRemoval.mode,
          backgroundRemoval.color,
        );
        return `data:image/svg+xml,${encodeURIComponent(result.svg)}`;
      }

      return svgDataUrl;
    } catch (error) {
      console.error('Error processing SVG for background removal:', error);
      return svgDataUrl;
    }
  }, [svgDataUrl, backgroundRemoval.mode, backgroundRemoval.color, isPng]);

  return (
    <div className="flex flex-col gap-4">
      {/* File info card - spans full width */}
      <div className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/30 px-3 py-2">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-semibold text-foreground">{fileName}</span>
          <span className="text-xs text-muted-foreground">{fileSize}</span>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="flex cursor-pointer items-center gap-1 text-xs font-medium text-destructive transition-colors hover:text-destructive/80"
        >
          <FontAwesomeIcon icon={faTrash} className="h-3 w-3" />
          <span>Remove</span>
        </button>
      </div>

      <div className="flex gap-6">
        {/* Preview container - shows SVG within icon canvas bounds */}
        <div className="w-56 shrink-0 flex flex-col justify-center">
          <div
            className="flex h-48 items-center justify-center overflow-hidden rounded-lg border border-border p-4 transition-colors duration-200"
            style={
              showAppColors
                ? { backgroundColor: appBackgroundColor }
                : {
                    backgroundImage: 'linear-gradient(to left, var(--color-muted), transparent)',
                  }
            }
          >
            {/* Icon canvas - fixed size representing the output icon */}
            <div
              className="relative flex h-40 w-40 items-center justify-center overflow-hidden transition-[border-radius] duration-200"
              style={{
                borderRadius: `${borderRadiusPx}px`,
                ...(showAppColors
                  ? {}
                  : {
                      backgroundImage:
                        'repeating-conic-gradient(var(--transparency-grid-color) 0% 25%, transparent 0% 50%)',
                      backgroundSize: '16px 16px',
                    }),
              }}
            >
              {/* SVG scaled within the canvas - at 100% it renders at its natural size */}
              <img
                src={processedSvgDataUrl}
                alt="SVG Preview"
                className="h-full w-full object-contain"
                style={{ transform: `scale(${scale / 100})` }}
              />
            </div>
          </div>
          {/* Background mode toggle */}
          <div className="flex flex-col gap-2 pt-3">
            <ToggleSwitch
              value={showAppColors}
              onChange={setShowAppColors}
              labelFalse="Transparency"
              labelTrue="App Colors"
            />
            {/* Icon preview toolbar - only show when app colors mode is active */}
            {showAppColors && (
              <IconPreviewToolbar
                selectedContext={previewContext}
                selectedTheme={previewTheme}
                onContextChange={setPreviewContext}
                onThemeChange={setPreviewTheme}
              />
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-1 flex-col justify-center">
          <div className="flex flex-col gap-4">
            {/* Scale slider */}
            <ScaleSlider scale={scale} onScaleChange={onScaleChange} />

            {/* Round corners selector */}
            <RoundnessSelector value={cornerRadius} onChange={onCornerRadiusChange} />

            {/* Background removal selector */}
            <BackgroundRemovalSelector
              value={backgroundRemoval}
              onChange={onBackgroundRemovalChange}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
