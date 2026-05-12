import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  ErrorSubmissionDetailDto,
  ErrorSubmissionSummaryDto,
  ErrorSubmissionsService,
  UpdateErrorSubmissionDto,
} from '../error-submissions/index.js';
import { AdminGuard } from './admin.guard.js';
import { AdminService } from './admin.service.js';
import {
  ConfigurationsStats,
  ConversionsStats,
  FailuresStats,
  FormatsStats,
  OverviewStats,
  PerformanceStats,
  UserConversionsResponse,
  UsersStats,
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

  constructor(
    private readonly adminService: AdminService,
    private readonly errorSubmissions: ErrorSubmissionsService,
  ) {}

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

  @Get('stats/users')
  @ApiOperation({
    summary: 'Get user growth statistics',
    description: 'Returns daily new and cumulative unique user counts over the lifetime of the app',
  })
  @ApiQuery({
    name: 'tz',
    required: false,
    description: 'IANA timezone (e.g. America/Los_Angeles) used to bucket daily counts',
  })
  @ApiResponse({ status: 200, description: 'User growth time series data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getUsersStats(@Query('tz') tz?: string): Promise<UsersStats> {
    this.logger.log('Fetching users stats');
    return this.adminService.getUsersStats(tz);
  }

  @Get('stats/users/conversions')
  @ApiOperation({
    summary: 'Get per-user conversion counts',
    description:
      'Returns conversion counts grouped by user, sorted by total conversions descending',
  })
  @ApiQuery({
    name: 'tz',
    required: false,
    description: 'IANA timezone used to bucket per-day activity',
  })
  @ApiResponse({ status: 200, description: 'Per-user conversion counts' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getUserConversionCounts(@Query('tz') tz?: string): Promise<UserConversionsResponse> {
    this.logger.log('Fetching user conversion counts');
    return this.adminService.getUserConversionCounts(tz);
  }

  @Get('stats/conversions')
  @ApiOperation({
    summary: 'Get conversions time series',
    description: 'Returns hourly and daily conversion counts',
  })
  @ApiQuery({
    name: 'tz',
    required: false,
    description: 'IANA timezone used to bucket daily counts',
  })
  @ApiResponse({ status: 200, description: 'Conversions time series data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getConversionsStats(@Query('tz') tz?: string): Promise<ConversionsStats> {
    this.logger.log('Fetching conversions stats');
    return this.adminService.getConversionsStats(tz);
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
    description:
      'Deletes all failed conversion records while keeping successful conversions intact',
  })
  @ApiResponse({ status: 200, description: 'Number of deleted failure records' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async resetFailuresStats(): Promise<{ deletedCount: number }> {
    this.logger.log('Resetting failures stats');
    return this.adminService.resetFailuresStats();
  }

  @Get('error-submissions')
  @ApiOperation({
    summary: 'List user-submitted error files',
    description: 'Returns SVG files that users opted to submit when conversion failed',
  })
  @ApiQuery({ name: 'reviewed', required: false, type: Boolean })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of error submissions' })
  async listErrorSubmissions(
    @Query('reviewed') reviewed?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ): Promise<{ items: ErrorSubmissionSummaryDto[]; total: number; unreviewed: number }> {
    const reviewedFilter =
      reviewed === undefined || reviewed === '' ? undefined : reviewed === 'true';
    const [list, stats] = await Promise.all([
      this.errorSubmissions.list({
        reviewed: reviewedFilter,
        limit: limit ? parseInt(limit, 10) : undefined,
        offset: offset ? parseInt(offset, 10) : undefined,
      }),
      this.errorSubmissions.getStats(),
    ]);
    return { ...list, unreviewed: stats.unreviewed };
  }

  @Get('error-submissions/:id')
  @ApiOperation({ summary: 'Get a single error submission with the SVG content' })
  @ApiResponse({ status: 200, description: 'Submission detail' })
  @ApiResponse({ status: 404, description: 'Submission not found' })
  async getErrorSubmission(@Param('id') id: string): Promise<ErrorSubmissionDetailDto> {
    return this.errorSubmissions.getById(id);
  }

  @Patch('error-submissions/:id')
  @ApiOperation({ summary: 'Update review status / reviewer notes for a submission' })
  @ApiResponse({ status: 200, description: 'Updated submission detail' })
  async updateErrorSubmission(
    @Param('id') id: string,
    @Body() body: UpdateErrorSubmissionDto,
  ): Promise<ErrorSubmissionDetailDto> {
    return this.errorSubmissions.update(id, body);
  }

  @Delete('error-submissions/:id')
  @ApiOperation({ summary: 'Delete a submission' })
  @ApiResponse({ status: 200, description: 'Deletion confirmation' })
  async deleteErrorSubmission(@Param('id') id: string): Promise<{ deleted: boolean }> {
    return this.errorSubmissions.delete(id);
  }
}
