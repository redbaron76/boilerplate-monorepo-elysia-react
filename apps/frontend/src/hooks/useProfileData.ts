import { useSuspenseQuery, queryOptions } from '@tanstack/react-query';
import { queryKeys } from '@/libs/query-keys';
import { getOwnProfile } from '@/apis/profile';
import type { ProfileOwn } from '@/apis/profile';

/**
 * Factory per le opzioni della query profilo proprio.
 * Usa queryOptions helper per type-safety e riusabilità.
 */
export function useOwnProfileQueryOptions() {
  return queryOptions({
    queryKey: queryKeys.ownProfile,
    queryFn: async () => {
      const r = await getOwnProfile();
      if (!r.success) {
        throw new Error(r.error || 'Errore sconosciuto');
      }
      return r.data;
    },
    staleTime: 1000 * 60 * 5,    // 5 minuti
    gcTime: 1000 * 60 * 15,       // 15 minuti garbage collection
    refetchOnWindowFocus: false,  // solo invalidate manuale
  });
}

/**
 * Hook per i dati del profilo proprio.
 * Usa useSuspenseQuery + Suspense boundary.
 * @returns Dati del profilo
 */
export function useOwnProfileData() {
  return useSuspenseQuery(useOwnProfileQueryOptions());
}
