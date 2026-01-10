export interface OverviewStats {
  totalConversions: number;
  successfulConversions: number;
  failedConversions: number;
  successRate: number;
  last24Hours: {
    total: number;
    successful: number;
    failed: number;
  };
  uniqueUsers: number;
}

export interface TimeSeriesPoint {
  timestamp: string;
  total: number;
  successful: number;
  failed: number;
}

export interface ConversionsStats {
  hourly: TimeSeriesPoint[];
  daily: TimeSeriesPoint[];
}

export interface FormatDistribution {
  format: string;
  count: number;
  percentage: number;
}

export interface SizeDistribution {
  range: string;
  count: number;
  percentage: number;
}

export interface FormatsStats {
  inputFormats: FormatDistribution[];
  outputFormats: FormatDistribution[];
  inputSizeDistribution: SizeDistribution[];
}

export interface PerformanceByFormat {
  format: string;
  avgProcessingTimeMs: number;
  count: number;
}

export interface PerformanceStats {
  avgProcessingTimeMs: number;
  p50ProcessingTimeMs: number;
  p90ProcessingTimeMs: number;
  p99ProcessingTimeMs: number;
  byFormat: PerformanceByFormat[];
  avgInputSizeBytes: number;
  avgOutputSizeBytes: number;
  compressionRatio: number;
}

export interface ErrorGroup {
  errorMessage: string;
  count: number;
  percentage: number;
  lastOccurred: string;
}

export interface FailureByConfig {
  inputFormat: string;
  outputFormat: string;
  count: number;
  percentage: number;
}

export interface RecentFailure {
  id: string;
  inputFormat: string;
  outputFormat: string;
  inputSizeBytes: number;
  errorMessage: string | null;
  createdAt: string;
}

export interface FailureByOption {
  option: string;
  value: string;
  count: number;
  percentage: number;
}

export interface FailuresStats {
  totalFailures: number;
  failureRate: number;
  last24HoursFailures: number;
  last24HoursFailureRate: number;
  errorGroups: ErrorGroup[];
  failuresByConfig: FailureByConfig[];
  failuresByOption: FailureByOption[];
  recentFailures: RecentFailure[];
}

export interface OptionDistribution {
  value: string;
  count: number;
  percentage: number;
}

export interface ConfigurationsStats {
  totalWithOptions: number;
  scaleDistribution: OptionDistribution[];
  cornerRadiusDistribution: OptionDistribution[];
  backgroundRemovalDistribution: OptionDistribution[];
  outputSizeDistribution: OptionDistribution[];
  pngDpiDistribution: OptionDistribution[];
  pngColorspaceDistribution: OptionDistribution[];
  pngColorDepthDistribution: OptionDistribution[];
  sourceResolutionDistribution: OptionDistribution[];
}
