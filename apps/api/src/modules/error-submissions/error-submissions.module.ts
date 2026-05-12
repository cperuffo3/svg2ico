import { Module } from '@nestjs/common';
import { RateLimitModule } from '../rate-limit/index.js';
import { ErrorSubmissionsController } from './error-submissions.controller.js';
import { ErrorSubmissionsService } from './error-submissions.service.js';

@Module({
  imports: [RateLimitModule],
  controllers: [ErrorSubmissionsController],
  providers: [ErrorSubmissionsService],
  exports: [ErrorSubmissionsService],
})
export class ErrorSubmissionsModule {}
