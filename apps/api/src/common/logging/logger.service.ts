/**
 * Custom logger service that extends NestJS ConsoleLogger.
 * Always outputs pretty colored logs to terminal.
 * JSON format is only used when exporting to OTEL (not implemented here).
 */
import { ConsoleLogger, Injectable, LogLevel, Scope } from '@nestjs/common';

type LogLevelName = 'error' | 'warn' | 'log' | 'debug' | 'verbose';

export interface LogContext {
  message: string;
  [key: string]: unknown;
}

@Injectable({ scope: Scope.TRANSIENT })
export class CustomLoggerService extends ConsoleLogger {
  private static logLevel: LogLevelName = 'debug';
  private static initialized = false;

  constructor(context?: string) {
    super(context || 'Application');
    this.initializeLogLevel();
  }

  /**
   * Initialize log level from environment variables.
   * Only runs once across all instances.
   */
  private initializeLogLevel(): void {
    if (CustomLoggerService.initialized) return;

    const nodeEnv = process.env.NODE_ENV || 'development';
    const isProduction = nodeEnv === 'production';

    // Set log level from environment or default based on environment
    const envLogLevel = process.env.LOG_LEVEL?.toLowerCase() as LogLevelName;
    const validLevels: LogLevelName[] = ['error', 'warn', 'log', 'debug', 'verbose'];
    if (envLogLevel && validLevels.includes(envLogLevel)) {
      CustomLoggerService.logLevel = envLogLevel;
    } else {
      CustomLoggerService.logLevel = isProduction ? 'log' : 'debug';
    }

    // Configure NestJS log levels
    this.setLogLevels(this.getNestLogLevels());
    CustomLoggerService.initialized = true;
  }

  /**
   * Convert our log level to NestJS log levels array.
   */
  private getNestLogLevels(): LogLevel[] {
    const allLevels: LogLevel[] = ['error', 'warn', 'log', 'debug', 'verbose'];
    const levelIndex = allLevels.indexOf(CustomLoggerService.logLevel);
    return allLevels.slice(0, levelIndex + 1);
  }

  /**
   * Check if log level should be logged.
   */
  private shouldLog(level: LogLevelName): boolean {
    const levels: LogLevelName[] = ['error', 'warn', 'log', 'debug', 'verbose'];
    const currentLevelIndex = levels.indexOf(CustomLoggerService.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex <= currentLevelIndex;
  }

  /**
   * Sanitize sensitive fields from data.
   */
  private sanitize(data: unknown): unknown {
    if (data === null || data === undefined) {
      return data;
    }

    if (typeof data !== 'object') {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map((item) => this.sanitize(item));
    }

    const sensitiveKeys = ['password', 'token', 'secret', 'authorization', 'apiKey', 'api_key'];
    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      if (sensitiveKeys.some((sk) => key.toLowerCase().includes(sk.toLowerCase()))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitize(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Format and output a log entry with pretty colored output.
   */
  private formatAndOutput(
    level: LogLevelName,
    message: unknown,
    _optionalParams: unknown[],
    logContext?: string,
  ): void {
    if (!this.shouldLog(level)) return;

    const ctx = logContext || this.context || 'Application';

    // Extract message string from object if needed
    let messageStr: string;

    if (typeof message === 'object' && message !== null) {
      const msgObj = this.sanitize(message) as Record<string, unknown>;
      messageStr = String(msgObj.message || JSON.stringify(message));
    } else {
      messageStr = String(message);
    }

    // Pretty format - use parent ConsoleLogger with colors
    switch (level) {
      case 'error':
        super.error(messageStr, undefined, ctx);
        break;
      case 'warn':
        super.warn(messageStr, ctx);
        break;
      case 'debug':
        super.debug(messageStr, ctx);
        break;
      case 'verbose':
        super.verbose(messageStr, ctx);
        break;
      default:
        super.log(messageStr, ctx);
    }
  }

  /**
   * Log at 'log' level (INFO equivalent).
   */
  override log(message: unknown, ...optionalParams: unknown[]): void {
    const lastParam = optionalParams[optionalParams.length - 1];
    const ctx = typeof lastParam === 'string' ? (optionalParams.pop() as string) : undefined;
    this.formatAndOutput('log', message, optionalParams, ctx);
  }

  /**
   * Log at 'error' level.
   */
  override error(message: unknown, ...optionalParams: unknown[]): void {
    const lastParam = optionalParams[optionalParams.length - 1];
    const ctx = typeof lastParam === 'string' ? (optionalParams.pop() as string) : undefined;
    this.formatAndOutput('error', message, optionalParams, ctx);
  }

  /**
   * Log at 'warn' level.
   */
  override warn(message: unknown, ...optionalParams: unknown[]): void {
    const lastParam = optionalParams[optionalParams.length - 1];
    const ctx = typeof lastParam === 'string' ? (optionalParams.pop() as string) : undefined;
    this.formatAndOutput('warn', message, optionalParams, ctx);
  }

  /**
   * Log at 'debug' level.
   */
  override debug(message: unknown, ...optionalParams: unknown[]): void {
    const lastParam = optionalParams[optionalParams.length - 1];
    const ctx = typeof lastParam === 'string' ? (optionalParams.pop() as string) : undefined;
    this.formatAndOutput('debug', message, optionalParams, ctx);
  }

  /**
   * Log at 'verbose' level.
   */
  override verbose(message: unknown, ...optionalParams: unknown[]): void {
    const lastParam = optionalParams[optionalParams.length - 1];
    const ctx = typeof lastParam === 'string' ? (optionalParams.pop() as string) : undefined;
    this.formatAndOutput('verbose', message, optionalParams, ctx);
  }
}
