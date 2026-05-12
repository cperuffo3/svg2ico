import { env } from '@/config/env';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  ConfigurationsStats,
  ConversionsStats,
  ErrorSubmissionDetail,
  ErrorSubmissionsResponse,
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

export function useErrorSubmissions(
  password: string | null,
  filter: 'all' | 'unreviewed' | 'reviewed' = 'all',
) {
  return useQuery({
    queryKey: ['admin', 'error-submissions', password, filter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (filter === 'unreviewed') params.set('reviewed', 'false');
      if (filter === 'reviewed') params.set('reviewed', 'true');
      const qs = params.toString();
      return fetchWithAuth<ErrorSubmissionsResponse>(
        `${env.API_URL}/api/v1/admin/error-submissions${qs ? `?${qs}` : ''}`,
        password!,
      );
    },
    enabled: !!password,
    refetchInterval: 30000,
  });
}

export function useErrorSubmissionDetail(password: string | null, id: string | null) {
  return useQuery({
    queryKey: ['admin', 'error-submission', password, id],
    queryFn: () =>
      fetchWithAuth<ErrorSubmissionDetail>(
        `${env.API_URL}/api/v1/admin/error-submissions/${id}`,
        password!,
      ),
    enabled: !!password && !!id,
  });
}

export function useUpdateErrorSubmission(password: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      id: string;
      reviewed?: boolean;
      reviewerNotes?: string | null;
    }) => {
      if (!password) throw new Error('No password provided');
      const response = await fetch(`${env.API_URL}/api/v1/admin/error-submissions/${params.id}`, {
        method: 'PATCH',
        headers: {
          'x-admin-password': password,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reviewed: params.reviewed,
          reviewerNotes: params.reviewerNotes,
        }),
      });
      if (response.status === 401) throw new Error('UNAUTHORIZED');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json() as Promise<ErrorSubmissionDetail>;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'error-submissions'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'error-submission', password, vars.id] });
    },
  });
}

export function useDeleteErrorSubmission(password: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!password) throw new Error('No password provided');
      const response = await fetch(`${env.API_URL}/api/v1/admin/error-submissions/${id}`, {
        method: 'DELETE',
        headers: { 'x-admin-password': password },
      });
      if (response.status === 401) throw new Error('UNAUTHORIZED');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json() as Promise<{ deleted: boolean }>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'error-submissions'] });
    },
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
