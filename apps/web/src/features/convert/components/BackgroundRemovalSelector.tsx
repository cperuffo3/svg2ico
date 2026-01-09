import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  ColorPicker,
  ColorPickerAlpha,
  ColorPickerEyeDropper,
  ColorPickerHue,
  ColorPickerSelection,
} from '@/components/ui/shadcn-io/color-picker';
import { cn } from '@/lib/utils';
import { faWandMagicSparkles } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { BackgroundRemovalMode, BackgroundRemovalOption } from '../types';

interface BackgroundRemovalSelectorProps {
  value: BackgroundRemovalOption;
  onChange: (value: BackgroundRemovalOption) => void;
  className?: string;
}

interface OptionButtonProps {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

function OptionButton({ selected, onClick, children }: OptionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded px-3 py-1.5 text-sm transition-colors',
        selected
          ? 'bg-primary/10 text-primary font-medium'
          : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {children}
    </button>
  );
}

function rgbaToHex(rgba: [number, number, number, number]): string {
  const [r, g, b] = rgba.map((v) => Math.round(v));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function isValidHex(hex: string): boolean {
  return /^#?([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(hex);
}

function normalizeHex(hex: string): string {
  let normalized = hex.startsWith('#') ? hex : `#${hex}`;
  // Expand shorthand (e.g., #fff -> #ffffff)
  if (normalized.length === 4) {
    normalized = `#${normalized[1]}${normalized[1]}${normalized[2]}${normalized[2]}${normalized[3]}${normalized[3]}`;
  }
  return normalized.toLowerCase();
}

const presetColors = ['#ffffff', '#000000'];

export function BackgroundRemovalSelector({
  value,
  onChange,
  className,
}: BackgroundRemovalSelectorProps) {
  const [customColor, setCustomColor] = useState(value.color || '#ffffff');
  const [hexInputValue, setHexInputValue] = useState(customColor);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  // Key to force ColorPicker re-render when color changes externally
  const [pickerKey, setPickerKey] = useState(0);

  // Use ref to store latest onChange to avoid stale closures in ColorPicker
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const handleModeChange = useCallback(
    (mode: BackgroundRemovalMode) => {
      if (mode === 'color') {
        onChangeRef.current({ mode, color: customColor });
      } else {
        onChangeRef.current({ mode });
      }
    },
    [customColor],
  );

  // Stable callback for ColorPicker - uses ref to always have latest onChange
  const handleColorPickerChange = useCallback((colorValue: unknown) => {
    // ColorPicker returns [r, g, b, a] where r,g,b are 0-255 and a is 0-1
    if (Array.isArray(colorValue) && colorValue.length >= 3) {
      const hex = rgbaToHex([colorValue[0], colorValue[1], colorValue[2], colorValue[3] ?? 1]);
      setCustomColor(hex);
      setHexInputValue(hex);
      onChangeRef.current({ mode: 'color', color: hex });
    }
  }, []);

  const handlePresetColorClick = useCallback((color: string) => {
    setCustomColor(color);
    setHexInputValue(color);
    setPickerKey((k) => k + 1); // Force ColorPicker to re-initialize with new color
    onChangeRef.current({ mode: 'color', color });
  }, []);

  const handleHexInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    setHexInputValue(inputValue);

    // Only update the actual color if it's a valid hex
    if (isValidHex(inputValue)) {
      const normalized = normalizeHex(inputValue);
      setCustomColor(normalized);
      setPickerKey((k) => k + 1); // Force ColorPicker to re-initialize
      onChangeRef.current({ mode: 'color', color: normalized });
    }
  }, []);

  const handleHexInputBlur = useCallback(() => {
    // On blur, reset to the last valid color if current input is invalid
    if (!isValidHex(hexInputValue)) {
      setHexInputValue(customColor);
    } else {
      const normalized = normalizeHex(hexInputValue);
      setHexInputValue(normalized);
      setCustomColor(normalized);
    }
  }, [hexInputValue, customColor]);

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <span className="text-sm font-medium text-foreground">Remove Background</span>
      <div className="flex gap-0.5 rounded-md border border-border bg-card p-0.5">
        <OptionButton selected={value.mode === 'none'} onClick={() => handleModeChange('none')}>
          None
        </OptionButton>
        <OptionButton selected={value.mode === 'color'} onClick={() => handleModeChange('color')}>
          Color
        </OptionButton>
        <OptionButton selected={value.mode === 'smart'} onClick={() => handleModeChange('smart')}>
          <FontAwesomeIcon icon={faWandMagicSparkles} className="h-3 w-3" />
          Smart
        </OptionButton>
      </div>

      {/* Color picker - only shown when 'color' mode is selected */}
      {value.mode === 'color' && (
        <div className="flex flex-col gap-2 pt-1">
          <span className="text-xs text-muted-foreground">
            Select the background color to remove:
          </span>
          <div className="flex items-center gap-2">
            {/* Preset color swatches */}
            {presetColors.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => handlePresetColorClick(color)}
                className={cn(
                  'h-8 w-8 rounded border-2 transition-all cursor-pointer',
                  customColor.toLowerCase() === color.toLowerCase()
                    ? 'border-primary scale-105'
                    : 'border-border hover:border-muted-foreground',
                )}
                style={{ backgroundColor: color }}
                title={color.toUpperCase()}
              />
            ))}

            {/* Color swatch button that opens popover */}
            <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    'h-8 w-8 rounded border-2 transition-all cursor-pointer',
                    isPopoverOpen
                      ? 'border-primary scale-105'
                      : 'border-border hover:border-muted-foreground',
                    // Hide border highlight if it matches a preset
                    !presetColors.some((c) => c.toLowerCase() === customColor.toLowerCase()) &&
                      'border-primary',
                  )}
                  style={{ backgroundColor: customColor }}
                  title="Open color picker"
                />
              </PopoverTrigger>
              <PopoverContent className="w-64 p-3" align="start">
                <ColorPicker
                  key={pickerKey}
                  value={customColor}
                  onChange={handleColorPickerChange}
                  className="gap-3"
                >
                  <ColorPickerSelection className="h-32" />
                  <div className="flex items-center gap-3">
                    <ColorPickerEyeDropper />
                    <div className="grid w-full gap-1.5">
                      <ColorPickerHue />
                      <ColorPickerAlpha />
                    </div>
                  </div>
                </ColorPicker>
              </PopoverContent>
            </Popover>

            {/* Editable hex input */}
            <input
              type="text"
              value={hexInputValue}
              onChange={handleHexInputChange}
              onBlur={handleHexInputBlur}
              className={cn(
                'h-8 w-24 rounded-md border border-border bg-card px-2 text-xs font-mono uppercase',
                'focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary',
                !isValidHex(hexInputValue) && hexInputValue !== '' && 'border-destructive',
              )}
              placeholder="#ffffff"
              maxLength={7}
            />
          </div>
        </div>
      )}

      {/* Smart mode description */}
      {value.mode === 'smart' && (
        <p className="text-xs text-muted-foreground pt-1 max-w-75 text-center">
          Automatically detects and removes background elements that span the entire viewbox.
        </p>
      )}
    </div>
  );
}
