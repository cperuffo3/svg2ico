import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ThrottlerStorage } from '@nestjs/throttler';
import { ThrottlerStorageRecord } from '@nestjs/throttler/dist/throttler-storage-record.interface.js';
import { createHash } from 'crypto';
import { PrismaService } from '../../common/index.js';

@Injectable()
export class PrismaThrottlerStorage implements ThrottlerStorage, OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaThrottlerStorage.name);
  private cleanupInterval: NodeJS.Timeout;

  constructor(private readonly prisma: PrismaService) {
    // Clean up expired records every 5 minutes
    this.cleanupInterval = setInterval(() => this.cleanupExpired(), 5 * 60 * 1000);
  }

  onModuleInit(): void {
    this.logger.log('Rate limit storage initialized');
  }

  onModuleDestroy(): void {
    this.logger.log('Rate limit storage shutting down');
    clearInterval(this.cleanupInterval);
  }

  private hashKey(key: string): string {
    return createHash('sha256').update(key).digest('hex').substring(0, 16);
  }

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    _throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    const ipHash = this.hashKey(key);
    const now = new Date();
    const windowStart = new Date(now.getTime());
    const expiresAt = new Date(now.getTime() + ttl);

    const existing = await this.prisma.rateLimit.findUnique({
      where: { ipHash },
    });

    if (existing) {
      // Check if the window has expired
      if (existing.expiresAt < now) {
        // Reset the counter for a new window
        const updated = await this.prisma.rateLimit.update({
          where: { ipHash },
          data: {
            count: 1,
            windowStart,
            expiresAt,
          },
        });

        return {
          totalHits: updated.count,
          timeToExpire: ttl,
          isBlocked: false,
          timeToBlockExpire: 0,
        };
      }

      // Increment within the existing window
      const updated = await this.prisma.rateLimit.update({
        where: { ipHash },
        data: {
          count: { increment: 1 },
        },
      });

      const timeToExpire = Math.max(0, existing.expiresAt.getTime() - now.getTime());
      const isBlocked = updated.count > limit;

      if (isBlocked) {
        this.logger.warn(`Rate limit exceeded for ${ipHash} (${updated.count}/${limit} hits)`);
      }

      return {
        totalHits: updated.count,
        timeToExpire,
        isBlocked,
        timeToBlockExpire: isBlocked ? blockDuration : 0,
      };
    }

    // Create new record
    this.logger.debug(`New rate limit tracking started for ${ipHash}`);
    const created = await this.prisma.rateLimit.create({
      data: {
        ipHash,
        count: 1,
        windowStart,
        expiresAt,
      },
    });

    return {
      totalHits: created.count,
      timeToExpire: ttl,
      isBlocked: false,
      timeToBlockExpire: 0,
    };
  }

  private async cleanupExpired(): Promise<void> {
    try {
      const result = await this.prisma.rateLimit.deleteMany({
        where: {
          expiresAt: { lt: new Date() },
        },
      });
      if (result.count > 0) {
        this.logger.debug(`Cleaned up ${result.count} expired rate limit records`);
      }
    } catch (error) {
      this.logger.error(`Failed to cleanup expired rate limits: ${error}`);
    }
  }
}
