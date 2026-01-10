import { cn } from '@/lib/utils';

interface ToggleSwitchProps {
  value: boolean;
  onChange: (value: boolean) => void;
  labelFalse: string;
  labelTrue: string;
  className?: string;
}

export function ToggleSwitch({
  value,
  onChange,
  labelFalse,
  labelTrue,
  className,
}: ToggleSwitchProps) {
  return (
    <div className={cn('flex gap-0.5 rounded-md border border-border bg-card p-0.5', className)}>
      <button
        type="button"
        onClick={() => onChange(false)}
        className={cn(
          'flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded px-3 py-1.5 text-xs font-semibold transition-colors',
          !value ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground',
        )}
      >
        {labelFalse}
      </button>
      <button
        type="button"
        onClick={() => onChange(true)}
        className={cn(
          'flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded px-3 py-1.5 text-xs font-semibold transition-colors',
          value ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground',
        )}
      >
        {labelTrue}
      </button>
    </div>
  );
}
