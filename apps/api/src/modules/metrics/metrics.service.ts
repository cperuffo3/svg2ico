import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from '../../common/prisma/prisma.service.js';

export interface ConversionMetricData {
  ipAddress: string;
  inputFormat: string;
  outputFormat: string;
  inputSizeBytes: number;
  outputSizeBytes?: number;
  processingTimeMs?: number;
  success: boolean;
  errorMessage?: string;
}

export interface MetricsSummary {
  totalConversions: number;
  successfulConversions: number;
  failedConversions: number;
  averageProcessingTimeMs: number;
  conversionsByFormat: Record<string, number>;
  last24Hours: {
    total: number;
    successful: number;
    failed: number;
  };
}

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async logConversion(data: ConversionMetricData): Promise<void> {
    try {
      const ipHash = this.hashIp(data.ipAddress);

      await this.prisma.conversionMetric.create({
        data: {
          ipHash,
          inputFormat: data.inputFormat,
          outputFormat: data.outputFormat,
          inputSizeBytes: data.inputSizeBytes,
          outputSizeBytes: data.outputSizeBytes,
          processingTimeMs: data.processingTimeMs,
          success: data.success,
          errorMessage: data.errorMessage,
        },
      });
    } catch (error) {
      // Log but don't throw - metrics should not break conversion
      this.logger.error(`Failed to log conversion metric: ${error}`);
    }
  }

  async getMetricsSummary(): Promise<MetricsSummary> {
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [
      totalConversions,
      successfulConversions,
      failedConversions,
      avgProcessingTime,
      formatCounts,
      last24HoursTotal,
      last24HoursSuccessful,
      last24HoursFailed,
    ] = await Promise.all([
      this.prisma.conversionMetric.count(),
      this.prisma.conversionMetric.count({ where: { success: true } }),
      this.prisma.conversionMetric.count({ where: { success: false } }),
      this.prisma.conversionMetric.aggregate({
        _avg: { processingTimeMs: true },
        where: { success: true },
      }),
      this.prisma.conversionMetric.groupBy({
        by: ['outputFormat'],
        _count: { outputFormat: true },
      }),
      this.prisma.conversionMetric.count({
        where: { createdAt: { gte: last24Hours } },
      }),
      this.prisma.conversionMetric.count({
        where: { createdAt: { gte: last24Hours }, success: true },
      }),
      this.prisma.conversionMetric.count({
        where: { createdAt: { gte: last24Hours }, success: false },
      }),
    ]);

    const conversionsByFormat: Record<string, number> = {};
    for (const item of formatCounts) {
      conversionsByFormat[item.outputFormat] = item._count.outputFormat;
    }

    return {
      totalConversions,
      successfulConversions,
      failedConversions,
      averageProcessingTimeMs: avgProcessingTime._avg.processingTimeMs ?? 0,
      conversionsByFormat,
      last24Hours: {
        total: last24HoursTotal,
        successful: last24HoursSuccessful,
        failed: last24HoursFailed,
      },
    };
  }

  private hashIp(ip: string): string {
    return createHash('sha256').update(ip).digest('hex').substring(0, 16);
  }
}
