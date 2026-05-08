import { env } from '@/config/env';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  ConfigurationsStats,
  ConversionsStats,
  FailuresStats,
  FormatsStats,
  OverviewStats,
  PerformanceStats,
  UserConversionsResponse,
  UsersStats,
} from '../types';

async function fetchWithAuth<T>(url: string, password: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      'x-admin-password': password,
    },
  });

  if (response.status === 401) {
    throw new Error('UNAUTHORIZED');
  }

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.json();
}

function getUserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

function withTz(url: string): string {
  const tz = getUserTimezone();
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}tz=${encodeURIComponent(tz)}`;
}

export function useOverviewStats(password: string | null) {
  return useQuery({
    queryKey: ['admin', 'overview', password],
    queryFn: () =>
      fetchWithAuth<OverviewStats>(`${env.API_URL}/api/v1/admin/stats/overview`, password!),
    enabled: !!password,
    refetchInterval: 30000,
  });
}

export function useUsersStats(password: string | null) {
  const tz = getUserTimezone();
  return useQuery({
    queryKey: ['admin', 'users', password, tz],
    queryFn: () =>
      fetchWithAuth<UsersStats>(withTz(`${env.API_URL}/api/v1/admin/stats/users`), password!),
    enabled: !!password,
    refetchInterval: 60000,
  });
}

export function useUserConversionCounts(password: string | null) {
  const tz = getUserTimezone();
  return useQuery({
    queryKey: ['admin', 'users', 'conversions', password, tz],
    queryFn: () =>
      fetchWithAuth<UserConversionsResponse>(
        withTz(`${env.API_URL}/api/v1/admin/stats/users/conversions`),
        password!,
      ),
    enabled: !!password,
    refetchInterval: 60000,
  });
}

export function useConversionsStats(password: string | null) {
  const tz = getUserTimezone();
  return useQuery({
    queryKey: ['admin', 'conversions', password, tz],
    queryFn: () =>
      fetchWithAuth<ConversionsStats>(
        withTz(`${env.API_URL}/api/v1/admin/stats/conversions`),
        password!,
      ),
    enabled: !!password,
    refetchInterval: 30000,
  });
}

export function useFormatsStats(password: string | null) {
  return useQuery({
    queryKey: ['admin', 'formats', password],
    queryFn: () =>
      fetchWithAuth<FormatsStats>(`${env.API_URL}/api/v1/admin/stats/formats`, password!),
    enabled: !!password,
    refetchInterval: 60000,
  });
}

export function usePerformanceStats(password: string | null) {
  return useQuery({
    queryKey: ['admin', 'performance', password],
    queryFn: () =>
      fetchWithAuth<PerformanceStats>(`${env.API_URL}/api/v1/admin/stats/performance`, password!),
    enabled: !!password,
    refetchInterval: 60000,
  });
}

export function useFailuresStats(password: string | null) {
  return useQuery({
    queryKey: ['admin', 'failures', password],
    queryFn: () =>
      fetchWithAuth<FailuresStats>(`${env.API_URL}/api/v1/admin/stats/failures`, password!),
    enabled: !!password,
    refetchInterval: 30000,
  });
}

export function useConfigurationsStats(password: string | null) {
  return useQuery({
    queryKey: ['admin', 'configurations', password],
    queryFn: () =>
      fetchWithAuth<ConfigurationsStats>(
        `${env.API_URL}/api/v1/admin/stats/configurations`,
        password!,
      ),
    enabled: !!password,
    refetchInterval: 60000,
  });
}

export function useResetFailuresStats(password: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!password) throw new Error('No password provided');

      const response = await fetch(`${env.API_URL}/api/v1/admin/stats/failures`, {
        method: 'DELETE',
        headers: {
          'x-admin-password': password,
        },
      });

      if (response.status === 401) {
        throw new Error('UNAUTHORIZED');
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return response.json() as Promise<{ deletedCount: number }>;
    },
    onSuccess: () => {
      // Invalidate failures stats to refetch fresh data
      queryClient.invalidateQueries({ queryKey: ['admin', 'failures'] });
      // Also invalidate overview stats since failure counts are shown there
      queryClient.invalidateQueries({ queryKey: ['admin', 'overview'] });
    },
  });
}
