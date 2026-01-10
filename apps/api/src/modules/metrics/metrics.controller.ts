import { Controller, Get, Logger } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { MetricsService, MetricsSummary } from './metrics.service.js';

@ApiTags('Metrics')
@Controller('metrics')
export class MetricsController {
  private readonly logger = new Logger(MetricsController.name);

  constructor(private readonly metricsService: MetricsService) {}

  @Get()
  @ApiOperation({
    summary: 'Get conversion metrics',
    description: 'Returns aggregate statistics about conversions (admin endpoint)',
  })
  @ApiResponse({
    status: 200,
    description: 'Metrics summary',
    schema: {
      type: 'object',
      properties: {
        totalConversions: { type: 'number', example: 1000 },
        successfulConversions: { type: 'number', example: 950 },
        failedConversions: { type: 'number', example: 50 },
        averageProcessingTimeMs: { type: 'number', example: 150 },
        conversionsByFormat: {
          type: 'object',
          example: { ico: 600, icns: 300, both: 100 },
        },
        last24Hours: {
          type: 'object',
          properties: {
            total: { type: 'number', example: 100 },
            successful: { type: 'number', example: 95 },
            failed: { type: 'number', example: 5 },
          },
        },
      },
    },
  })
  async getMetrics(): Promise<MetricsSummary> {
    this.logger.log('Fetching metrics summary');
    const summary = await this.metricsService.getMetricsSummary();
    this.logger.debug(
      `Metrics: ${summary.totalConversions} total, ${summary.successfulConversions} successful, ${summary.failedConversions} failed`,
    );
    return summary;
  }
}
