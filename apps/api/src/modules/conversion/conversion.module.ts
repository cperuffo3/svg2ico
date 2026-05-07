import { Module } from '@nestjs/common';
import { MetricsModule } from '../metrics/index.js';
import { RateLimitModule } from '../rate-limit/index.js';
import { WorkerPoolModule } from '../workers/worker-pool.module.js';
import { ConversionController } from './conversion.controller.js';
import { ConversionService } from './conversion.service.js';

@Module({
  imports: [MetricsModule, RateLimitModule, WorkerPoolModule],
  controllers: [ConversionController],
  providers: [ConversionService],
  exports: [ConversionService],
})
export class ConversionModule {}
