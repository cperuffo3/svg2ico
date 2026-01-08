/**
 * Global logging interceptor for HTTP requests.
 * Logs request/response details with timing in a pretty format.
 */
import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable, tap } from 'rxjs';
import { CustomLoggerService } from './logger.service.js';

// Fields to sanitize from request bodies
const SENSITIVE_FIELDS = ['password', 'token', 'secret', 'authorization', 'apiKey', 'api_key'];

// Endpoints to log at debug level instead of info (reduces noise)
const DEBUG_LEVEL_PATHS = ['/', '/health', '/api/v1/health'];

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new CustomLoggerService('HTTP');

  intercept(executionContext: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = executionContext.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const { method, url, body, query } = request;
    const startTime = Date.now();

    // Get the controller and handler names for better log context
    const controllerName = executionContext.getClass().name;
    const handlerName = executionContext.getHandler().name;
    const handlerContext = `${controllerName}.${handlerName}`;

    // Log incoming request at debug level
    const queryStr = Object.keys(query).length > 0 ? ` query=${JSON.stringify(query)}` : '';
    const bodyStr =
      body && Object.keys(body).length > 0
        ? ` body=${JSON.stringify(this.sanitizeBody(body))}`
        : '';
    this.logger.debug(`→ ${method} ${url}${queryStr}${bodyStr}`, { handler: handlerContext });

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          const statusCode = response.statusCode;

          // Format: METHOD URL STATUS DURATIONms
          const logMessage = `${method} ${url} ${statusCode} ${duration}ms`;

          // Use debug level for health checks to reduce noise
          if (DEBUG_LEVEL_PATHS.includes(url)) {
            this.logger.debug(logMessage);
          } else {
            this.logger.log(logMessage);
          }
        },
        error: () => {
          // Error logging is handled by AllExceptionsFilter
          // We just note the duration here for debugging
          const duration = Date.now() - startTime;
          this.logger.debug(`${method} ${url} failed after ${duration}ms`);
        },
      }),
    );
  }

  /**
   * Sanitize sensitive fields from request body.
   */
  private sanitizeBody(body: unknown): unknown {
    if (!body || typeof body !== 'object') {
      return body;
    }

    if (Array.isArray(body)) {
      return body.map((item) => this.sanitizeBody(item));
    }

    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(body as Record<string, unknown>)) {
      if (SENSITIVE_FIELDS.some((field) => key.toLowerCase().includes(field.toLowerCase()))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeBody(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }
}
