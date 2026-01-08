/**
 * Global exception filter for centralized error handling and logging.
 * Classifies errors by severity and logs appropriately.
 */
import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import { CustomLoggerService } from './logger.service.js';

// Common paths that generate 404s from scanners/bots (reduces log noise)
const SCANNER_PATTERNS = [
  '/favicon.ico',
  '/robots.txt',
  '/.env',
  '/wp-admin',
  '/wp-login',
  '/admin',
  '/phpmyadmin',
  '/.git',
  '/config',
  '.php',
  '.asp',
  '.aspx',
];

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new CustomLoggerService('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException ? exception.message : 'Internal server error';

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message:
        status >= 500 && process.env.NODE_ENV === 'production'
          ? 'An internal server error occurred'
          : message,
    };

    // Classify and log errors appropriately
    if (status >= 500) {
      // Server errors - always log at error level with stack trace
      this.logger.error(`${request.method} ${request.url} ${status} - ${message}`, {
        statusCode: status,
        path: request.url,
        method: request.method,
        stack: exception instanceof Error ? exception.stack : undefined,
      });
    } else if (this.isScannerProbe(request.url, status)) {
      // Scanner probes - log at debug level to reduce noise
      this.logger.debug(`${request.method} ${request.url} ${status} [scanner probe]`);
    } else {
      // Client errors (4xx) - log at warn level
      this.logger.warn(`${request.method} ${request.url} ${status} - ${message}`);
    }

    response.status(status).json(errorResponse);
  }

  /**
   * Check if the request looks like a scanner probe.
   */
  private isScannerProbe(url: string, status: number): boolean {
    if (status !== 404) return false;
    return SCANNER_PATTERNS.some((pattern) => url.toLowerCase().includes(pattern.toLowerCase()));
  }
}
