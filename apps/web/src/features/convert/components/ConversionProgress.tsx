import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { faCheck, faClock, faShieldHalved, faSpinner } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { ConversionState, ConversionStep } from '../types';

interface ConversionProgressProps {
  state: ConversionState;
  steps: ConversionStep[];
  estimatedTime?: number;
  progress: number;
}

function StepIcon({ status }: { status: ConversionStep['status'] }) {
  switch (status) {
    case 'completed':
      return (
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-success">
          <FontAwesomeIcon icon={faCheck} className="h-3 w-3 text-success-foreground" />
        </div>
      );
    case 'in_progress':
      return (
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary">
          <FontAwesomeIcon
            icon={faSpinner}
            className="h-3 w-3 animate-spin text-primary-foreground"
          />
        </div>
      );
    case 'error':
      return (
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-destructive">
          <span className="text-xs font-bold text-destructive-foreground">!</span>
        </div>
      );
    default:
      return (
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted">
          <FontAwesomeIcon icon={faClock} className="h-3 w-3 text-muted-foreground" />
        </div>
      );
  }
}

function StepStatus({ status }: { status: ConversionStep['status'] }) {
  const statusText = {
    completed: 'Completed',
    in_progress: 'In progress...',
    error: 'Error',
    pending: 'Waiting...',
  };

  const statusClass = {
    completed: 'text-success',
    in_progress: 'text-primary',
    error: 'text-destructive',
    pending: 'text-muted-foreground',
  };

  return <span className={cn('text-xs', statusClass[status])}>{statusText[status]}</span>;
}

export function ConversionProgress({
  state,
  steps,
  estimatedTime = 3,
  progress,
}: ConversionProgressProps) {
  if (state === 'idle') {
    return null;
  }

  const isConverting = state === 'converting';

  return (
    <div className="rounded-xl border border-section-primary-border bg-linear-to-b from-section-primary-from to-section-primary-to p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary">
          {isConverting ? (
            <FontAwesomeIcon
              icon={faSpinner}
              className="h-5 w-5 animate-spin text-primary-foreground"
            />
          ) : (
            <FontAwesomeIcon icon={faCheck} className="h-5 w-5 text-primary-foreground" />
          )}
        </div>
        <div className="flex flex-1 flex-col gap-1">
          <span className="text-lg font-bold text-foreground">
            {isConverting ? 'Converting your icon...' : 'Conversion complete!'}
          </span>
          <span className="text-sm text-muted-foreground">
            {isConverting
              ? 'Processing SVG and generating icon files'
              : 'Your files are ready for download'}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-4">
        <Progress value={progress} className="h-3 bg-card" indicatorClassName="bg-primary" />
      </div>

      {/* Steps */}
      <div className="mt-4 flex flex-col gap-3">
        {steps.map((step) => (
          <div
            key={step.id}
            className={cn('flex items-center gap-3', step.status === 'pending' && 'opacity-40')}
          >
            <StepIcon status={step.status} />
            <div className="flex flex-1 flex-col">
              <span
                className={cn(
                  'text-sm font-medium',
                  step.status === 'pending' ? 'text-muted-foreground' : 'text-foreground',
                )}
              >
                {step.label}
              </span>
              <StepStatus status={step.status} />
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-6 flex items-center justify-between border-t border-section-primary-border pt-4">
        <div className="flex items-center gap-2">
          <FontAwesomeIcon icon={faClock} className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            Estimated time:{' '}
            <span className="font-semibold text-foreground">{estimatedTime} seconds</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <FontAwesomeIcon icon={faShieldHalved} className="h-3.5 w-3.5 text-success" />
          <span className="text-xs text-muted-foreground">
            Your file is processed securely and never stored
          </span>
        </div>
      </div>
    </div>
  );
}
