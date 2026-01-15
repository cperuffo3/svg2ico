import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import {
  faCheck,
  faClock,
  faShieldHalved,
  faSpinner,
  faTriangleExclamation,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useEffect, useState } from 'react';
import type { ConversionState, ConversionStep } from '../types';

const SMALL_HEIGHT_THRESHOLD = 1100;

function useIsSmallHeight() {
  const [isSmallHeight, setIsSmallHeight] = useState(
    () => typeof window !== 'undefined' && window.innerHeight < SMALL_HEIGHT_THRESHOLD,
  );

  useEffect(() => {
    const handleResize = () => {
      setIsSmallHeight(window.innerHeight < SMALL_HEIGHT_THRESHOLD);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return isSmallHeight;
}

interface ConversionProgressProps {
  state: ConversionState;
  steps: ConversionStep[];
  estimatedTime?: number;
  progress: number;
  errorMessage?: string | null;
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
  errorMessage,
}: ConversionProgressProps) {
  const isSmallHeight = useIsSmallHeight();

  if (state === 'idle') {
    return null;
  }

  const isConverting = state === 'converting';
  const isComplete = state === 'completed';
  const isError = state === 'error';

  // Hide steps on small screens when conversion is complete or error
  const shouldShowSteps = !(isSmallHeight && (isComplete || isError));

  return (
    <div
      className={cn(
        'rounded-xl border p-6',
        isError
          ? 'border-destructive/30 bg-destructive/5'
          : 'border-section-primary-border bg-linear-to-b from-section-primary-from to-section-primary-to',
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-4">
        <div
          className={cn(
            'flex h-12 w-12 items-center justify-center rounded-full',
            isError ? 'bg-destructive' : 'bg-primary',
          )}
        >
          {isConverting ? (
            <FontAwesomeIcon
              icon={faSpinner}
              className="h-5 w-5 animate-spin text-primary-foreground"
            />
          ) : isError ? (
            <FontAwesomeIcon
              icon={faTriangleExclamation}
              className="h-5 w-5 text-destructive-foreground"
            />
          ) : (
            <FontAwesomeIcon icon={faCheck} className="h-5 w-5 text-primary-foreground" />
          )}
        </div>
        <div className="flex flex-1 flex-col gap-1">
          <span className="text-lg font-bold text-foreground">
            {isConverting
              ? 'Converting your icon...'
              : isError
                ? 'Conversion failed'
                : 'Conversion complete!'}
          </span>
          <span className="text-sm text-muted-foreground">
            {isConverting
              ? 'Processing SVG and generating icon files'
              : isError
                ? 'Something went wrong during the conversion'
                : 'Your files are ready for download'}
          </span>
        </div>
      </div>

      {/* Error message */}
      {isError && errorMessage && (
        <div className="mt-4 rounded-lg border border-destructive/20 bg-destructive/10 p-3">
          <p className="wrap-break-word text-sm text-destructive">{errorMessage}</p>
        </div>
      )}

      {/* Progress bar */}
      <div className="mt-4">
        <Progress
          value={progress}
          className="h-3 bg-card"
          indicatorClassName={isError ? 'bg-destructive' : 'bg-primary'}
        />
      </div>

      {/* Steps - hidden on small screens when complete, hide steps after error */}
      {shouldShowSteps && (
        <div className="mt-4 flex flex-col gap-3">
          {steps
            .slice(0, isError ? steps.findIndex((s) => s.status === 'error') + 1 : steps.length)
            .map((step) => (
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
      )}

      {/* Footer - hidden on small screens when complete */}
      {shouldShowSteps && (
        <div className="mt-6 flex items-center justify-between border-t border-section-primary-border pt-4">
          <div className="flex items-center gap-2">
            <FontAwesomeIcon icon={faClock} className="h-3.5 w-3.5 text-muted-foreground" />
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground">Estimated time:</span>
              <span className="text-sm font-semibold text-foreground">{estimatedTime} seconds</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <FontAwesomeIcon icon={faShieldHalved} className="h-3.5 w-3.5 text-success" />
            <span className="text-xs text-muted-foreground">
              Your file is processed securely and never stored
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
