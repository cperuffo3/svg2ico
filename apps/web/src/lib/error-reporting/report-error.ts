/**
 * Error reporting service.
 * Sends frontend errors to the backend for logging and monitoring.
 */
import { env } from '@/config/env';

export interface ErrorReport {
  message: string;
  stack?: string;
  componentStack?: string;
  url: string;
  userAgent?: string;
  timestamp: string;
  context?: Record<string, unknown>;
  breadcrumbs?: string[];
}

interface ErrorReportResponse {
  logged: boolean;
  errorId: string;
}

/**
 * Report an error to the backend.
 * Uses fetch directly to avoid circular dependencies with the API client,
 * and to ensure errors can be reported even if the API client itself has issues.
 */
export async function reportError(report: ErrorReport): Promise<ErrorReportResponse | null> {
  try {
    const response = await fetch(`${env.API_URL}/api/v1/client-errors`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(report),
    });

    if (response.ok) {
      return (await response.json()) as ErrorReportResponse;
    }

    if (env.IS_DEV) {
      console.error('[ErrorReporting] Failed to report error:', response.status);
    }
    return null;
  } catch (err) {
    // Don't throw - we don't want error reporting to cause more errors
    if (env.IS_DEV) {
      console.error('[ErrorReporting] Failed to send error report:', err);
    }
    return null;
  }
}

/**
 * Create an error report from an Error object.
 */
export function createErrorReport(
  error: Error,
  componentStack?: string,
  context?: Record<string, unknown>,
): ErrorReport {
  return {
    message: error.message || 'Unknown error',
    stack: error.stack,
    componentStack,
    url: window.location.pathname + window.location.search,
    userAgent: navigator.userAgent,
    timestamp: new Date().toISOString(),
    context,
  };
}
