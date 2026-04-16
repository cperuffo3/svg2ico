import { Button } from '@/components/ui/button';
import { useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useUserConversionCounts, useUsersStats } from '../hooks';
import { StatCard } from './StatCard';

interface UsersDashboardProps {
  password: string;
  onAuthError: () => void;
}

export function UsersDashboard({ password, onAuthError }: UsersDashboardProps) {
  const [view, setView] = useState<'cumulative' | 'new'>('cumulative');
  const { data, isLoading, error } = useUsersStats(password);
  const { data: conversionsByUser } = useUserConversionCounts(password);

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
    return <div className="text-center py-8 text-muted-foreground">Failed to load user data</div>;
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
      {conversionsByUser && conversionsByUser.users.length > 0 && (
        <>
          <h3 className="text-lg font-semibold">Conversions by User</h3>
          <div className="bg-card border rounded-lg p-4">
            <div className="grid grid-cols-[auto_1fr_auto_auto] gap-x-4 gap-y-1 items-center text-xs text-muted-foreground mb-2 px-2">
              <span>User</span>
              <span>Activity</span>
              <span className="text-right">Total</span>
              <span className="text-right">Failed</span>
            </div>
            <div className="space-y-0.5">
              {conversionsByUser.users.map((user) => (
                <div
                  key={user.ipHash}
                  className="grid grid-cols-[auto_1fr_auto_auto] gap-x-4 items-center px-2 py-1 rounded hover:bg-muted/50"
                >
                  <span className="text-sm font-medium w-16">{user.userLabel}</span>
                  <Sparkline
                    data={user.dailyActivity}
                    maxValue={conversionsByUser.maxDailyCount}
                    width={200}
                    height={24}
                  />
                  <span className="text-sm tabular-nums text-right w-12">
                    {user.total.toLocaleString()}
                  </span>
                  <span
                    className={`text-sm tabular-nums text-right w-12 ${user.failed > 0 ? 'text-red-500' : 'text-muted-foreground'}`}
                  >
                    {user.failed > 0 ? user.failed.toLocaleString() : '-'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Sparkline({
  data,
  maxValue,
  width,
  height,
}: {
  data: number[];
  maxValue: number;
  width: number;
  height: number;
}) {
  if (data.length === 0 || maxValue === 0) return <div style={{ width, height }} />;

  const padding = 1;
  const innerHeight = height - padding * 2;
  const stepX = data.length > 1 ? width / (data.length - 1) : width;

  const points = data.map((v, i) => {
    const x = data.length > 1 ? i * stepX : width / 2;
    const y = padding + innerHeight - (v / maxValue) * innerHeight;
    return `${x},${y}`;
  });

  const pathD = `M${points.join('L')}`;
  const fillD = `${pathD}L${width},${height}L0,${height}Z`;

  return (
    <svg width={width} height={height} className="block">
      <path d={fillD} fill="hsl(142, 76%, 36%)" fillOpacity={0.15} />
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke="hsl(142, 76%, 36%)"
        strokeWidth={1.5}
      />
    </svg>
  );
}
