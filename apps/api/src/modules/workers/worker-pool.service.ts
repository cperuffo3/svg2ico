import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { cpus } from 'os';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { Worker } from 'worker_threads';
import { JobQueueService } from './job-queue.service.js';
import type {
  ConversionJobData,
  ConversionJobResult,
  WorkerMessage,
  WorkerResponse,
} from './types/worker-messages.js';

interface WorkerInfo {
  worker: Worker;
  busy: boolean;
  jobId?: string;
}

@Injectable()
export class WorkerPoolService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WorkerPoolService.name);
  private workers: WorkerInfo[] = [];
  private poolSize: number;
  private workerPath: string;

  constructor(private readonly jobQueue: JobQueueService) {
    this.poolSize = Math.max(1, cpus().length - 1);
    // Get the path to the worker file
    const currentFile = fileURLToPath(import.meta.url);
    const currentDir = dirname(currentFile);
    this.workerPath = join(currentDir, 'conversion.worker.js');
  }

  async onModuleInit(): Promise<void> {
    this.logger.log(`Initializing worker pool with ${this.poolSize} workers`);
    await this.initializeWorkers();
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.log('Shutting down worker pool');
    await this.shutdownWorkers();
  }

  private async initializeWorkers(): Promise<void> {
    const initPromises = Array.from({ length: this.poolSize }, () => this.spawnWorker());
    await Promise.all(initPromises);
    this.logger.log(`Worker pool initialized with ${this.workers.length} workers`);
  }

  private async spawnWorker(): Promise<void> {
    return new Promise((resolve, reject) => {
      const worker = new Worker(this.workerPath);
      const workerInfo: WorkerInfo = { worker, busy: false };

      worker.on('message', (response: WorkerResponse) => {
        if (response.type === 'ready') {
          this.workers.push(workerInfo);
          resolve();
          this.processNextJob();
        } else if (response.type === 'result') {
          this.handleJobResult(workerInfo, response.data);
        } else if (response.type === 'error') {
          this.handleWorkerError(workerInfo, response.error, response.jobId);
        } else if (response.type === 'log') {
          this.handleWorkerLog(response.level, response.message);
        }
      });

      worker.on('error', (error: Error) => {
        this.logger.error(`Worker error: ${error.message}`);
        this.handleWorkerCrash(workerInfo);
        if (this.workers.length === 0) {
          reject(error);
        }
      });

      worker.on('exit', (code) => {
        if (code !== 0) {
          this.logger.warn(`Worker exited with code ${code}`);
          this.handleWorkerCrash(workerInfo);
        }
      });
    });
  }

  private handleJobResult(workerInfo: WorkerInfo, result: ConversionJobResult): void {
    const jobId = workerInfo.jobId;
    workerInfo.busy = false;
    workerInfo.jobId = undefined;

    if (jobId) {
      this.jobQueue.completeJob(jobId, result);
    }

    this.processNextJob();
  }

  private handleWorkerError(workerInfo: WorkerInfo, error: string, jobId?: string): void {
    workerInfo.busy = false;
    workerInfo.jobId = undefined;

    if (jobId) {
      this.jobQueue.failJob(jobId, new Error(error));
    }

    this.processNextJob();
  }

  private handleWorkerLog(level: 'log' | 'debug' | 'warn' | 'error', message: string): void {
    switch (level) {
      case 'debug':
        this.logger.debug(message);
        break;
      case 'warn':
        this.logger.warn(message);
        break;
      case 'error':
        this.logger.error(message);
        break;
      default:
        this.logger.log(message);
    }
  }

  private async handleWorkerCrash(workerInfo: WorkerInfo): Promise<void> {
    const index = this.workers.indexOf(workerInfo);
    if (index !== -1) {
      this.workers.splice(index, 1);
    }

    // Fail the job if the worker was processing one
    if (workerInfo.jobId) {
      this.jobQueue.failJob(workerInfo.jobId, new Error('Worker crashed'));
    }

    // Respawn the worker
    try {
      await this.spawnWorker();
      this.logger.log('Worker respawned successfully');
    } catch (error) {
      this.logger.error(`Failed to respawn worker: ${error}`);
    }
  }

  private processNextJob(): void {
    const availableWorker = this.workers.find((w) => !w.busy);
    if (!availableWorker) {
      return;
    }

    const job = this.jobQueue.getNextJob();
    if (!job) {
      return;
    }

    availableWorker.busy = true;
    availableWorker.jobId = job.id;

    const message: WorkerMessage = { type: 'job', data: job.data };
    availableWorker.worker.postMessage(message);
  }

  async submitJob(data: Omit<ConversionJobData, 'jobId'>): Promise<ConversionJobResult> {
    const resultPromise = this.jobQueue.enqueue(data);
    this.processNextJob();
    return resultPromise;
  }

  private async shutdownWorkers(): Promise<void> {
    const shutdownPromises = this.workers.map((workerInfo) => {
      return new Promise<void>((resolve) => {
        const message: WorkerMessage = { type: 'shutdown' };
        workerInfo.worker.postMessage(message);

        const timeout = setTimeout(() => {
          workerInfo.worker.terminate();
          resolve();
        }, 5000);

        workerInfo.worker.once('exit', () => {
          clearTimeout(timeout);
          resolve();
        });
      });
    });

    await Promise.all(shutdownPromises);
    this.workers = [];
  }

  getPoolStats(): {
    poolSize: number;
    busyWorkers: number;
    availableWorkers: number;
    queueStats: { pending: number; processing: number; maxQueueSize: number };
  } {
    const busyWorkers = this.workers.filter((w) => w.busy).length;
    return {
      poolSize: this.workers.length,
      busyWorkers,
      availableWorkers: this.workers.length - busyWorkers,
      queueStats: this.jobQueue.getStats(),
    };
  }
}
