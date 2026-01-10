import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { usePerformanceStats } from '../hooks';
import type { PerformanceByFormat } from '../types';
import { StatCard } from './StatCard';

interface PerformanceDashboardProps {
  password: string;
  onAuthError: () => void;
}

const COLORS = [
  'hsl(221, 83%, 53%)',
  'hsl(142, 76%, 36%)',
  'hsl(38, 92%, 50%)',
  'hsl(0, 84%, 60%)',
  'hsl(262, 83%, 58%)',
];

interface BarChartData extends PerformanceByFormat {
  [key: string]: string | number;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

export function PerformanceDashboard({ password, onAuthError }: PerformanceDashboardProps) {
  const { data, isLoading, error } = usePerformanceStats(password);

  if (error?.message === 'UNAUTHORIZED') {
    onAuthError();
    return null;
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-card border rounded-lg p-4 animate-pulse">
              <div className="h-4 bg-muted rounded w-24 mb-2" />
              <div className="h-8 bg-muted rounded w-16" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-8 text-muted-foreground">Failed to load performance data</div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Average Processing Time"
          value={formatMs(data.avgProcessingTimeMs)}
          subtitle="Successful conversions"
        />
        <StatCard
          title="P50 Processing Time"
          value={formatMs(data.p50ProcessingTimeMs)}
          subtitle="Median"
        />
        <StatCard
          title="P90 Processing Time"
          value={formatMs(data.p90ProcessingTimeMs)}
          subtitle="90th percentile"
        />
        <StatCard
          title="P99 Processing Time"
          value={formatMs(data.p99ProcessingTimeMs)}
          subtitle="99th percentile"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Avg Input Size" value={formatBytes(data.avgInputSizeBytes)} />
        <StatCard title="Avg Output Size" value={formatBytes(data.avgOutputSizeBytes)} />
        <StatCard
          title="Compression Ratio"
          value={`${data.compressionRatio}x`}
          subtitle={
            data.compressionRatio < 1 ? 'Output smaller than input' : 'Output larger than input'
          }
        />
      </div>

      <div className="bg-card border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Processing Time by Output Format</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data.byFormat.map((f): BarChartData => ({ ...f }))}>
            <XAxis dataKey="format" tick={{ fill: 'currentColor' }} className="text-xs" />
            <YAxis
              tick={{ fill: 'currentColor' }}
              className="text-xs"
              tickFormatter={(v) => `${v}ms`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
              formatter={(value, _name, props) => {
                const payload = props.payload as BarChartData;
                return [
                  `${formatMs(Number(value))} (${payload.count.toLocaleString()} conversions)`,
                  'Avg Time',
                ];
              }}
            />
            <Bar dataKey="avgProcessingTimeMs" radius={[4, 4, 0, 0]}>
              {data.byFormat.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
