import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { NumberInput } from '@/components/ui/number-input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { faPlus, faTriangleExclamation, faXmark } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { KeyboardEvent } from 'react';
import type { PngColorDepth, PngColorspace, PngOutputOptions, PngSourceMetadata } from '../types';

const COLORSPACE_OPTIONS = [
  { value: 'srgb', label: 'sRGB', description: 'Standard' },
  { value: 'p3', label: 'Display P3', description: 'Wide gamut' },
  { value: 'cmyk', label: 'CMYK', description: 'Print' },
] as const;

const COLOR_DEPTH_OPTIONS = [
  { value: 8, label: '8-bit', description: '256 colors' },
  { value: 24, label: '24-bit', description: 'Truecolor' },
  { value: 32, label: '32-bit', description: 'Truecolor + Alpha' },
] as const;

// Common icon sizes offered as one-click presets: favicon (16/32/48),
// general (64/128/256), apple-touch (180), android/PWA (192/512) and 1024.
const SIZE_PRESETS = [16, 32, 48, 64, 128, 180, 192, 256, 512, 1024] as const;

// Hard cap to keep ZIPs reasonable and match the backend limit.
const MAX_SIZES = 25;

interface PngOptionsPanelProps {
  value: PngOutputOptions;
  onChange: (value: PngOutputOptions) => void;
  maxSize?: number;
  sourceMetadata?: PngSourceMetadata; // Constraints from source PNG
}

