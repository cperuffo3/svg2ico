/**
 * Error boundary provider.
 * Catches unhandled React errors and displays a fallback UI.
 * Reports errors to the backend for monitoring.
 */
import { ErrorPage } from '@/components/common';
import { env } from '@/config/env';
import { createErrorReport, reportError } from '@/lib/error-reporting';
import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProviderProps {
  children: ReactNode;
}

interface ErrorBoundaryProviderState {
  hasError: boolean;
  error: Error | null;
  errorId: string | null;
}

export class ErrorBoundaryProvider extends Component<
  ErrorBoundaryProviderProps,
  ErrorBoundaryProviderState
> {
  constructor(props: ErrorBoundaryProviderProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorId: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryProviderState> {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const report = createErrorReport(error, errorInfo.componentStack ?? undefined);

    reportError(report).then((response) => {
      if (response?.errorId) {
        this.setState({ errorId: response.errorId });
      }
    });

    if (env.IS_DEV) {
      console.error('[ErrorBoundary] Caught error:', error, errorInfo);
    }
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null, errorId: null });
  };

  handleGoHome = (): void => {
    this.setState({ hasError: false, error: null, errorId: null });
    window.location.href = '/';
  };

  override render(): ReactNode {
    if (this.state.hasError) {
      return (
        <ErrorPage
          error={this.state.error ?? undefined}
          errorId={this.state.errorId ?? undefined}
          onRetry={this.handleRetry}
          onGoHome={this.handleGoHome}
        />
      );
    }

    return this.props.children;
  }
}
