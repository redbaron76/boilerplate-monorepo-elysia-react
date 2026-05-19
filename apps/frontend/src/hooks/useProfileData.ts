import { useSuspenseQuery, type UseSuspenseQueryOptions } from '@tanstack/react-query';
import { queryKeys } from '@/libs/query-keys';
import { getOwnProfile } from '@/apis/profile';
import type { ProfileOwn } from '@/apis/profile';

/**
 * Factory per le opzioni della query profilo proprio.
 * Centralizza queryKey, queryFn, staleTime e refetchOnWindowFocus.
 * @returns QueryOptions per il profilo utente corrente
 */
export function useOwnProfileQueryOptions(): UseSuspenseQueryOptions<ProfileOwn> {
  return {
    queryKey: queryKeys.ownProfile,
    queryFn: async () => {
      const r = await getOwnProfile();
      if (!r.success) {
        throw new Error(r.error || 'Errore sconosciuto');
      }
      return r.data;
    },
    staleTime: 1000 * 60 * 5,
  };
}

/**
 * Hook per i dati del profilo proprio.
 * Usa useSuspenseQuery + Suspense boundary.
 * @returns Dati del profilo
 */
export function useOwnProfileData() {
  const queryOptions = useOwnProfileQueryOptions();
  return useSuspenseQuery({
    ...queryOptions,
    refetchOnWindowFocus: false,
  });
}
