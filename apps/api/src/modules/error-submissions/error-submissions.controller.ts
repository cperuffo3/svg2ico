import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { getClientId } from '../../common/client-id/index.js';
import { CfThrottlerGuard } from '../rate-limit/index.js';
import { CreateErrorSubmissionDto } from './dto/create-error-submission.dto.js';
import { ErrorSubmissionsService } from './error-submissions.service.js';

@ApiTags('Conversion')
@Controller('convert/error-submissions')
@UseGuards(CfThrottlerGuard)
export class ErrorSubmissionsController {
  constructor(private readonly service: ErrorSubmissionsService) {}

  @Post()
  @ApiOperation({
    summary: 'Submit a failed SVG for admin review',
    description:
      'Stores the original SVG content along with the error that occurred during conversion. ' +
      'Submission is opt-in by the user.',
  })
  @ApiResponse({ status: 201, description: 'Submission stored' })
  @ApiResponse({ status: 400, description: 'Invalid submission payload' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  async create(
    @Body() dto: CreateErrorSubmissionDto,
    @Req() req: Request,
  ): Promise<{ id: string }> {
    const clientId = getClientId(req) ?? null;
    return this.service.create(dto, clientId);
  }
}
