import { Label } from '@/components/ui/label';
import { NumberInput } from '@/components/ui/number-input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { PngColorDepth, PngColorspace, PngOutputOptions } from '../types';

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

interface PngOptionsPanelProps {
  value: PngOutputOptions;
  onChange: (value: PngOutputOptions) => void;
  maxSize?: number;
}

export function PngOptionsPanel({ value, onChange, maxSize }: PngOptionsPanelProps) {
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

  const effectiveMaxSize = maxSize ? Math.min(maxSize, 2048) : 2048;

  return (
    <div className="flex w-52 shrink-0 flex-col gap-4">
      {/* Header */}
      <div className="text-sm font-semibold text-foreground">PNG Options</div>

      {/* Size */}
      <div className="flex flex-col gap-1.5">
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
          <span className="text-[10px] text-muted-foreground">Max: {maxSize}px</span>
        )}
      </div>

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
          max={600}
          stepper={1}
          placeholder="72"
        />
        <span className="text-[10px] text-muted-foreground">72 web · 96 Win · 300 print</span>
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
            {COLOR_DEPTH_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value.toString()}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Output summary */}
      <div className="rounded-lg bg-muted/50 px-3 py-2 text-[11px] text-muted-foreground">
        <div className="font-medium text-foreground">
          {value.size}x{value.size}px
        </div>
        <div>
          {value.dpi} DPI · {COLOR_DEPTH_OPTIONS.find((c) => c.value === value.colorDepth)?.label} ·{' '}
          {COLORSPACE_OPTIONS.find((c) => c.value === value.colorspace)?.label}
        </div>
      </div>
    </div>
  );
}
