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
import { useConfigurationsStats } from '../hooks';
import type { OptionDistribution } from '../types';
import { StatCard } from './StatCard';

interface ConfigurationsDashboardProps {
  password: string;
  onAuthError: () => void;
}

const COLORS = [
  'hsl(221, 83%, 53%)',
  'hsl(142, 76%, 36%)',
  'hsl(38, 92%, 50%)',
  'hsl(0, 84%, 60%)',
  'hsl(262, 83%, 58%)',
  'hsl(180, 70%, 45%)',
];

interface ChartData extends OptionDistribution {
  [key: string]: string | number;
}

function DistributionChart({
  title,
  data,
  type = 'bar',
}: {
  title: string;
  data: OptionDistribution[];
  type?: 'bar' | 'pie';
}) {
  if (data.length === 0) {
    return (
      <div className="bg-card border rounded-lg p-6">
        <h4 className="text-sm font-medium mb-4">{title}</h4>
        <p className="text-muted-foreground text-center py-8 text-sm">No data available</p>
      </div>
    );
  }

  const chartData: ChartData[] = data.map((d) => ({ ...d }));

  if (type === 'pie') {
    return (
      <div className="bg-card border rounded-lg p-6">
        <h4 className="text-sm font-medium mb-4">{title}</h4>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={chartData}
              dataKey="count"
              nameKey="value"
              cx="50%"
              cy="50%"
              outerRadius={70}
              label={(entry) => `${entry.name} (${((entry.percent ?? 0) * 100).toFixed(0)}%)`}
              labelLine={false}
            >
              {chartData.map((_, index) => (
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
    );
  }

  return (
    <div className="bg-card border rounded-lg p-6">
      <h4 className="text-sm font-medium mb-4">{title}</h4>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chartData} layout="vertical">
          <XAxis type="number" tick={{ fill: 'currentColor' }} />
          <YAxis
            dataKey="value"
            type="category"
            tick={{ fill: 'currentColor', fontSize: 12 }}
            width={80}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
            }}
            formatter={(value, _name, props) => {
              const payload = props.payload as ChartData;
              return [`${Number(value).toLocaleString()} (${payload.percentage}%)`, 'Count'];
            }}
          />
          <Bar dataKey="count" radius={[0, 4, 4, 0]}>
            {chartData.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ConfigurationsDashboard({ password, onAuthError }: ConfigurationsDashboardProps) {
  const { data, isLoading, error } = useConfigurationsStats(password);

  if (error?.message === 'UNAUTHORIZED') {
    onAuthError();
    return null;
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-card border rounded-lg p-6 h-64 animate-pulse">
              <div className="h-4 bg-muted rounded w-24 mb-4" />
              <div className="h-full bg-muted rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Failed to load configuration data
      </div>
    );
  }

  if (data.totalWithOptions === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-2">No configuration data available yet</p>
        <p className="text-sm text-muted-foreground">
          Configuration options will be tracked for new conversions
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Conversions with Options"
          value={data.totalWithOptions.toLocaleString()}
          subtitle="Tracked configurations"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <DistributionChart title="Scale Distribution" data={data.scaleDistribution} />
        <DistributionChart title="Corner Radius" data={data.cornerRadiusDistribution} type="pie" />
        <DistributionChart
          title="Background Removal"
          data={data.backgroundRemovalDistribution}
          type="pie"
        />
        <DistributionChart title="Output Size" data={data.outputSizeDistribution} />
        <DistributionChart title="PNG DPI" data={data.pngDpiDistribution} />
        <DistributionChart
          title="PNG Colorspace"
          data={data.pngColorspaceDistribution}
          type="pie"
        />
        <DistributionChart
          title="PNG Color Depth"
          data={data.pngColorDepthDistribution}
          type="pie"
        />
      </div>
    </div>
  );
}
