import { ToggleSwitch } from '@/components/ui/toggle-switch';
import { cn } from '@/lib/utils';
import type { OutputFormat } from '../types';

type OutputMode = 'icon' | 'png';

interface FormatOption {
  value: OutputFormat;
  label: string;
  description: string;
  icon: string;
  useInlineSvg?: boolean;
}

const iconFormatOptions: FormatOption[] = [
  {
    value: 'ico',
    label: '.ico',
    description: 'Windows',
    icon: '/icons/ico.svg',
  },
  {
    value: 'icns',
    label: '.icns',
    description: 'macOS',
    icon: '/icons/icns.svg',
  },
  {
    value: 'favicon',
    label: 'Favicon',
    description: 'Web',
    icon: '/icons/favicon.svg',
    useInlineSvg: true,
  },
  {
    value: 'all',
    label: 'All Formats',
    description: 'Download .zip',
    icon: '/icons/zip.svg',
  },
];

interface OutputFormatSelectorProps {
  selectedFormat: OutputFormat;
  onFormatChange: (format: OutputFormat) => void;
  isSmallHeight?: boolean;
}

export function OutputFormatSelector({
  selectedFormat,
  onFormatChange,
  isSmallHeight = false,
}: OutputFormatSelectorProps) {
  const outputMode: OutputMode = selectedFormat === 'png' ? 'png' : 'icon';

  const handleModeChange = (isPng: boolean) => {
    if (isPng) {
      onFormatChange('png');
    } else {
      // Switch back to icon mode - default to icns if currently on png
      onFormatChange('icns');
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-foreground">Output Format</span>
        <ToggleSwitch
          value={outputMode === 'png'}
          onChange={handleModeChange}
          labelFalse="Icon"
          labelTrue="PNG"
        />
      </div>

      {outputMode === 'icon' ? (
        <div className={cn('grid gap-2', isSmallHeight ? 'grid-cols-4' : 'grid-cols-2 gap-3 sm:grid-cols-4')}>
          {iconFormatOptions.map((option) => {
            const isSelected = selectedFormat === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onFormatChange(option.value)}
                className={cn(
                  'group relative flex cursor-pointer rounded-xl border-2 transition-all duration-200',
                  isSmallHeight
                    ? 'flex-row items-center gap-2 p-2'
                    : 'flex-col items-center gap-3 p-4',
                  isSelected
                    ? 'border-primary bg-primary/5 shadow-md shadow-primary/10'
                    : 'border-border bg-card hover:border-primary/50 hover:bg-muted/50',
                )}
              >
                {/* Selection indicator */}
                <div
                  className={cn(
                    'absolute flex items-center justify-center rounded-full border-2 transition-colors',
                    isSmallHeight ? 'right-1 top-1 h-3.5 w-3.5' : 'right-2 top-2 h-5 w-5',
                    isSelected ? 'border-primary bg-primary' : 'border-muted-foreground/30',
                  )}
                >
                  {isSelected && (
                    <svg
                      className={cn('text-primary-foreground', isSmallHeight ? 'h-2 w-2' : 'h-3 w-3')}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>

                {/* Icon */}
                <div
                  className={cn(
                    'flex shrink-0 items-center justify-center transition-transform duration-200',
                    isSmallHeight ? 'h-7 w-7' : 'h-14 w-14',
                    isSelected ? 'scale-110' : 'group-hover:scale-105',
                  )}
                >
                  {option.useInlineSvg ? (
                    <svg viewBox="0 0 512 512" className={cn('text-primary drop-shadow-sm', isSmallHeight ? 'h-6 w-6' : 'h-12 w-12')}>
                      <path
                        fill="currentColor"
                        clipRule="evenodd"
                        fillRule="evenodd"
                        d="m256 512c-141.159 0-256-114.841-256-256s114.841-256 256-256 256 114.841 256 256-114.841 256-256 256zm47.063-119.906c36.385-12.618 66.194-39.433 82.751-73.794h-58.634c-3.288 19.767-8.155 37.995-14.443 53.716-2.964 7.409-6.202 14.107-9.674 20.078zm-176.876-73.793c16.557 34.359 46.365 61.175 82.75 73.794-3.471-5.972-6.71-12.67-9.674-20.078-6.289-15.721-11.155-33.949-14.443-53.716zm82.75-198.395c-36.385 12.618-66.193 39.434-82.75 73.794h58.633c3.288-19.767 8.154-37.995 14.443-53.716 2.964-7.409 6.202-14.107 9.674-20.078zm47.063-7.906c-10.498 0-22.817 14.493-32.148 37.82-5.148 12.871-9.229 27.726-12.16 43.88h88.617c-2.931-16.153-7.011-31.009-12.16-43.88-9.332-23.327-21.651-37.82-32.149-37.82zm-144 144c0 12.361 1.567 24.362 4.51 35.818h64.957c-1.052-11.65-1.61-23.636-1.61-35.818s.558-24.168 1.61-35.818h-64.957c-2.943 11.456-4.51 23.457-4.51 35.818zm96.042 35.818h95.917c1.118-11.576 1.702-23.577 1.702-35.818s-.583-24.242-1.702-35.818h-95.917c-1.118 11.576-1.702 23.577-1.702 35.818s.583 24.242 1.702 35.818zm47.958 108.182c10.498 0 22.817-14.493 32.148-37.82 5.149-12.871 9.229-27.726 12.16-43.88h-88.617c2.931 16.153 7.012 31.009 12.16 43.88 9.332 23.327 21.651 37.82 32.149 37.82zm144-144c0-12.361-1.567-24.362-4.51-35.818h-64.958c1.052 11.65 1.61 23.636 1.61 35.818s-.558 24.168-1.61 35.818h64.958c2.943-11.456 4.51-23.457 4.51-35.818zm-14.187-62.301c-16.556-34.36-46.365-61.176-82.751-73.794 3.471 5.972 6.71 12.67 9.674 20.079 6.289 15.721 11.155 33.948 14.443 53.716h58.634zm40.67 62.301c0 94.004-76.479 170.483-170.483 170.483-94.005 0-170.483-76.479-170.483-170.483s76.478-170.483 170.483-170.483c94.005 0 170.483 76.479 170.483 170.483z"
                      />
                    </svg>
                  ) : (
                    <img
                      src={option.icon}
                      alt={option.label}
                      className={cn('object-contain drop-shadow-sm', isSmallHeight ? 'h-6 w-6' : 'h-12 w-12')}
                    />
                  )}
                </div>

                {/* Label & Description */}
                <div className={cn('flex flex-col', isSmallHeight ? 'items-start gap-0' : 'items-center gap-0.5')}>
                  <span
                    className={cn(
                      'font-semibold transition-colors',
                      isSmallHeight ? 'text-xs leading-tight' : 'text-sm',
                      isSelected ? 'text-primary' : 'text-foreground',
                    )}
                  >
                    {option.label}
                  </span>
                  <span className={cn('text-muted-foreground', isSmallHeight ? 'text-[10px] leading-tight' : 'text-xs')}>{option.description}</span>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        /* Single PNG card when PNG mode is selected */
        <div
          className={cn(
            'flex cursor-default rounded-xl border-2 border-primary bg-primary/5 shadow-md shadow-primary/10',
            isSmallHeight ? 'flex-row items-center gap-2 p-2' : 'flex-col items-center gap-3 p-4',
          )}
        >
          {/* Icon */}
          <div className={cn('flex shrink-0 items-center justify-center', isSmallHeight ? 'h-7 w-7' : 'h-14 w-14')}>
            <img
              src="/icons/png.svg"
              alt="PNG"
              className={cn('object-contain drop-shadow-sm', isSmallHeight ? 'h-6 w-6' : 'h-12 w-12')}
            />
          </div>

          {/* Label & Description */}
          <div className={cn('flex flex-col', isSmallHeight ? 'items-start gap-0' : 'items-center gap-0.5')}>
            <span className={cn('font-semibold text-primary', isSmallHeight ? 'text-xs leading-tight' : 'text-sm')}>.png</span>
            <span className={cn('text-muted-foreground', isSmallHeight ? 'text-[10px] leading-tight' : 'text-xs')}>Custom size</span>
          </div>
        </div>
      )}
    </div>
  );
}
