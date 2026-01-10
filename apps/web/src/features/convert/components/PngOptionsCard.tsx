import { Label } from '@/components/ui/label';
import { NumberInput } from '@/components/ui/number-input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { PngColorDepth, PngColorspace, PngOutputOptions } from '../types';

interface PngOptionsCardProps {
  value: PngOutputOptions;
  onChange: (value: PngOutputOptions) => void;
  maxSize?: number; // Maximum size based on source image dimensions
}

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

export function PngOptionsCard({ value, onChange, maxSize }: PngOptionsCardProps) {
  const handleSizeChange = (size: number | undefined) => {
    if (size !== undefined) {
      onChange({ ...value, size });
    }
  };

  const handleDpiChange = (dpi: number | undefined) => {
    if (dpi !== undefined) {
      onChange({ ...value, dpi });
    }
  };

  const handleColorspaceChange = (colorspace: string) => {
    onChange({ ...value, colorspace: colorspace as PngColorspace });
  };

  const handleColorDepthChange = (colorDepth: string) => {
    onChange({ ...value, colorDepth: parseInt(colorDepth, 10) as PngColorDepth });
  };

  // Limit max size to source image dimensions if PNG input
  const effectiveMaxSize = maxSize ? Math.min(maxSize, 2048) : 2048;

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-card/50 p-4">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
          <svg
            className="h-4 w-4 text-primary"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="M21 15l-5-5L5 21" />
          </svg>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">PNG Export Options</h3>
          <p className="text-xs text-muted-foreground">Configure your PNG output</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Size */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="png-size" className="text-xs font-medium text-muted-foreground">
            Size (px)
          </Label>
          <NumberInput
            id="png-size"
            value={value.size}
            onValueChange={handleSizeChange}
            min={16}
            max={effectiveMaxSize}
            stepper={16}
            placeholder="512"
          />
          {maxSize && maxSize < 2048 && (
            <span className="text-xs text-muted-foreground">Max: {maxSize}px (source)</span>
          )}
        </div>

        {/* DPI - Custom input */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="png-dpi" className="text-xs font-medium text-muted-foreground">
            Resolution (DPI)
          </Label>
          <NumberInput
            id="png-dpi"
            value={value.dpi}
            onValueChange={handleDpiChange}
            min={1}
            max={600}
            stepper={1}
            placeholder="72"
          />
          <span className="text-xs text-muted-foreground">Common: 72 (web), 96 (Windows), 300 (print)</span>
        </div>

        {/* Colorspace */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="png-colorspace" className="text-xs font-medium text-muted-foreground">
            Color Space
          </Label>
          <Select value={value.colorspace} onValueChange={handleColorspaceChange}>
            <SelectTrigger id="png-colorspace" className="w-full">
              <SelectValue placeholder="Select colorspace" />
            </SelectTrigger>
            <SelectContent>
              {COLORSPACE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <span className="flex items-center gap-2">
                    <span>{option.label}</span>
                    <span className="text-xs text-muted-foreground">({option.description})</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Color Depth */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="png-colordepth" className="text-xs font-medium text-muted-foreground">
            Color Depth
          </Label>
          <Select value={value.colorDepth.toString()} onValueChange={handleColorDepthChange}>
            <SelectTrigger id="png-colordepth" className="w-full">
              <SelectValue placeholder="Select color depth" />
            </SelectTrigger>
            <SelectContent>
              {COLOR_DEPTH_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value.toString()}>
                  <span className="flex items-center gap-2">
                    <span>{option.label}</span>
                    <span className="text-xs text-muted-foreground">({option.description})</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Preview info */}
      <div
        className={cn(
          'flex items-center gap-2 rounded-lg px-3 py-2 text-xs',
          'border border-primary/20 bg-primary/5 text-muted-foreground',
        )}
      >
        <svg
          className="h-3.5 w-3.5 shrink-0 text-primary"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4M12 8h.01" />
        </svg>
        <span>
          Output: <strong className="text-foreground">{value.size}x{value.size}px</strong> at{' '}
          <strong className="text-foreground">{value.dpi} DPI</strong>,{' '}
          <strong className="text-foreground">
            {COLOR_DEPTH_OPTIONS.find((c) => c.value === value.colorDepth)?.label}
          </strong>{' '}
          in{' '}
          <strong className="text-foreground">
            {COLORSPACE_OPTIONS.find((c) => c.value === value.colorspace)?.label}
          </strong>
        </span>
      </div>
    </div>
  );
}
