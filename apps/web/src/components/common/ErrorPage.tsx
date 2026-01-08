/**
 * Unified error page.
 * Used both as a React Router errorElement and by the ErrorBoundaryProvider.
 */
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { env } from '@/config/env';
import { createErrorReport, reportError } from '@/lib/error-reporting';
import { faHouse, faRotate, faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useEffect, useState } from 'react';

interface ErrorPageContentProps {
  error?: Error | null;
  errorMessage: string;
  errorStack?: string;
  errorId?: string | null;
  onRetry?: () => void;
  onGoHome?: () => void;
}

/**
 * The actual error page UI - no hooks that depend on router context.
 */
function ErrorPageContent({
  error,
  errorMessage,
  errorStack,
  errorId: propErrorId,
  onRetry,
  onGoHome,
}: ErrorPageContentProps) {
  const [errorId, setErrorId] = useState<string | null>(propErrorId ?? null);

  useEffect(() => {
    if (propErrorId) return;

    const errorObj = error ?? new Error(errorMessage);
    const report = createErrorReport(errorObj);

    reportError(report).then((response) => {
      if (response?.errorId) {
        setErrorId(response.errorId);
      }
    });

    if (env.IS_DEV) {
      console.error('[ErrorPage] Error:', errorObj);
    }
  }, [error, errorMessage, propErrorId]);

  const handleGoHome = () => {
    if (onGoHome) {
      onGoHome();
    } else {
      window.location.href = '/';
    }
  };

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else {
      window.location.reload();
    }
  };

  return (
    <div className="flex min-h-svh items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg text-center transition-all duration-300 overflow-hidden">
        <CardHeader>
          <div className="mx-auto mb-4">
            <FontAwesomeIcon icon={faTriangleExclamation} className="h-16 w-16 text-destructive" />
          </div>
          <CardTitle className="text-2xl">Something went wrong</CardTitle>
          <CardDescription className="text-base">
            We encountered an unexpected error. Our team has been notified and is working on a fix.
            Please try again or return to the home page.
          </CardDescription>
          {errorId && (
            <p className="mt-2 font-mono text-xs text-muted-foreground">Error ID: {errorId}</p>
          )}
          {env.IS_DEV && (
            <details className="mt-4 w-full min-w-0 text-left">
              <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                Technical details
              </summary>
              <pre className="mt-2 max-h-48 max-w-full overflow-auto rounded bg-muted p-2 text-xs">
                {errorMessage}
                {errorStack && `\n\n${errorStack}`}
              </pre>
            </details>
          )}
        </CardHeader>

        <CardFooter className="justify-center gap-3">
          <Button variant="outline" onClick={handleGoHome} className="gap-2">
            <FontAwesomeIcon icon={faHouse} className="h-4 w-4" />
            Go Home
          </Button>
          <Button onClick={handleRetry} className="gap-2">
            <FontAwesomeIcon icon={faRotate} className="h-4 w-4" />
            Try Again
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

interface ErrorPageProps {
  error?: Error;
  errorId?: string;
  onRetry?: () => void;
  onGoHome?: () => void;
}

/**
 * ErrorPage for use by ErrorBoundaryProvider (no router hooks).
 */
export function ErrorPage({ error, errorId, onRetry, onGoHome }: ErrorPageProps) {
  return (
    <ErrorPageContent
      error={error}
      errorMessage={error?.message ?? 'Unknown error'}
      errorStack={error?.stack}
      errorId={errorId}
      onRetry={onRetry}
      onGoHome={onGoHome}
    />
  );
}

/**
 * RouteErrorPage for use as React Router errorElement.
 * Uses useRouteError() hook to get the error from router context.
 * Uncomment and use when React Router is added.
 */
// export function RouteErrorPage() {
//   const routeError = useRouteError();
//
//   const error = routeError instanceof Error ? routeError : null;
//   const errorMessage =
//     error?.message ??
//     (routeError as { statusText?: string })?.statusText ??
//     (routeError as { message?: string })?.message ??
//     'Unknown error';
//
//   return <ErrorPageContent error={error} errorMessage={errorMessage} errorStack={error?.stack} />;
// }
