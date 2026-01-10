import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { ConversionJobData, ConversionJobResult, Job } from './types/worker-messages.js';

const DEFAULT_MAX_QUEUE_SIZE = 100;
const DEFAULT_JOB_TIMEOUT_MS = 30000;

@Injectable()
export class JobQueueService {
  private readonly logger = new Logger(JobQueueService.name);
  private queue: Job[] = [];
  private processing: Map<string, Job> = new Map();
  private maxQueueSize: number;
  private jobTimeoutMs: number;

  constructor() {
    this.maxQueueSize = DEFAULT_MAX_QUEUE_SIZE;
    this.jobTimeoutMs = DEFAULT_JOB_TIMEOUT_MS;
    this.logger.log(
      `Job queue initialized (max size: ${this.maxQueueSize}, timeout: ${this.jobTimeoutMs}ms)`,
    );
  }

  async enqueue(data: Omit<ConversionJobData, 'jobId'>): Promise<ConversionJobResult> {
    if (this.queue.length >= this.maxQueueSize) {
      this.logger.warn(`Queue full (${this.queue.length}/${this.maxQueueSize}), rejecting job`);
      throw new ServiceUnavailableException('Server is busy. Please try again later.');
    }

    const jobId = randomUUID();
    const jobData: ConversionJobData = { ...data, jobId };

    this.logger.debug(`Enqueueing job ${jobId} (queue size: ${this.queue.length + 1})`);

    return new Promise((resolve, reject) => {
      const job: Job = {
        id: jobId,
        data: jobData,
        status: 'pending',
        createdAt: new Date(),
        resolve,
        reject,
      };

      this.queue.push(job);

      // Set timeout for the job
      setTimeout(() => {
        if (job.status === 'pending' || job.status === 'processing') {
          this.logger.warn(`Job ${jobId} timed out after ${this.jobTimeoutMs}ms`);
          job.status = 'failed';
          this.removeJob(jobId);
          reject(new Error('Job timeout exceeded'));
        }
      }, this.jobTimeoutMs);
    });
  }

  getNextJob(): Job | undefined {
    const job = this.queue.shift();
    if (job) {
      job.status = 'processing';
      job.startedAt = new Date();
      this.processing.set(job.id, job);
    }
    return job;
  }

  completeJob(jobId: string, result: ConversionJobResult): void {
    const job = this.processing.get(jobId);
    if (job) {
      job.status = 'completed';
      job.completedAt = new Date();
      job.result = result;
      this.processing.delete(jobId);
      const duration =
        job.completedAt.getTime() - (job.startedAt?.getTime() ?? job.createdAt.getTime());
      this.logger.log(`Job ${jobId} completed in ${duration}ms`);
      job.resolve(result);
    }
  }

  failJob(jobId: string, error: Error): void {
    const job = this.processing.get(jobId);
    if (job) {
      job.status = 'failed';
      job.completedAt = new Date();
      this.processing.delete(jobId);
      this.logger.error(`Job ${jobId} failed: ${error.message}`);
      job.reject(error);
    }
  }

  private removeJob(jobId: string): void {
    const queueIndex = this.queue.findIndex((j) => j.id === jobId);
    if (queueIndex !== -1) {
      this.queue.splice(queueIndex, 1);
    }
    this.processing.delete(jobId);
  }

  getPendingCount(): number {
    return this.queue.length;
  }

  getProcessingCount(): number {
    return this.processing.size;
  }

  getStats(): { pending: number; processing: number; maxQueueSize: number } {
    return {
      pending: this.queue.length,
      processing: this.processing.size,
      maxQueueSize: this.maxQueueSize,
    };
  }
}
