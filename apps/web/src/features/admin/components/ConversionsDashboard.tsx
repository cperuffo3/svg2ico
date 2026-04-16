import { Button } from '@/components/ui/button';
import { useState } from 'react';
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

interface ConversionsDashboardProps {
  password: string;
  onAuthError: () => void;
}

export function ConversionsDashboard({ password, onAuthError }: ConversionsDashboardProps) {
  const [view, setView] = useState<'hourly' | 'daily'>('hourly');
  const { data, isLoading, error } = useConversionsStats(password);

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

  const formatXAxis = (timestamp: string) => {
    if (view === 'hourly') {
      const date = new Date(timestamp);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    // Daily view: only label on Mondays
    const date = new Date(timestamp + (timestamp.includes('T') ? '' : 'T00:00:00'));
    const day = date.getDay();
    if (day === 1) {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
    return '';
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
            Last 30 Days
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
              interval={view === 'daily' ? 0 : undefined}
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
                const date = new Date(label);
                return view === 'hourly' ? date.toLocaleString() : date.toLocaleDateString();
              }}
            />
            <Legend />
            <Area
              type="monotone"
              dataKey="successful"
              stackId="1"
              stroke={successColor}
              strokeWidth={2}
              fill="url(#gradientSuccess)"
              name="Successful"
            />
            <Area
              type="monotone"
              dataKey="failed"
              stackId="1"
              stroke={failColor}
              strokeWidth={2}
              fill="url(#gradientFailed)"
              name="Failed"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
