import { env } from '@/config/env';
import { useQuery } from '@tanstack/react-query';
import type {
  ConfigurationsStats,
  ConversionsStats,
  FailuresStats,
  FormatsStats,
  OverviewStats,
  PerformanceStats,
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

export function useOverviewStats(password: string | null) {
  return useQuery({
    queryKey: ['admin', 'overview', password],
    queryFn: () =>
      fetchWithAuth<OverviewStats>(`${env.API_URL}/api/v1/admin/stats/overview`, password!),
    enabled: !!password,
    refetchInterval: 30000,
  });
}

export function useConversionsStats(password: string | null) {
  return useQuery({
    queryKey: ['admin', 'conversions', password],
    queryFn: () =>
      fetchWithAuth<ConversionsStats>(`${env.API_URL}/api/v1/admin/stats/conversions`, password!),
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
