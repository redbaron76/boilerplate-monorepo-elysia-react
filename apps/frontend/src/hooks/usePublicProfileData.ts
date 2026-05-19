import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/libs/query-keys';
import { getPublicProfile } from '@/apis/profile';
import type { ProfilePublic } from '@/apis/profile';

/**
 * Hook per i dati del profilo pubblico.
 * @param nickname — nickname dell'utente da cercare
 * @returns Dati del profilo pubblico
 */
export function usePublicProfileData(nickname: string) {
  return useQuery({
    queryKey: queryKeys.publicProfile(nickname),
    queryFn: async () => {
      const r = await getPublicProfile(nickname);
      if (!r.success) {
        throw new Error(r.error || 'Errore sconosciuto');
      }
      return r.data;
    },
    staleTime: 1000 * 60 * 5,
  });
}
