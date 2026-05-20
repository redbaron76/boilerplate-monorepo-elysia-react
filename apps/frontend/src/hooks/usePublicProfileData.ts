import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/libs/query-keys';
import { getPublicProfile } from '@/apis/profile';
import type { PublicProfile } from '@/types/profile';

/**
 * Hook per i dati del profilo pubblico.
 * @param slug — slug URL dell'utente (es. "il-guerriero")
 * @returns Dati del profilo pubblico
 */
export function usePublicProfileData(slug: string) {
  return useQuery({
    queryKey: queryKeys.publicProfile(slug),
    queryFn: async () => {
      const r = await getPublicProfile(slug);
      if (!r.success) {
        throw new Error(r.error || 'Errore sconosciuto');
      }
      return r.data;
    },
    staleTime: 1000 * 60 * 5,
  });
}
