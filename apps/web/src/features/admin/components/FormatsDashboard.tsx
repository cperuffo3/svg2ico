import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useFormatsStats } from '../hooks';
import type { FormatDistribution, SizeDistribution } from '../types';

interface FormatsDashboardProps {
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

interface PieChartData extends FormatDistribution {
  [key: string]: string | number;
}

interface SizeChartData extends SizeDistribution {
  [key: string]: string | number;
}

export function FormatsDashboard({ password, onAuthError }: FormatsDashboardProps) {
  const { data, isLoading, error } = useFormatsStats(password);

  if (error?.message === 'UNAUTHORIZED') {
    onAuthError();
    return null;
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="bg-card border rounded-lg p-6 h-80 animate-pulse">
            <div className="h-full bg-muted rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (error || !data) {
    return <div className="text-center py-8 text-muted-foreground">Failed to load format data</div>;
  }

  const pieData: PieChartData[] = data.outputFormats.map((f) => ({
    ...f,
  }));

  const barData: PieChartData[] = data.inputFormats.map((f) => ({
    ...f,
  }));

  const sizeData: SizeChartData[] = data.inputSizeDistribution.map((s) => ({
    ...s,
  }));

  return (
    <div className="space-y-6">
      {/* Input File Size Distribution */}
      <div className="bg-card border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Input File Size Distribution</h3>
        {sizeData.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">No size data available</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={sizeData}>
              <XAxis
                dataKey="range"
                tick={{ fill: 'currentColor', fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis tick={{ fill: 'currentColor' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                formatter={(value, _name, props) => {
                  const payload = props.payload as SizeChartData;
                  return [`${Number(value).toLocaleString()} (${payload.percentage}%)`, 'Files'];
                }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {sizeData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Output Format Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="count"
                nameKey="format"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={(entry) => `${entry.name} (${((entry.percent ?? 0) * 100).toFixed(1)}%)`}
              >
                {pieData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                formatter={(value) => [Number(value).toLocaleString(), 'Count']}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Input Format Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={barData} layout="vertical">
              <XAxis type="number" tick={{ fill: 'currentColor' }} />
              <YAxis dataKey="format" type="category" tick={{ fill: 'currentColor' }} width={60} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                formatter={(value, _name, props) => {
                  const payload = props.payload as PieChartData;
                  return [`${Number(value).toLocaleString()} (${payload.percentage}%)`, 'Count'];
                }}
              />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {barData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-card border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Format Details</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {data.outputFormats.map((format, index) => (
            <div
              key={format.format}
              className="p-4 rounded-lg"
              style={{ backgroundColor: `${COLORS[index % COLORS.length]}20` }}
            >
              <p className="text-sm text-muted-foreground uppercase">{format.format}</p>
              <p className="text-xl font-bold">{format.count.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">{format.percentage}%</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
