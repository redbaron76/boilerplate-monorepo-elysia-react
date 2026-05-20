import { useSuspenseQuery, queryOptions } from '@tanstack/react-query';
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
 * Usa queryOptions helper per type-safety e riusabilità.
 */
export function useDashboardQueryOptions() {
  return queryOptions({
    queryKey: queryKeys.dashboard,
    queryFn: () => api.get<DashboardResponse>('/protected/dashboard'),
    staleTime: 1000 * 60,       // 1 minuto
    gcTime: 1000 * 60 * 5,      // 5 minuti garbage collection
    refetchOnWindowFocus: false, // solo invalidate manuale
  });
}

/**
 * Hook dedicato per i dati della dashboard.
 * Usa useSuspenseQuery — il componente non gestisce loading/error.
 * Il Suspense boundary gestisce lo stato di caricamento.
 */
export function useDashboardData() {
  return useSuspenseQuery(useDashboardQueryOptions());
}
