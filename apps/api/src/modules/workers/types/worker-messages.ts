import type {
  BackgroundRemovalMode,
  OutputFormat,
  RoundnessValue,
} from '../../conversion/dto/convert.dto.js';

export interface ConversionJobData {
  jobId: string;
  svgBuffer: Buffer;
  originalFilename: string;
  format: OutputFormat;
  scale: number;
  cornerRadius: RoundnessValue;
  backgroundRemovalMode: BackgroundRemovalMode;
  backgroundRemovalColor?: string;
  outputSize: number;
}

export interface ConversionJobResult {
  jobId: string;
  success: boolean;
  results?: {
    buffer: Buffer;
    filename: string;
    mimeType: string;
  }[];
  error?: string;
  processingTimeMs: number;
}

export type WorkerMessage = { type: 'job'; data: ConversionJobData } | { type: 'shutdown' };

export type WorkerLogLevel = 'log' | 'debug' | 'verbose' | 'warn' | 'error';

export type WorkerResponse =
  | { type: 'ready' }
  | { type: 'result'; data: ConversionJobResult }
  | { type: 'error'; error: string; jobId?: string }
  | { type: 'log'; level: WorkerLogLevel; message: string; jobId?: string };

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface Job {
  id: string;
  data: ConversionJobData;
  status: JobStatus;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  result?: ConversionJobResult;
  resolve: (result: ConversionJobResult) => void;
  reject: (error: Error) => void;
}
