import { Injectable } from '@nestjs/common';
import { HealthCheckError, HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';
import { PrismaService, withTimeout } from '../../common/prisma/index.js';

const HEALTH_TIMEOUT_MS = 2_000;

@Injectable()
export class PrismaHealthIndicator extends HealthIndicator {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      // Bounded so the endpoint answers 503 quickly when the DB is unreachable
      // instead of hanging (the frontend uses this to show the outage screen).
      await withTimeout(this.prisma.$queryRaw`SELECT 1`, HEALTH_TIMEOUT_MS, 'Database');
      return this.getStatus(key, true);
    } catch (error) {
      throw new HealthCheckError(
        'Prisma health check failed',
        this.getStatus(key, false, {
          message: error instanceof Error ? error.message : 'Unknown error',
        }),
      );
    }
  }
}
