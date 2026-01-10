import { useOverviewStats } from '../hooks';
import { StatCard } from './StatCard';

interface OverviewDashboardProps {
  password: string;
  onAuthError: () => void;
}

export function OverviewDashboard({ password, onAuthError }: OverviewDashboardProps) {
  const { data, isLoading, error } = useOverviewStats(password);

  if (error?.message === 'UNAUTHORIZED') {
    onAuthError();
    return null;
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-card border rounded-lg p-4 animate-pulse">
            <div className="h-4 bg-muted rounded w-24 mb-2" />
            <div className="h-8 bg-muted rounded w-16" />
          </div>
        ))}
      </div>
    );
  }

  if (error || !data) {
    return <div className="text-center py-8 text-muted-foreground">Failed to load statistics</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Conversions"
          value={data.totalConversions.toLocaleString()}
          subtitle="All time"
        />
        <StatCard
          title="Success Rate"
          value={`${data.successRate}%`}
          subtitle={`${data.successfulConversions.toLocaleString()} successful`}
        />
        <StatCard
          title="Last 24 Hours"
          value={data.last24Hours.total.toLocaleString()}
          subtitle={`${data.last24Hours.successful} successful, ${data.last24Hours.failed} failed`}
        />
        <StatCard
          title="Unique Users"
          value={data.uniqueUsers.toLocaleString()}
          subtitle="Distinct IP addresses"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Successful Conversions"
          value={data.successfulConversions.toLocaleString()}
          className="border-green-500/20 bg-green-500/5"
        />
        <StatCard
          title="Failed Conversions"
          value={data.failedConversions.toLocaleString()}
          className="border-red-500/20 bg-red-500/5"
        />
        <StatCard
          title="24h Failed"
          value={data.last24Hours.failed.toLocaleString()}
          subtitle={
            data.last24Hours.total > 0
              ? `${((data.last24Hours.failed / data.last24Hours.total) * 100).toFixed(1)}% failure rate`
              : 'No conversions'
          }
        />
      </div>
    </div>
  );
}