export function PngOptionsPanel({
  value,
  onChange,
  maxSize,
  sourceMetadata,
}: PngOptionsPanelProps) {
  // Calculate max DPI based on source PNG metadata
  // If source has DPI metadata, we can't output higher DPI than source
  const maxDpi = sourceMetadata?.dpi ?? 600;

  // Filter color depth options based on source PNG
  // Can't output higher color depth than source has
  const availableColorDepths = COLOR_DEPTH_OPTIONS.filter((option) => {
    if (!sourceMetadata) return true; // No restrictions for SVG
    return option.value <= sourceMetadata.colorDepth;
  });

  const effectiveMaxSize = maxSize ? Math.min(maxSize, 2048) : 2048;
  const effectiveMaxDpi = Math.min(maxDpi, 600);

  const sizes = value.sizes;
  const isMultiSize = sizes.length > 0;

  const handleSizeChange = (size: number | undefined) => {
    if (size !== undefined) {
      onChange({ ...value, size });
    }
  };

  const addSize = (size: number | undefined) => {
    if (size === undefined) return;
    const clamped = Math.max(16, Math.min(Math.round(size), effectiveMaxSize));
    if (sizes.includes(clamped) || sizes.length >= MAX_SIZES) return;
    onChange({ ...value, sizes: [...sizes, clamped].sort((a, b) => a - b) });
  };

  const handleAddCurrent = () => addSize(value.size);

  const handleRemoveSize = (size: number) => {
    onChange({ ...value, sizes: sizes.filter((s) => s !== size) });
  };

  const handleSizeKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddCurrent();
    }
  };

  const handleDpiChange = (dpi: number | undefined) => {
    if (dpi !== undefined) {
      // Clamp DPI to max allowed
      const clampedDpi = Math.min(dpi, maxDpi);
      onChange({ ...value, dpi: clampedDpi });
    }
  };

  const handleColorspaceChange = (colorspace: string) => {
    onChange({ ...value, colorspace: colorspace as PngColorspace });
  };

  const handleColorDepthChange = (colorDepth: string) => {
    onChange({ ...value, colorDepth: parseInt(colorDepth, 10) as PngColorDepth });
  };

  const availablePresets = SIZE_PRESETS.filter(
    (preset) => preset <= effectiveMaxSize && !sizes.includes(preset),
  );

  const addDisabled = sizes.length >= MAX_SIZES || sizes.includes(value.size);

  return (
    <div className="flex w-52 shrink-0 flex-col gap-4">
      {/* Header */}
      <div className="text-sm font-semibold text-foreground">PNG Options</div>

      {/* Size */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="png-size" className="text-xs font-medium text-muted-foreground">
          Size (px)
        </Label>
        <div className="flex items-start gap-1.5">
          <div className="flex-1">
            <NumberInput
              id="png-size"
              value={value.size}
              onValueChange={handleSizeChange}
              onKeyDown={handleSizeKeyDown}
              min={16}
              max={effectiveMaxSize}
              stepper={16}
              placeholder="512"
            />
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="h-9 shrink-0"
            onClick={handleAddCurrent}
            disabled={addDisabled}
            title={
              sizes.includes(value.size)
                ? 'Size already added'
                : sizes.length >= MAX_SIZES
                  ? `Maximum of ${MAX_SIZES} sizes`
                  : 'Add this size to the list'
            }
          >
            <FontAwesomeIcon icon={faPlus} className="h-3 w-3" />
            Add
          </Button>
        </div>
        {maxSize && maxSize < 2048 && (
          <span className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400">
            <FontAwesomeIcon icon={faTriangleExclamation} className="h-2.5 w-2.5" />
            Max: {maxSize}px (source size)
          </span>
        )}
        <span className="text-[10px] text-muted-foreground">
          {isMultiSize
            ? 'Exports a ZIP containing every size below.'
            : 'Add sizes for a multi-size ZIP, or convert just this size.'}
        </span>
      </div>

      {/* Selected sizes list */}
      {isMultiSize && (
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-medium text-muted-foreground">
            {sizes.length} size{sizes.length > 1 ? 's' : ''} · ZIP
          </span>
          <div className="flex flex-wrap gap-1">
            {sizes.map((size) => (
              <span
                key={size}
                className="flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary"
              >
                {size}px
                <button
                  type="button"
                  onClick={() => handleRemoveSize(size)}
                  aria-label={`Remove ${size}px`}
                  className="cursor-pointer text-primary/60 transition-colors hover:text-primary"
                >
                  <FontAwesomeIcon icon={faXmark} className="h-2.5 w-2.5" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Quick-add presets */}
      {availablePresets.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-medium text-muted-foreground">Quick add</span>
          <div className="flex flex-wrap gap-1">
            {availablePresets.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => addSize(preset)}
                className="cursor-pointer rounded-md border border-border bg-card px-2 py-0.5 text-[11px] text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
              >
                {preset}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* DPI */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="png-dpi" className="text-xs font-medium text-muted-foreground">
          Resolution (DPI)
        </Label>
        <NumberInput
          id="png-dpi"
          value={value.dpi}
          onValueChange={handleDpiChange}
          min={1}
          max={effectiveMaxDpi}
          stepper={1}
          placeholder="72"
        />
        {sourceMetadata?.dpi ? (
          <span className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400">
            <FontAwesomeIcon icon={faTriangleExclamation} className="h-2.5 w-2.5" />
            Max: {effectiveMaxDpi} DPI (source)
          </span>
        ) : (
          <span className="text-[10px] text-muted-foreground">72 web · 96 Win · 300 print</span>
        )}
      </div>

      {/* Colorspace */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="png-colorspace" className="text-xs font-medium text-muted-foreground">
          Color Space
        </Label>
        <Select value={value.colorspace} onValueChange={handleColorspaceChange}>
          <SelectTrigger id="png-colorspace" className="w-full">
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            {COLORSPACE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Color Depth */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="png-colordepth" className="text-xs font-medium text-muted-foreground">
          Color Depth
        </Label>
        <Select value={value.colorDepth.toString()} onValueChange={handleColorDepthChange}>
          <SelectTrigger id="png-colordepth" className="w-full">
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            {availableColorDepths.map((option) => (
              <SelectItem key={option.value} value={option.value.toString()}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {sourceMetadata && availableColorDepths.length < COLOR_DEPTH_OPTIONS.length && (
          <span className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400">
            <FontAwesomeIcon icon={faTriangleExclamation} className="h-2.5 w-2.5" />
            Max: {sourceMetadata.colorDepth}-bit (source)
          </span>
        )}
      </div>

      {/* Output summary */}
      <div className="rounded-lg bg-muted/50 px-3 py-2 text-[11px] text-muted-foreground">
        <div className="font-medium text-foreground">
          {isMultiSize ? `${sizes.length} PNGs · ZIP` : `${value.size}x${value.size}px`}
        </div>
        {isMultiSize && <div>{sizes.map((s) => `${s}px`).join(', ')}</div>}
        <div>
          {value.dpi} DPI · {COLOR_DEPTH_OPTIONS.find((c) => c.value === value.colorDepth)?.label} ·{' '}
          {COLORSPACE_OPTIONS.find((c) => c.value === value.colorspace)?.label}
        </div>
      </div>
    </div>
  );
}
