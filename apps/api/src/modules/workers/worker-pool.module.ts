import { Module } from '@nestjs/common';
import { JobQueueService } from './job-queue.service.js';
import { WorkerPoolService } from './worker-pool.service.js';

@Module({
  providers: [JobQueueService, WorkerPoolService],
  exports: [WorkerPoolService],
})
export class WorkerPoolModule {}
