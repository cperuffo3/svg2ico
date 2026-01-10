import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useFailuresStats } from '../hooks';
import type { FailureByConfig, FailureByOption } from '../types';
import { StatCard } from './StatCard';

interface FailuresDashboardProps {
  password: string;
  onAuthError: () => void;
}

const COLORS = [
  'hsl(0, 84%, 60%)',
  'hsl(25, 95%, 53%)',
  'hsl(38, 92%, 50%)',
  'hsl(262, 83%, 58%)',
  'hsl(221, 83%, 53%)',
];

interface BarChartData extends FailureByConfig {
  [key: string]: string | number;
  label: string;
}

interface OptionChartData extends FailureByOption {
  [key: string]: string | number;
  label: string;
}

const OPTION_LABELS: Record<string, string> = {
  scale: 'Scale',
  cornerRadius: 'Corner Radius',
  bgRemoval: 'BG Removal',
  outputSize: 'Output Size',
  pngDpi: 'PNG DPI',
  pngColorspace: 'Colorspace',
  pngColorDepth: 'Color Depth',
  sourceResolution: 'Source Resolution',
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

export function FailuresDashboard({ password, onAuthError }: FailuresDashboardProps) {
  const { data, isLoading, error } = useFailuresStats(password);

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
      <div className="text-center py-8 text-muted-foreground">Failed to load failure data</div>
    );
  }

  const configChartData: BarChartData[] = data.failuresByConfig.map((f) => ({
    ...f,
    label: `${f.inputFormat} → ${f.outputFormat}`,
  }));

  const optionChartData: OptionChartData[] = data.failuresByOption.map((f) => ({
    ...f,
    label: `${OPTION_LABELS[f.option] ?? f.option}: ${f.value}`,
  }));

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Failures"
          value={data.totalFailures.toLocaleString()}
          subtitle="All time"
          className="border-red-500/20 bg-red-500/5"
        />
        <StatCard
          title="Failure Rate"
          value={`${data.failureRate}%`}
          subtitle="All time"
          className="border-red-500/20 bg-red-500/5"
        />
        <StatCard
          title="24h Failures"
          value={data.last24HoursFailures.toLocaleString()}
          subtitle="Last 24 hours"
        />
        <StatCard
          title="24h Failure Rate"
          value={`${data.last24HoursFailureRate}%`}
          subtitle="Last 24 hours"
        />
      </div>

      {/* Error Groups */}
      <div className="bg-card border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Common Error Messages</h3>
        {data.errorGroups.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">No errors recorded</p>
        ) : (
          <div className="space-y-3">
            {data.errorGroups.map((group, index) => (
              <div
                key={index}
                className="flex items-start justify-between p-3 rounded-lg bg-muted/50"
              >
                <div className="flex-1 min-w-0 mr-4">
                  <p className="font-mono text-sm truncate" title={group.errorMessage}>
                    {group.errorMessage}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Last occurred: {formatTimeAgo(group.lastOccurred)}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold">{group.count.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">{group.percentage}%</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Failures by Configuration */}
      <div className="bg-card border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Failures by Format Configuration</h3>
        {configChartData.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">No failures recorded</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={configChartData} layout="vertical">
              <XAxis type="number" tick={{ fill: 'currentColor' }} />
              <YAxis dataKey="label" type="category" tick={{ fill: 'currentColor' }} width={120} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                formatter={(value, _name, props) => {
                  const payload = props.payload as BarChartData;
                  return [`${Number(value).toLocaleString()} (${payload.percentage}%)`, 'Failures'];
                }}
              />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {configChartData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Failures by Option */}
      <div className="bg-card border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Failures by Conversion Option</h3>
        {optionChartData.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">No option data for failures</p>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(200, optionChartData.length * 35)}>
            <BarChart data={optionChartData} layout="vertical">
              <XAxis type="number" tick={{ fill: 'currentColor' }} />
              <YAxis
                dataKey="label"
                type="category"
                tick={{ fill: 'currentColor', fontSize: 12 }}
                width={160}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                formatter={(value, _name, props) => {
                  const payload = props.payload as OptionChartData;
                  return [`${Number(value).toLocaleString()} (${payload.percentage}%)`, 'Failures'];
                }}
              />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {optionChartData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Recent Failures */}
      <div className="bg-card border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Recent Failures</h3>
        {data.recentFailures.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">No recent failures</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3 font-medium">Time</th>
                  <th className="text-left py-2 px-3 font-medium">Input</th>
                  <th className="text-left py-2 px-3 font-medium">Output</th>
                  <th className="text-left py-2 px-3 font-medium">Size</th>
                  <th className="text-left py-2 px-3 font-medium">Error</th>
                </tr>
              </thead>
              <tbody>
                {data.recentFailures.map((failure) => (
                  <tr key={failure.id} className="border-b border-muted">
                    <td className="py-2 px-3 text-muted-foreground">
                      {formatTimeAgo(failure.createdAt)}
                    </td>
                    <td className="py-2 px-3">
                      <span className="px-2 py-0.5 rounded bg-muted text-xs uppercase">
                        {failure.inputFormat}
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      <span className="px-2 py-0.5 rounded bg-muted text-xs uppercase">
                        {failure.outputFormat}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-muted-foreground">
                      {formatBytes(failure.inputSizeBytes)}
                    </td>
                    <td className="py-2 px-3">
                      <span
                        className="font-mono text-xs text-red-500 truncate block max-w-xs"
                        title={failure.errorMessage ?? 'Unknown error'}
                      >
                        {failure.errorMessage ?? 'Unknown error'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
