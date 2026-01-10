import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import {
  ConfigurationsStats,
  ConversionsStats,
  FailureByOption,
  FailuresStats,
  FormatsStats,
  OptionDistribution,
  OverviewStats,
  PerformanceStats,
  SizeDistribution,
  TimeSeriesPoint,
} from './dto/admin-stats.dto.js';

interface ConversionOptionsJson {
  scale?: number;
  cornerRadius?: number;
  backgroundRemovalMode?: string;
  outputSize?: number;
  pngDpi?: number;
  pngColorspace?: string;
  pngColorDepth?: number;
  sourceWidth?: number;
  sourceHeight?: number;
}

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverviewStats(): Promise<OverviewStats> {
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [
      totalConversions,
      successfulConversions,
      failedConversions,
      last24HoursTotal,
      last24HoursSuccessful,
      last24HoursFailed,
      uniqueUsersResult,
    ] = await Promise.all([
      this.prisma.conversionMetric.count(),
      this.prisma.conversionMetric.count({ where: { success: true } }),
      this.prisma.conversionMetric.count({ where: { success: false } }),
      this.prisma.conversionMetric.count({
        where: { createdAt: { gte: last24Hours } },
      }),
      this.prisma.conversionMetric.count({
        where: { createdAt: { gte: last24Hours }, success: true },
      }),
      this.prisma.conversionMetric.count({
        where: { createdAt: { gte: last24Hours }, success: false },
      }),
      this.prisma.conversionMetric.groupBy({
        by: ['ipHash'],
        _count: { ipHash: true },
      }),
    ]);

    const successRate =
      totalConversions > 0
        ? Math.round((successfulConversions / totalConversions) * 10000) / 100
        : 0;

    return {
      totalConversions,
      successfulConversions,
      failedConversions,
      successRate,
      last24Hours: {
        total: last24HoursTotal,
        successful: last24HoursSuccessful,
        failed: last24HoursFailed,
      },
      uniqueUsers: uniqueUsersResult.length,
    };
  }

  async getConversionsStats(): Promise<ConversionsStats> {
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get all conversions for the time periods
    const [hourlyData, dailyData] = await Promise.all([
      this.prisma.conversionMetric.findMany({
        where: { createdAt: { gte: last24Hours } },
        select: { createdAt: true, success: true },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.conversionMetric.findMany({
        where: { createdAt: { gte: last30Days } },
        select: { createdAt: true, success: true },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    // Aggregate hourly data
    const hourlyMap = new Map<string, TimeSeriesPoint>();
    for (let i = 23; i >= 0; i--) {
      const hour = new Date(now.getTime() - i * 60 * 60 * 1000);
      hour.setMinutes(0, 0, 0);
      const key = hour.toISOString();
      hourlyMap.set(key, { timestamp: key, total: 0, successful: 0, failed: 0 });
    }

    for (const record of hourlyData) {
      const hour = new Date(record.createdAt);
      hour.setMinutes(0, 0, 0);
      const key = hour.toISOString();
      const point = hourlyMap.get(key);
      if (point) {
        point.total++;
        if (record.success) {
          point.successful++;
        } else {
          point.failed++;
        }
      }
    }

    // Aggregate daily data
    const dailyMap = new Map<string, TimeSeriesPoint>();
    for (let i = 29; i >= 0; i--) {
      const day = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      day.setHours(0, 0, 0, 0);
      const key = day.toISOString().split('T')[0];
      dailyMap.set(key, {
        timestamp: key,
        total: 0,
        successful: 0,
        failed: 0,
      });
    }

    for (const record of dailyData) {
      const day = new Date(record.createdAt);
      const key = day.toISOString().split('T')[0];
      const point = dailyMap.get(key);
      if (point) {
        point.total++;
        if (record.success) {
          point.successful++;
        } else {
          point.failed++;
        }
      }
    }

    return {
      hourly: Array.from(hourlyMap.values()),
      daily: Array.from(dailyMap.values()),
    };
  }

  async getFormatsStats(): Promise<FormatsStats> {
    const [inputFormatCounts, outputFormatCounts, totalCount, allInputSizes] = await Promise.all([
      this.prisma.conversionMetric.groupBy({
        by: ['inputFormat'],
        _count: { inputFormat: true },
      }),
      this.prisma.conversionMetric.groupBy({
        by: ['outputFormat'],
        _count: { outputFormat: true },
      }),
      this.prisma.conversionMetric.count(),
      this.prisma.conversionMetric.findMany({
        select: { inputSizeBytes: true },
      }),
    ]);

    const inputFormats = inputFormatCounts.map((item) => ({
      format: item.inputFormat,
      count: item._count.inputFormat,
      percentage:
        totalCount > 0 ? Math.round((item._count.inputFormat / totalCount) * 10000) / 100 : 0,
    }));

    const outputFormats = outputFormatCounts.map((item) => ({
      format: item.outputFormat,
      count: item._count.outputFormat,
      percentage:
        totalCount > 0 ? Math.round((item._count.outputFormat / totalCount) * 10000) / 100 : 0,
    }));

    // Calculate input size distribution
    const inputSizeDistribution = this.calculateSizeDistribution(
      allInputSizes.map((r) => r.inputSizeBytes),
      totalCount,
    );

    return { inputFormats, outputFormats, inputSizeDistribution };
  }

  private calculateSizeDistribution(sizes: number[], total: number): SizeDistribution[] {
    const ranges = [
      { min: 0, max: 1024, label: '< 1 KB' },
      { min: 1024, max: 10 * 1024, label: '1-10 KB' },
      { min: 10 * 1024, max: 50 * 1024, label: '10-50 KB' },
      { min: 50 * 1024, max: 100 * 1024, label: '50-100 KB' },
      { min: 100 * 1024, max: 500 * 1024, label: '100-500 KB' },
      { min: 500 * 1024, max: 1024 * 1024, label: '500 KB - 1 MB' },
      { min: 1024 * 1024, max: Infinity, label: '> 1 MB' },
    ];

    const counts = new Map<string, number>();
    ranges.forEach((r) => counts.set(r.label, 0));

    for (const size of sizes) {
      for (const range of ranges) {
        if (size >= range.min && size < range.max) {
          counts.set(range.label, (counts.get(range.label) ?? 0) + 1);
          break;
        }
      }
    }

    return ranges
      .map((range) => ({
        range: range.label,
        count: counts.get(range.label) ?? 0,
        percentage:
          total > 0 ? Math.round(((counts.get(range.label) ?? 0) / total) * 10000) / 100 : 0,
      }))
      .filter((r) => r.count > 0);
  }

  async getPerformanceStats(): Promise<PerformanceStats> {
    // Get all processing times for percentile calculations
    const allProcessingTimes = await this.prisma.conversionMetric.findMany({
      where: {
        success: true,
        processingTimeMs: { not: null },
      },
      select: { processingTimeMs: true },
      orderBy: { processingTimeMs: 'asc' },
    });

    const times = allProcessingTimes
      .map((r) => r.processingTimeMs)
      .filter((t): t is number => t !== null);

    const p50 = this.percentile(times, 50);
    const p90 = this.percentile(times, 90);
    const p99 = this.percentile(times, 99);
    const avg = times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;

    // Get by format breakdown
    const byFormatData = await this.prisma.conversionMetric.groupBy({
      by: ['outputFormat'],
      where: {
        success: true,
        processingTimeMs: { not: null },
      },
      _avg: { processingTimeMs: true },
      _count: { outputFormat: true },
    });

    const byFormat = byFormatData.map((item) => ({
      format: item.outputFormat,
      avgProcessingTimeMs: Math.round(item._avg.processingTimeMs ?? 0),
      count: item._count.outputFormat,
    }));

    // Get file size stats
    const sizeStats = await this.prisma.conversionMetric.aggregate({
      where: { success: true },
      _avg: {
        inputSizeBytes: true,
        outputSizeBytes: true,
      },
    });

    const avgInputSize = sizeStats._avg.inputSizeBytes ?? 0;
    const avgOutputSize = sizeStats._avg.outputSizeBytes ?? 0;
    const compressionRatio =
      avgInputSize > 0 ? Math.round((avgOutputSize / avgInputSize) * 100) / 100 : 0;

    return {
      avgProcessingTimeMs: Math.round(avg),
      p50ProcessingTimeMs: p50,
      p90ProcessingTimeMs: p90,
      p99ProcessingTimeMs: p99,
      byFormat,
      avgInputSizeBytes: Math.round(avgInputSize),
      avgOutputSizeBytes: Math.round(avgOutputSize),
      compressionRatio,
    };
  }

  private percentile(sortedArray: number[], p: number): number {
    if (sortedArray.length === 0) return 0;
    const index = Math.ceil((p / 100) * sortedArray.length) - 1;
    return sortedArray[Math.max(0, index)];
  }

  async getFailuresStats(): Promise<FailuresStats> {
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [
      totalConversions,
      totalFailures,
      last24HoursTotal,
      last24HoursFailures,
      errorGroupsRaw,
      failuresByConfigRaw,
      recentFailuresRaw,
      failuresWithOptions,
    ] = await Promise.all([
      this.prisma.conversionMetric.count(),
      this.prisma.conversionMetric.count({ where: { success: false } }),
      this.prisma.conversionMetric.count({
        where: { createdAt: { gte: last24Hours } },
      }),
      this.prisma.conversionMetric.count({
        where: { createdAt: { gte: last24Hours }, success: false },
      }),
      // Group failures by error message
      this.prisma.conversionMetric.groupBy({
        by: ['errorMessage'],
        where: { success: false },
        _count: { errorMessage: true },
        _max: { createdAt: true },
        orderBy: { _count: { errorMessage: 'desc' } },
        take: 10,
      }),
      // Group failures by input/output format combination
      this.prisma.conversionMetric.groupBy({
        by: ['inputFormat', 'outputFormat'],
        where: { success: false },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      }),
      // Get recent failures
      this.prisma.conversionMetric.findMany({
        where: { success: false },
        select: {
          id: true,
          inputFormat: true,
          outputFormat: true,
          inputSizeBytes: true,
          errorMessage: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      // Get failures with conversion options for option analysis
      this.prisma.conversionMetric.findMany({
        where: {
          success: false,
          conversionOptions: {
            not: { equals: null },
          },
        },
        select: {
          conversionOptions: true,
        },
      }),
    ]);

    const failureRate =
      totalConversions > 0 ? Math.round((totalFailures / totalConversions) * 10000) / 100 : 0;

    const last24HoursFailureRate =
      last24HoursTotal > 0 ? Math.round((last24HoursFailures / last24HoursTotal) * 10000) / 100 : 0;

    const errorGroups = errorGroupsRaw.map((item) => ({
      errorMessage: item.errorMessage ?? 'Unknown error',
      count: item._count.errorMessage,
      percentage:
        totalFailures > 0
          ? Math.round((item._count.errorMessage / totalFailures) * 10000) / 100
          : 0,
      lastOccurred: item._max.createdAt?.toISOString() ?? '',
    }));

    const failuresByConfig = failuresByConfigRaw.map((item) => ({
      inputFormat: item.inputFormat,
      outputFormat: item.outputFormat,
      count: item._count.id,
      percentage:
        totalFailures > 0 ? Math.round((item._count.id / totalFailures) * 10000) / 100 : 0,
    }));

    const recentFailures = recentFailuresRaw.map((item) => ({
      id: item.id,
      inputFormat: item.inputFormat,
      outputFormat: item.outputFormat,
      inputSizeBytes: item.inputSizeBytes,
      errorMessage: item.errorMessage,
      createdAt: item.createdAt.toISOString(),
    }));

    // Aggregate failures by option
    const failuresByOption = this.aggregateFailuresByOption(failuresWithOptions, totalFailures);

    return {
      totalFailures,
      failureRate,
      last24HoursFailures,
      last24HoursFailureRate,
      errorGroups,
      failuresByConfig,
      failuresByOption,
      recentFailures,
    };
  }

  private aggregateFailuresByOption(
    records: { conversionOptions: unknown }[],
    totalFailures: number,
  ): FailureByOption[] {
    const optionCounts = new Map<string, number>();

    for (const record of records) {
      const options = record.conversionOptions as ConversionOptionsJson | null;
      if (!options) continue;

      // Track each option value
      if (options.scale !== undefined) {
        const key = `scale:${this.getScaleLabel(options.scale)}`;
        optionCounts.set(key, (optionCounts.get(key) ?? 0) + 1);
      }

      if (options.cornerRadius !== undefined && options.cornerRadius > 0) {
        const key = `cornerRadius:${options.cornerRadius}%`;
        optionCounts.set(key, (optionCounts.get(key) ?? 0) + 1);
      }

      if (options.backgroundRemovalMode) {
        const key = `bgRemoval:${options.backgroundRemovalMode}`;
        optionCounts.set(key, (optionCounts.get(key) ?? 0) + 1);
      }

      if (options.outputSize !== undefined) {
        const key = `outputSize:${this.getOutputSizeLabel(options.outputSize)}`;
        optionCounts.set(key, (optionCounts.get(key) ?? 0) + 1);
      }

      if (options.pngDpi !== undefined) {
        const key = `pngDpi:${this.getDpiLabel(options.pngDpi)}`;
        optionCounts.set(key, (optionCounts.get(key) ?? 0) + 1);
      }

      if (options.pngColorspace) {
        const key = `pngColorspace:${options.pngColorspace}`;
        optionCounts.set(key, (optionCounts.get(key) ?? 0) + 1);
      }

      if (options.pngColorDepth !== undefined) {
        const key = `pngColorDepth:${options.pngColorDepth}-bit`;
        optionCounts.set(key, (optionCounts.get(key) ?? 0) + 1);
      }

      // Source dimensions
      if (options.sourceWidth !== undefined && options.sourceHeight !== undefined) {
        const key = `sourceResolution:${this.getResolutionLabel(options.sourceWidth, options.sourceHeight)}`;
        optionCounts.set(key, (optionCounts.get(key) ?? 0) + 1);
      }
    }

    // Convert to array and sort by count
    return Array.from(optionCounts.entries())
      .map(([key, count]) => {
        const [option, value] = key.split(':');
        return {
          option,
          value,
          count,
          percentage: totalFailures > 0 ? Math.round((count / totalFailures) * 10000) / 100 : 0,
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 15); // Top 15 options
  }

  async getConfigurationsStats(): Promise<ConfigurationsStats> {
    // Get all records with conversion options
    const records = await this.prisma.conversionMetric.findMany({
      where: {
        conversionOptions: {
          not: { equals: null },
        },
      },
      select: {
        conversionOptions: true,
      },
    });

    const totalWithOptions = records.length;

    // Aggregate each option
    const scaleMap = new Map<string, number>();
    const cornerRadiusMap = new Map<string, number>();
    const bgRemovalMap = new Map<string, number>();
    const outputSizeMap = new Map<string, number>();
    const pngDpiMap = new Map<string, number>();
    const pngColorspaceMap = new Map<string, number>();
    const pngColorDepthMap = new Map<string, number>();
    const sourceResolutionMap = new Map<string, number>();

    for (const record of records) {
      const options = record.conversionOptions as ConversionOptionsJson | null;
      if (!options) continue;

      // Scale - group into ranges
      if (options.scale !== undefined) {
        const scaleLabel = this.getScaleLabel(options.scale);
        scaleMap.set(scaleLabel, (scaleMap.get(scaleLabel) ?? 0) + 1);
      }

      // Corner radius
      if (options.cornerRadius !== undefined) {
        const label = `${options.cornerRadius}%`;
        cornerRadiusMap.set(label, (cornerRadiusMap.get(label) ?? 0) + 1);
      }

      // Background removal mode
      if (options.backgroundRemovalMode) {
        bgRemovalMap.set(
          options.backgroundRemovalMode,
          (bgRemovalMap.get(options.backgroundRemovalMode) ?? 0) + 1,
        );
      }

      // Output size - group into ranges
      if (options.outputSize !== undefined) {
        const sizeLabel = this.getOutputSizeLabel(options.outputSize);
        outputSizeMap.set(sizeLabel, (outputSizeMap.get(sizeLabel) ?? 0) + 1);
      }

      // PNG DPI - group into ranges
      if (options.pngDpi !== undefined) {
        const dpiLabel = this.getDpiLabel(options.pngDpi);
        pngDpiMap.set(dpiLabel, (pngDpiMap.get(dpiLabel) ?? 0) + 1);
      }

      // PNG Colorspace
      if (options.pngColorspace) {
        pngColorspaceMap.set(
          options.pngColorspace,
          (pngColorspaceMap.get(options.pngColorspace) ?? 0) + 1,
        );
      }

      // PNG Color depth
      if (options.pngColorDepth !== undefined) {
        const label = `${options.pngColorDepth}-bit`;
        pngColorDepthMap.set(label, (pngColorDepthMap.get(label) ?? 0) + 1);
      }

      // Source resolution
      if (options.sourceWidth !== undefined && options.sourceHeight !== undefined) {
        const label = this.getResolutionLabel(options.sourceWidth, options.sourceHeight);
        sourceResolutionMap.set(label, (sourceResolutionMap.get(label) ?? 0) + 1);
      }
    }

    return {
      totalWithOptions,
      scaleDistribution: this.mapToDistribution(scaleMap, totalWithOptions),
      cornerRadiusDistribution: this.mapToDistribution(cornerRadiusMap, totalWithOptions),
      backgroundRemovalDistribution: this.mapToDistribution(bgRemovalMap, totalWithOptions),
      outputSizeDistribution: this.mapToDistribution(outputSizeMap, totalWithOptions),
      pngDpiDistribution: this.mapToDistribution(pngDpiMap, totalWithOptions),
      pngColorspaceDistribution: this.mapToDistribution(pngColorspaceMap, totalWithOptions),
      pngColorDepthDistribution: this.mapToDistribution(pngColorDepthMap, totalWithOptions),
      sourceResolutionDistribution: this.mapToDistribution(sourceResolutionMap, totalWithOptions),
    };
  }

  private getScaleLabel(scale: number): string {
    if (scale < 75) return '50-74%';
    if (scale < 100) return '75-99%';
    if (scale === 100) return '100%';
    if (scale <= 125) return '101-125%';
    if (scale <= 150) return '126-150%';
    return '151-200%';
  }

  private getOutputSizeLabel(size: number): string {
    if (size <= 64) return '16-64px';
    if (size <= 128) return '65-128px';
    if (size <= 256) return '129-256px';
    if (size <= 512) return '257-512px';
    if (size <= 1024) return '513-1024px';
    return '1025-2048px';
  }

  private getDpiLabel(dpi: number): string {
    if (dpi <= 72) return '72 DPI';
    if (dpi <= 96) return '96 DPI';
    if (dpi <= 150) return '150 DPI';
    if (dpi <= 300) return '300 DPI';
    return '300+ DPI';
  }

  private getResolutionLabel(width: number, height: number): string {
    const maxDim = Math.max(width, height);
    if (maxDim <= 64) return 'Tiny (≤64px)';
    if (maxDim <= 128) return 'Small (65-128px)';
    if (maxDim <= 256) return 'Medium (129-256px)';
    if (maxDim <= 512) return 'Large (257-512px)';
    if (maxDim <= 1024) return 'XL (513-1024px)';
    if (maxDim <= 2048) return '2K (1025-2048px)';
    return '4K+ (>2048px)';
  }

  private mapToDistribution(map: Map<string, number>, total: number): OptionDistribution[] {
    return Array.from(map.entries())
      .map(([value, count]) => ({
        value,
        count,
        percentage: total > 0 ? Math.round((count / total) * 10000) / 100 : 0,
      }))
      .sort((a, b) => b.count - a.count);
  }
}
