import { useQuery, queryOptions } from '@tanstack/react-query';
import { queryKeys } from '@/libs/query-keys';
import { getPublicProfile } from '@/apis/profile';
import type { PublicProfile } from '@/types/profile';

/**
 * Factory per le opzioni della query profilo pubblico.
 * Usa queryOptions helper per type-safety e riusabilità.
 * @param slug — slug URL dell'utente
 */
export function usePublicProfileQueryOptions(slug: string) {
  return queryOptions({
    queryKey: queryKeys.publicProfile(slug),
    queryFn: async () => {
      const r = await getPublicProfile(slug);
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
 * Hook per i dati del profilo pubblico.
 * Usa useQuery (non useSuspenseQuery) — deve gestire stato "not found".
 * @returns Dati del profilo pubblico
 */
export function usePublicProfileData(slug: string) {
  return useQuery(usePublicProfileQueryOptions(slug));
}
