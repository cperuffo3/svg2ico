/**
 * Service status provider.
 *
 * Checks the API health endpoint before showing the app, and swaps the whole
 * app for an outage screen when the backend is unreachable, hangs, or reports
 * itself unhealthy, so the site doesn't look normal while conversions silently
 * time out. It keeps polling while down and restores the app automatically on
 * recovery.
 */
import { ServiceUnavailablePage } from '@/components/common';
import { env } from '@/config/env';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, type ReactNode } from 'react';
import { ServiceStatusContext } from './service-status-context';

// The API answers /health in ~100ms normally and returns 503 within ~2s when
// its database is unreachable. This client-side cap covers the API itself
// being unreachable/hung, and bounds how long first paint can be held.
const HEALTH_TIMEOUT_MS = 4_000;
const POLL_WHEN_HEALTHY_MS = 60_000;
const POLL_WHEN_DOWN_MS = 10_000;
// Background re-checks retry before declaring an outage, so a single blip
// mid-session doesn't flash the outage screen. The first check on page load
// does not retry: visitors should learn immediately that we're down.
const BACKGROUND_RETRIES = 2;
const SERVICE_STATUS_KEY = ['service-status'];

async function checkServiceHealth(): Promise<true> {
  const response = await fetch(`${env.API_URL}/api/v1/health`, {
    cache: 'no-store',
    signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`Health check returned ${response.status}`);
  }
  return true;
}

export function ServiceStatusProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const { isPending, isError, isFetching, refetch } = useQuery({
    queryKey: SERVICE_STATUS_KEY,
    queryFn: checkServiceHealth,
    retry: (failureCount) => {
      // Has any check ever succeeded in this session? (0 = never.)
      const hasBeenHealthy =
        (queryClient.getQueryState(SERVICE_STATUS_KEY)?.dataUpdatedAt ?? 0) > 0;
      return hasBeenHealthy && failureCount < BACKGROUND_RETRIES;
    },
    retryDelay: 1_500,
    staleTime: 0,
    refetchInterval: (query) =>
      query.state.status === 'error' ? POLL_WHEN_DOWN_MS : POLL_WHEN_HEALTHY_MS,
    refetchOnWindowFocus: true,
  });

  const reportPossibleOutage = useCallback(() => {
    void refetch();
  }, [refetch]);

  const value = useMemo(
    () => ({ isDown: isError, reportPossibleOutage }),
    [isError, reportPossibleOutage],
  );

  let content: ReactNode;
  if (isPending) {
    // Hold first paint until the initial check resolves, so visitors never see
    // a normal-looking site that is actually down. Plain background only (it
    // matches index.html's pre-paint color), shown for ~100ms when healthy.
    content = <div className="min-h-svh bg-background" aria-busy="true" />;
  } else if (isError) {
    content = <ServiceUnavailablePage onRetry={reportPossibleOutage} isChecking={isFetching} />;
  } else {
    content = children;
  }

  return <ServiceStatusContext.Provider value={value}>{content}</ServiceStatusContext.Provider>;
}
