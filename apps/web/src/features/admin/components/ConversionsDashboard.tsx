import { Button } from '@/components/ui/button';
import { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useConversionsStats } from '../hooks';
import { computeHourlyTicks, computeWeeklyMonthTicks } from '../lib/chart-ticks';

interface ConversionsDashboardProps {
  password: string;
  onAuthError: () => void;
}

export function ConversionsDashboard({ password, onAuthError }: ConversionsDashboardProps) {
  const [view, setView] = useState<'hourly' | 'daily'>('hourly');
  const { data, isLoading, error } = useConversionsStats(password);

  const hourlyTickInfo = useMemo(
    () => computeHourlyTicks(data?.hourly.map((d) => d.timestamp) ?? []),
    [data?.hourly],
  );
  const dailyTickInfo = useMemo(
    () => computeWeeklyMonthTicks(data?.daily.map((d) => d.timestamp) ?? []),
    [data?.daily],
  );

  if (error?.message === 'UNAUTHORIZED') {
    onAuthError();
    return null;
  }

  if (isLoading) {
    return (
      <div className="bg-card border rounded-lg p-6 h-96 animate-pulse">
        <div className="h-full bg-muted rounded" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-8 text-muted-foreground">Failed to load conversion data</div>
    );
  }

  const chartData = view === 'hourly' ? data.hourly : data.daily;
  const { ticks, labeled } =
    view === 'hourly'
      ? { ticks: hourlyTickInfo.ticks, labeled: hourlyTickInfo.labeled }
      : { ticks: dailyTickInfo.ticks, labeled: dailyTickInfo.labeled };

  const formatXAxis = (timestamp: string) => {
    if (!labeled.has(timestamp)) return '';
    if (view === 'hourly') {
      const date = new Date(timestamp);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    const date = new Date(timestamp + 'T00:00:00');
    return date.toLocaleDateString([], { month: 'short', year: 'numeric' });
  };

  const successColor = 'hsl(142, 76%, 36%)';
  const failColor = 'hsl(0, 84%, 60%)';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Conversions Over Time</h3>
        <div className="flex gap-2">
          <Button
            variant={view === 'hourly' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setView('hourly')}
          >
            Last 24 Hours
          </Button>
          <Button
            variant={view === 'daily' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setView('daily')}
          >
            All Time
          </Button>
        </div>
      </div>

      <div className="bg-card border rounded-lg p-6">
        <ResponsiveContainer width="100%" height={400}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="gradientSuccess" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={successColor} stopOpacity={0.3} />
                <stop offset="100%" stopColor={successColor} stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="gradientFailed" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={failColor} stopOpacity={0.3} />
                <stop offset="100%" stopColor={failColor} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" strokeOpacity={0.5} />
            <XAxis
              dataKey="timestamp"
              tickFormatter={formatXAxis}
              ticks={ticks}
              className="text-xs"
              tick={{ fill: 'currentColor', fontSize: 11 }}
              tickLine={{ stroke: 'currentColor', strokeOpacity: 0.3 }}
              axisLine={{ stroke: 'currentColor', strokeOpacity: 0.2 }}
            />
            <YAxis
              className="text-xs"
              tick={{ fill: 'currentColor', fontSize: 11 }}
              axisLine={{ stroke: 'currentColor', strokeOpacity: 0.2 }}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontSize: '13px',
              }}
              labelFormatter={(label) => {
                if (view === 'hourly') return new Date(label).toLocaleString();
                const date = new Date(label + 'T00:00:00');
                return date.toLocaleDateString([], {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                });
              }}
            />
            <Legend />
            <Area
              type="monotone"
              dataKey="failed"
              stackId="1"
              stroke={failColor}
              strokeWidth={2}
              fill="url(#gradientFailed)"
              name="Failed"
            />
            <Area
              type="monotone"
              dataKey="successful"
              stackId="1"
              stroke={successColor}
              strokeWidth={2}
              fill="url(#gradientSuccess)"
              name="Successful"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
