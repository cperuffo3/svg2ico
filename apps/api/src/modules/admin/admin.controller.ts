import { Controller, Delete, Get, Logger, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AdminGuard } from './admin.guard.js';
import { AdminService } from './admin.service.js';
import {
  ConfigurationsStats,
  ConversionsStats,
  FailuresStats,
  FormatsStats,
  OverviewStats,
  PerformanceStats,
} from './dto/admin-stats.dto.js';

@ApiTags('Admin')
@Controller('admin')
@UseGuards(AdminGuard)
@ApiHeader({
  name: 'x-admin-password',
  description: 'Admin password for authentication',
  required: true,
})
export class AdminController {
  private readonly logger = new Logger(AdminController.name);

  constructor(private readonly adminService: AdminService) {}

  @Get('stats/overview')
  @ApiOperation({
    summary: 'Get overview statistics',
    description: 'Returns high-level statistics about conversions',
  })
  @ApiResponse({ status: 200, description: 'Overview statistics' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getOverviewStats(): Promise<OverviewStats> {
    this.logger.log('Fetching overview stats');
    return this.adminService.getOverviewStats();
  }

  @Get('stats/conversions')
  @ApiOperation({
    summary: 'Get conversions time series',
    description: 'Returns hourly and daily conversion counts',
  })
  @ApiResponse({ status: 200, description: 'Conversions time series data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getConversionsStats(): Promise<ConversionsStats> {
    this.logger.log('Fetching conversions stats');
    return this.adminService.getConversionsStats();
  }

  @Get('stats/formats')
  @ApiOperation({
    summary: 'Get format distribution',
    description: 'Returns input and output format distribution',
  })
  @ApiResponse({ status: 200, description: 'Format distribution data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getFormatsStats(): Promise<FormatsStats> {
    this.logger.log('Fetching formats stats');
    return this.adminService.getFormatsStats();
  }

  @Get('stats/performance')
  @ApiOperation({
    summary: 'Get performance statistics',
    description: 'Returns processing times and file size metrics',
  })
  @ApiResponse({ status: 200, description: 'Performance statistics' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getPerformanceStats(): Promise<PerformanceStats> {
    this.logger.log('Fetching performance stats');
    return this.adminService.getPerformanceStats();
  }

  @Get('stats/failures')
  @ApiOperation({
    summary: 'Get failure statistics',
    description: 'Returns failure details, error groups, and common failure configurations',
  })
  @ApiResponse({ status: 200, description: 'Failure statistics' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getFailuresStats(): Promise<FailuresStats> {
    this.logger.log('Fetching failures stats');
    return this.adminService.getFailuresStats();
  }

  @Get('stats/configurations')
  @ApiOperation({
    summary: 'Get configuration usage statistics',
    description: 'Returns distribution of conversion options used',
  })
  @ApiResponse({ status: 200, description: 'Configuration statistics' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getConfigurationsStats(): Promise<ConfigurationsStats> {
    this.logger.log('Fetching configurations stats');
    return this.adminService.getConfigurationsStats();
  }

  @Delete('stats/failures')
  @ApiOperation({
    summary: 'Reset failure statistics',
    description: 'Deletes all failed conversion records while keeping successful conversions intact',
  })
  @ApiResponse({ status: 200, description: 'Number of deleted failure records' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async resetFailuresStats(): Promise<{ deletedCount: number }> {
    this.logger.log('Resetting failures stats');
    return this.adminService.resetFailuresStats();
  }
}
