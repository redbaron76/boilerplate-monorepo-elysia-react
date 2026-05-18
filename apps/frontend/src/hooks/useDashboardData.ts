import { useSuspenseQuery, type UseSuspenseQueryOptions } from '@tanstack/react-query';
import { queryKeys } from '@/libs/query-keys';
import { api } from '@/libs/api';

/**
 * Risposta dell'API per la dashboard.
 */
export interface DashboardResponse {
  success: boolean;
  message: string;
  user: {
    id: string;
    email: string;
    name: string | null;
  };
}

/**
 * Factory per le opzioni della query dashboard.
 * Centralizza queryKey, queryFn, staleTime e refetchOnWindowFocus.
 * @returns QueryOptions per la dashboard
 */
export function useDashboardQueryOptions(): UseSuspenseQueryOptions<DashboardResponse> {
  return {
    queryKey: queryKeys.dashboard,
    queryFn: () => api.get<DashboardResponse>('/protected/dashboard'),
  };
}

/**
 * Hook dedicato per i dati della dashboard.
 * Usa useSuspenseQuery — il componente non gestisce loading/error separatamente.
 * Il Suspense boundary gestisce lo stato di caricamento.
 * @returns Dati della dashboard
 */
export function useDashboardData() {
  const queryOptions = useDashboardQueryOptions();
  return useSuspenseQuery({
    ...queryOptions,
    staleTime: 1000 * 60, // 1 minuto
    refetchOnWindowFocus: false, // solo invalidate manuale
  });
}
