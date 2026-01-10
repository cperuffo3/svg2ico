import { Module } from '@nestjs/common';
import { MetricsModule } from '../metrics/index.js';
import { WorkerPoolModule } from '../workers/worker-pool.module.js';
import { ConversionController } from './conversion.controller.js';
import { ConversionService } from './conversion.service.js';

@Module({
  imports: [MetricsModule, WorkerPoolModule],
  controllers: [ConversionController],
  providers: [ConversionService],
  exports: [ConversionService],
})
export class ConversionModule {}
