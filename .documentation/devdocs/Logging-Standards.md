# Logging & Metrics Standards

This document defines the logging, metrics, and error handling standards for both the backend API and frontend web application. All services should follow these guidelines for consistent, traceable, and efficient observability.

## Overview

The observability infrastructure uses:

- **NestJS Logger** - Extended with OpenTelemetry integration
- **OpenTelemetry** - For distributed tracing, metrics, and logs to BetterStack
- **Structured Logging** - JSON format in production, pretty format in development
- **Custom Metrics** - For monitoring without log overhead

## Logs vs Metrics: When to Use Each

**Use Logs for:**

- Debugging and troubleshooting (detailed context needed)
- Error details with stack traces
- Audit trails (who did what, when)
- Complex event context that can't be expressed as numbers

**Use Metrics for:**

- Counting events (claims, extractions, errors)
- Measuring durations (API latency, extraction time)
- Tracking rates (requests/second, failures/minute)
- Monitoring system health (active connections, queue depth)
- Alerting thresholds (error rate > 5%, latency > 2s)

**Rule of Thumb:** If you're tracking "how many" or "how long", use metrics. If you need "what happened and why", use logs.

## Log Levels

| Level     | When to Use                                            | Examples                                             |
| --------- | ------------------------------------------------------ | ---------------------------------------------------- |
| `error`   | Unrecoverable failures, exceptions that need attention | Database connection failed, external API unreachable |
| `warn`    | Recoverable issues, validation failures, retries       | Rate limited, invalid input rejected, retry attempt  |
| `log`     | Significant business events                            | Gift claimed, user created, event completed          |
| `debug`   | Detailed flow information                              | Cache hit/miss, query results, request bodies        |
| `verbose` | Very detailed tracing (rarely used)                    | Method entry/exit for deep debugging                 |

## Environment Configuration

| Variable                      | Values                           | Default                    |
| ----------------------------- | -------------------------------- | -------------------------- |
| `LOG_LEVEL`                   | error, warn, log, debug, verbose | debug (dev), warn (prod)   |
| `LOG_FORMAT`                  | json, pretty                     | pretty (dev), json (prod)  |
| `OTEL_ENABLED`                | true, false                      | true                       |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | URL                              | (required for BetterStack) |
| `BETTERSTACK_SOURCE_TOKEN`    | Token                            | (required for BetterStack) |

## BetterStack Setup

The application sends telemetry directly to BetterStack via OTLP (no collector needed).

### 1. Get Your Credentials

