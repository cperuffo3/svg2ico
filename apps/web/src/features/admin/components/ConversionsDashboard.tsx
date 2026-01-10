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
    const date = new Date(timestamp);
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

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
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="timestamp"
              tickFormatter={formatXAxis}
              className="text-xs"
              tick={{ fill: 'currentColor' }}
            />
            <YAxis className="text-xs" tick={{ fill: 'currentColor' }} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
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
              stroke="hsl(142, 76%, 36%)"
              fill="hsl(142, 76%, 36%)"
              fillOpacity={0.6}
              name="Successful"
            />
            <Area
              type="monotone"
              dataKey="failed"
              stackId="1"
              stroke="hsl(0, 84%, 60%)"
              fill="hsl(0, 84%, 60%)"
              fillOpacity={0.6}
              name="Failed"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
