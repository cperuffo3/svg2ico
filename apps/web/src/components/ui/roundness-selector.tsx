import { cn } from '@/lib/utils';

export type RoundnessValue = 0 | 12.5 | 25 | 37.5 | 50;

interface CornerIconProps {
  radius: number;
  className?: string;
}

function CornerIcon({ radius, className }: CornerIconProps) {
  const size = 20;
  // Calculate the arc radius as percentage of icon size
  const r = (radius / 50) * (size - 2);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      fill="none"
      className={className}
    >
      {r === 0 ? (
        // Sharp corner - just draw two lines meeting at a point
        <path
          d={`M 1 ${size - 1} L 1 1 L ${size - 1} 1`}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      ) : (
        // Rounded corner - draw two lines with an arc
        <path
          d={`M 1 ${size - 1} L 1 ${1 + r} Q 1 1 ${1 + r} 1 L ${size - 1} 1`}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      )}
    </svg>
  );
}

const roundnessOptions: RoundnessValue[] = [0, 12.5, 25, 37.5, 50];

interface RoundnessSelectorProps {
  value: RoundnessValue;
  onChange: (value: RoundnessValue) => void;
  className?: string;
}

export function RoundnessSelector({ value, onChange, className }: RoundnessSelectorProps) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <span className="text-sm font-medium text-foreground">Round Corners</span>
      <div className="flex gap-0.5 rounded-md border border-border bg-card p-0.5">
        {roundnessOptions.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={cn(
              'flex flex-1 cursor-pointer items-center justify-center rounded px-2 py-1.5 transition-colors',
              value === option
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <CornerIcon radius={option} />
          </button>
        ))}
      </div>
    </div>
  );
}