1. Go to [BetterStack Telemetry](https://telemetry.betterstack.com)
2. Create a new source or select an existing one
3. Copy your **Source Token** and **Ingesting Host**

### 2. Configure Environment Variables

Add to your `.env` file:

```bash
# Enable OpenTelemetry
OTEL_ENABLED=true

# BetterStack OTLP endpoint (your ingesting host)
OTEL_EXPORTER_OTLP_ENDPOINT=https://in-otel.logs.betterstack.com

# Your source token
BETTERSTACK_SOURCE_TOKEN=your_source_token_here

# Optional: Custom service name
OTEL_SERVICE_NAME=api
```

### 3. What Gets Sent

The SDK automatically exports:

- **Traces**: HTTP requests, database queries, external API calls
- **Metrics**: Request counts, response times, custom metrics
- **Logs**: All log statements via `CustomLoggerService`

### 4. Local Development

For local development without BetterStack:

```bash
# Disable OTLP export (logs still appear in console)
OTEL_ENABLED=false
```

Or simply don't set `OTEL_EXPORTER_OTLP_ENDPOINT` - the SDK will skip export gracefully.

## Logger Setup in Services

### Basic Setup

```typescript
import { Logger } from '@nestjs/common';

@Injectable()
export class MyService {
  private readonly logger = new Logger(MyService.name);

  async doSomething(id: string): Promise<void> {
    this.logger.log({ message: 'Operation started', id });
    // ... implementation
  }
}
```

### Structured Logging Format

Always use object format for searchability in log aggregation:

```typescript
// ✅ Good - structured, searchable
this.logger.log({ message: 'Item created', itemId, userId, quantity });

// ❌ Avoid - not searchable
this.logger.log(`Item ${itemId} created by ${userId}`);
```

## What to Log

### Always Log

- **Business events**: Item created, user registered, order completed
- **External API calls**: Start, success/failure, duration
- **Authentication events**: Login success/failure (not credentials)
- **Authorization decisions**: Access denied with reason
- **Queue job lifecycle**: Start, progress, completion, failure
- **Cache operations**: Hits/misses at debug level
- **Retry attempts**: With attempt count and reason

### Log at Specific Levels

```typescript
// ERROR - Unrecoverable failures
this.logger.error({
  message: 'Database connection failed',
  error: error.message,
  stack: error.stack,
});

// WARN - Recoverable issues
this.logger.warn({
  message: 'Rate limit exceeded, retrying',
  attempt: 2,
  maxAttempts: 3,
  retryAfter: 1000,
});

// LOG - Business events
this.logger.log({
  message: 'Order completed',
  orderId,
  userId,
  total,
});

// DEBUG - Flow details
this.logger.debug({
  message: 'Cache hit for user',
  userId,
  ttl: 300,
});
```

## What NOT to Log

### Never Log

- Passwords, tokens, API keys, secrets
- Full credit card numbers
- Personal health information
- Session tokens or JWTs

### Avoid Logging

- High-frequency read operations (use debug level if needed)
- Redundant "operation completed" messages
- Full request/response bodies (use debug level, sanitize)
- Internal implementation details that don't aid debugging

## Sensitive Data Handling

The logging interceptor automatically sanitizes these fields:

- `password`
- `token`
- `secret`
- `authorization`
- `apiKey`
- `api_key`

For additional sensitive fields, sanitize manually:

```typescript
this.logger.debug({
  message: 'User profile updated',
  userId,
  // Don't log: email, phone, address
  fieldsUpdated: ['displayName', 'avatar'],
});
```

## Error Logging

### Let Global Filter Handle Uncaught Exceptions

The `AllExceptionsFilter` catches and logs all uncaught exceptions. You don't need to log errors you're throwing:

```typescript
// ✅ Good - just throw, filter handles logging
async findItem(id: string): Promise<Item> {
  const item = await this.prisma.item.findUnique({ where: { id } });
  if (!item) {
    throw new NotFoundException('Item not found');
  }
  return item;
}

// ❌ Avoid - redundant logging
async findItem(id: string): Promise<Item> {
  const item = await this.prisma.item.findUnique({ where: { id } });
  if (!item) {
    this.logger.error({ message: 'Item not found', id }); // Redundant!
    throw new NotFoundException('Item not found');
  }
  return item;
}
```

### When to Log Errors Manually

Only log errors you're catching and handling:

```typescript
async processWithFallback(): Promise<Result> {
  try {
    return await this.primaryMethod();
  } catch (error) {
    // Log because we're handling it, not re-throwing
    this.logger.warn({
      message: 'Primary method failed, using fallback',
      error: error.message,
    });
    return await this.fallbackMethod();
  }
}
```

## External API Calls

Use `TracedHttpService` for external API calls to get automatic span creation:

```typescript
import { TracedHttpService } from '@/common/logging';

@Injectable()
export class ExternalApiService {
  constructor(private readonly tracedHttp: TracedHttpService) {}

  async fetchData(url: string): Promise<Data> {
    const response = await this.tracedHttp.get<Data>(url);
    return response.data;
  }
}
```

## Queue Jobs

Use `JobContextService` for BullMQ job execution:

```typescript
import { JobContextService } from '@/common/logging';

@Processor('my-queue')
export class MyProcessor {
  constructor(private readonly jobContext: JobContextService) {}

  @Process('my-job')
  async handleJob(job: Job): Promise<void> {
    const result = await this.jobContext.executeWithContext(job, async () => {
      // Job implementation
      return await this.doWork(job.data);
    });

    if (!result.success) {
      throw result.error;
    }
  }
}
```

## WebSocket Events

Use `WebSocketLoggerService` for Socket.io events:

```typescript
import { WebSocketLoggerService } from '@/common/logging';

@WebSocketGateway()
export class MyGateway {
  constructor(private readonly wsLogger: WebSocketLoggerService) {}

  handleConnection(client: Socket): void {
    this.wsLogger.logConnection(client.id, client.data.userId);
  }

  @SubscribeMessage('join-room')
  handleJoinRoom(client: Socket, room: string): void {
    this.wsLogger.logRoomJoin({ socketId: client.id, userId: client.data.userId }, room);
    client.join(room);
  }
}
```

## Trace Context

All logs automatically include OpenTelemetry trace IDs when available. This allows you to:

1. Search logs by trace ID in BetterStack
2. See all logs for a single request
3. Correlate logs across services

The trace ID appears:

- In pretty format: `[trace:abc123]`
- In JSON format: `"traceId": "abc123def456..."`

## Log Entry Fields

Every log entry includes:

| Field     | Description                           | Example             |
| --------- | ------------------------------------- | ------------------- |
| timestamp | ISO 8601 timestamp                    | 2025-12-16T10:00:00 |
| level     | Log level                             | log, error, warn    |
| service   | Service name (from OTEL_SERVICE_NAME) | api                 |
| context   | Logger context (usually class name)   | OrderService        |
| traceId   | OpenTelemetry trace ID                | abc123def456...     |
| spanId    | OpenTelemetry span ID                 | 789xyz...           |
| message   | Log message                           | Order completed     |
| ...       | Additional structured fields          | orderId, userId     |

## Custom Metrics

Use `MetricsService` to track business events efficiently without log overhead.

### Setup

```typescript
import { MetricsService } from '@/common/logging';

@Injectable()
export class OrderService {
  constructor(private readonly metrics: MetricsService) {}
}
```

### Available Metric Types

#### Counters (Monotonically Increasing)

```typescript
// Business operations
this.metrics.recordOrderCreated({ userId });
this.metrics.recordPaymentProcessed({ userId, amount });

// Errors
this.metrics.recordError('ValidationError', { statusCode: 400, path: '/api/orders' });
```

#### Histograms (Distributions)

```typescript
// Track operation duration
const startTime = Date.now();
// ... operation logic ...
this.metrics.recordOperationDuration(Date.now() - startTime, {
  operation: 'process-payment',
  success: true,
});

// Track external API latency
this.metrics.recordExternalApiCall(durationMs, {
  service: 'payment-provider',
  endpoint: '/charge',
  success: true,
});

// Track database query duration
this.metrics.recordDbQuery(durationMs, { operation: 'select', table: 'orders' });
```

#### Gauges (Up/Down Values)

```typescript
// WebSocket connections
this.metrics.recordWebsocketConnect();
this.metrics.recordWebsocketDisconnect();

// Queue jobs
this.metrics.recordQueueJobStart({ queue: 'emails', jobType: 'send' });
this.metrics.recordQueueJobEnd({ queue: 'emails', jobType: 'send' });
```

### Metric Naming Convention

All metrics follow the pattern: `{service}.{domain}.{metric}.{unit}`

| Metric                             | Type          | Description                  |
| ---------------------------------- | ------------- | ---------------------------- |
| `api.orders.created.total`         | Counter       | Total orders created         |
| `api.payments.processed.total`     | Counter       | Total payments processed     |
| `api.operations.duration`          | Histogram     | Operation time (ms)          |
| `api.errors.total`                 | Counter       | Errors by type               |
| `api.external_api.duration`        | Histogram     | External API call time (ms)  |
| `api.db.query.duration`            | Histogram     | Database query time (ms)     |
| `api.websocket.connections.active` | UpDownCounter | Active WebSocket connections |
| `api.queue.jobs.active`            | UpDownCounter | Active queue jobs            |

### When to Add New Metrics

Add metrics for:

- Business KPIs (orders, users, conversions)
- SLA tracking (latency percentiles)
- Error budgets (error rates by type)
- Resource utilization (connections, jobs)

Don't add metrics for:

- Every method call (too noisy)
- Debug information (use logs)
- Rare edge cases (use logs)

## Testing Logs

When running tests, logs are typically suppressed. To enable logging in tests:

```typescript
// In test setup
process.env.LOG_LEVEL = 'debug';
```

## Common Patterns

### Service Method Template

```typescript
async createItem(dto: CreateItemDto, userId: string): Promise<Item> {
  this.logger.debug({ message: 'Creating item', userId, dto });

  const item = await this.prisma.item.create({
    data: { ...dto, userId },
  });

  this.logger.log({ message: 'Item created', itemId: item.id, userId });

  return item;
}
```

### External API Call Template

```typescript
async fetchFromExternalApi(id: string): Promise<ExternalData> {
  this.logger.debug({ message: 'Fetching from external API', id });

  try {
    const response = await this.tracedHttp.get<ExternalData>(
      `${this.apiUrl}/items/${id}`,
    );

    this.logger.debug({
      message: 'External API response received',
      id,
      status: response.status,
      duration: response.duration,
    });

    return response.data;
  } catch (error) {
    this.logger.error({
      message: 'External API call failed',
      id,
      error: error.message,
    });
    throw error;
  }
}
```

---

## Frontend Error Handling & Logging

The frontend web application has a multi-layered error handling system that catches, displays, and reports errors to the backend.

### Architecture Overview

```
App Root
├── ErrorBoundaryProvider    ← Catches unhandled React errors
│   ├── QueryProvider        ← TanStack Query for API state
│   │   └── App              ← Main application
│   └── ErrorPage            ← Fallback UI when errors occur
```

### Error Boundary Provider

The `ErrorBoundaryProvider` wraps the entire application and catches any unhandled React errors:

**Location:** `apps/web/src/providers/ErrorBoundaryProvider.tsx`

```typescript
import { ErrorBoundaryProvider } from '@/providers';

// In main.tsx
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundaryProvider>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </ErrorBoundaryProvider>
  </React.StrictMode>,
);
```

**Features:**

- Catches all unhandled React errors via `componentDidCatch`
- Reports errors to backend via `/api/v1/client-errors`
- Displays user-friendly error page with retry/go-home options
- Shows technical details in development mode only
- Provides error ID for support reference

### Error Reporting Service

**Location:** `apps/web/src/lib/error-reporting/report-error.ts`

The error reporting service sends structured error reports to the backend:

```typescript
interface ErrorReport {
  message: string;
  stack?: string;
  componentStack?: string; // React component stack trace
  url: string; // Current page URL
  userAgent?: string; // Browser information
  timestamp: string; // ISO 8601 timestamp
  context?: Record<string, unknown>; // Additional context
  breadcrumbs?: string[]; // User actions leading to error
}
```

**Usage:**

```typescript
import { createErrorReport, reportError } from '@/lib/error-reporting';

// Create and send an error report
const report = createErrorReport(error, componentStack, { userId, action: 'checkout' });
const response = await reportError(report);

if (response?.errorId) {
  // Display error ID to user for support reference
  console.log('Error ID:', response.errorId);
}
```

**Design Decisions:**

- Uses `fetch` directly instead of API client to avoid circular dependencies
- Fails gracefully - error reporting should never cause additional errors
- Includes credentials for authenticated error correlation

### Frontend Console Logging

Use conditional logging to avoid console noise in production:

```typescript
import { env } from '@/config/env';

// ✅ Good - conditional on development
if (env.IS_DEV) {
  console.log('[ModuleName] Event:', data);
}

// ✅ Good - error boundary logging
if (env.IS_DEV) {
  console.error('[ErrorBoundary] Caught error:', error, errorInfo);
}

// ❌ Avoid - always logs in production
console.log('User data:', userData);
```

### Logging Prefix Convention

Use square bracket prefixes for easy filtering:

| Module          | Prefix             | Example                                        |
| --------------- | ------------------ | ---------------------------------------------- |
| Error Boundary  | `[ErrorBoundary]`  | `[ErrorBoundary] Caught error: ...`            |
| Error Page      | `[ErrorPage]`      | `[ErrorPage] Error: ...`                       |
| Error Reporting | `[ErrorReporting]` | `[ErrorReporting] Failed to report error: ...` |
| API Client      | `[API]`            | `[API] Request failed: ...`                    |
| Socket          | `[Socket]`         | `[Socket] Connected`                           |

### Error Page Component

**Location:** `apps/web/src/pages/ErrorPage.tsx`

Two variants are provided:

1. **`ErrorPage`** - For use with ErrorBoundaryProvider (no router hooks)
2. **`RouteErrorPage`** - For use as React Router `errorElement` (uses `useRouteError()`)

**Features:**

- User-friendly error message
- Error ID display for support reference
- "Go Home" and "Try Again" buttons
- Technical details expandable in development mode
- Automatically reports errors to backend if not already reported

### Environment Configuration

**Location:** `apps/web/src/config/env.ts`

```typescript
export const env = {
  API_URL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  IS_DEV: import.meta.env.DEV,
  IS_PROD: import.meta.env.PROD,
} as const;
```

### Frontend Error Handling Patterns

#### API Error Handling

```typescript
// In API client or hooks
try {
  const response = await fetch(`${env.API_URL}/api/v1/resource`);
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  return response.json();
} catch (error) {
  if (env.IS_DEV) {
    console.error('[API] Request failed:', error);
  }
  throw error; // Re-throw for error boundary or component handling
}
```

#### Component Error Handling

```typescript
function MyComponent() {
  const { data, error, isError } = useQuery({
    queryKey: ['resource'],
    queryFn: fetchResource,
  });

  // Let TanStack Query handle retries
  // Display error state in UI
  if (isError) {
    return <ErrorDisplay error={error} />;
  }

  return <DataDisplay data={data} />;
}
```

### Backend Client Error Endpoint

The frontend expects a `/api/v1/client-errors` POST endpoint on the backend:

**Request:**

```json
{
  "message": "Cannot read property 'id' of undefined",
  "stack": "TypeError: Cannot read property...",
  "componentStack": "\n    at UserProfile\n    at Dashboard...",
  "url": "/dashboard",
  "userAgent": "Mozilla/5.0...",
  "timestamp": "2025-01-01T12:00:00.000Z",
  "context": { "userId": "123" }
}
```

**Response:**

```json
{
  "logged": true,
  "errorId": "err_abc123def456"
}
```

The `errorId` should be a unique identifier that can be used to correlate frontend errors with backend logs.

### What to Log (Frontend)

#### Always Log (in development)

- Error boundary catches
- API request failures
- Authentication/authorization events
- WebSocket connection lifecycle

#### Never Log

- User passwords or tokens
- Personal information (email, phone)
- Full request/response bodies with sensitive data

### Testing Error Handling

```typescript
// Trigger error boundary in development
function ThrowError() {
  throw new Error('Test error for error boundary');
}

// In component
{env.IS_DEV && <button onClick={() => <ThrowError />}>Test Error</button>}
```
