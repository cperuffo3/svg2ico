import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useUsersStats } from '../hooks';
import { StatCard } from './StatCard';

interface UsersDashboardProps {
  password: string;
  onAuthError: () => void;
}

export function UsersDashboard({ password, onAuthError }: UsersDashboardProps) {
  const [view, setView] = useState<'cumulative' | 'new'>('cumulative');
  const { data, isLoading, error } = useUsersStats(password);

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
      <div className="text-center py-8 text-muted-foreground">Failed to load user data</div>
    );
  }

  const dataKey = view === 'cumulative' ? 'cumulativeUsers' : 'newUsers';
  const gradientId = view === 'cumulative' ? 'gradientCumulative' : 'gradientNew';
  const strokeColor = view === 'cumulative' ? 'hsl(221, 83%, 53%)' : 'hsl(262, 83%, 58%)';

  const formatXAxis = (date: string) => {
    const d = new Date(date + 'T00:00:00');
    const day = d.getDay();
    if (day === 1) {
      return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
    return '';
  };

  const lastDay = data.daily.length > 0 ? data.daily[data.daily.length - 1] : null;
  const firstDay = data.daily.length > 0 ? data.daily[0] : null;
  const newToday = lastDay?.newUsers ?? 0;
  const dayCount = data.daily.length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Unique Users"
          value={data.totalUniqueUsers.toLocaleString()}
          subtitle="All-time distinct IPs"
        />
        <StatCard
          title="New Users Today"
          value={newToday.toLocaleString()}
          subtitle={lastDay?.date ?? ''}
        />
        <StatCard
          title="First Recorded"
          value={firstDay?.date ?? 'N/A'}
          subtitle="Earliest data point"
        />
        <StatCard
          title="Days Tracked"
          value={dayCount.toLocaleString()}
          subtitle="Days with activity"
        />
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">User Growth</h3>
        <div className="flex gap-2">
          <Button
            variant={view === 'cumulative' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setView('cumulative')}
          >
            Cumulative
          </Button>
          <Button
            variant={view === 'new' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setView('new')}
          >
            New Per Day
          </Button>
        </div>
      </div>

      <div className="bg-card border rounded-lg p-6">
        <ResponsiveContainer width="100%" height={400}>
          <AreaChart data={data.daily}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={strokeColor} stopOpacity={0.3} />
                <stop offset="100%" stopColor={strokeColor} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" strokeOpacity={0.5} />
            <XAxis
              dataKey="date"
              tickFormatter={formatXAxis}
              interval={0}
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
                const d = new Date(label + 'T00:00:00');
                return d.toLocaleDateString([], {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                });
              }}
            />
            <Area
              type="monotone"
              dataKey={dataKey}
              stroke={strokeColor}
              strokeWidth={2}
              fill={`url(#${gradientId})`}
              name={view === 'cumulative' ? 'Total Users' : 'New Users'}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
