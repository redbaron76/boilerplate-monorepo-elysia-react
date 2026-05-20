import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth';
import { getOwnProfile, updateOwnProfile, type ProfileOwn, type UpdateProfilePayload } from '@/apis/profile';
import { queryKeys } from '@/libs/query-keys';

function generateSlug(nickname: string): string {
  return nickname
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/**
 * Hook per tutti i dati e le mutation della pagina settings.
 * Regola AGENTS: MAI usare Query direttamente nel componente.
 * @returns hook completo per la pagina impostazioni
 */
export function useProfileSettings() {
  const queryClient = useQueryClient();

  const { data: profile, isLoading, error } = useQuery({
    queryKey: queryKeys.ownProfile,
    queryFn: async () => {
      const r = await getOwnProfile();
      if (!r.success) throw new Error(r.error || 'Errore sconosciuto');
      return r.data;
    },
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });

  const updateMutation = useMutation({
    mutationFn: updateOwnProfile,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.ownProfile });
      return data;
    },
  });

  return {
    profile,
    isLoading,
    error,
    updateMutation,
    generateSlug,
  };
}

/**
 * Hook per la gestione dello stato UI della pagina settings.
 * Separa la logica UI dalla logica dati.
 */
export function useSettingsUI() {
  const { user, logout } = useAuthStore();
  return { user, logout };
}
