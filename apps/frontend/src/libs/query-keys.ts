/**
 * Invalidazione Query Keys — TanStack Query
 * Usato da: hooks/useDashboardData, hooks/useUserData, hooks/useUpdateProfile
 * Dove: libs/query-keys.ts
 * Esempio: queryClient.invalidateQueries({ queryKey: queryKeys.dashboard })
 */

/**
 * Chiavi di invalidazione centralizzate per TanStack Query.
 * Tutte le query devono riferirsi a queste costanti per garantire
 * coerenza nell'invalidazione e nell'aggiornamento del cache.
 *
 * Pattern: arrays di stringhe come const per tipizzazione stretta.
 */

export const queryKeys = {
  /** Dashboard API — /protected/dashboard */
  dashboard: ['dashboard'] as const,

  /** Utente corrente — /protected/user */
  user: ['user'] as const,

  /** Impostazioni utente — /protected/user/settings */
  userSettings: ['user', 'settings'] as const,

  /** Profilo utente — /protected/profile */
  profile: ['profile'] as const,

  /** Lista risorse (es. prodotti, ordini, ecc.) — da estendere */
  resources: ['resources'] as const,
} as const;

/**
 * Helper per invalidare tutte le query di un modulo.
 * @param queryClient — istanza di QueryClient
 * @example
 *   invalidateAll(queryClient, 'dashboard');
 */
export function invalidateAll(
  queryClient: import('@tanstack/react-query').QueryClient,
  prefix: string
): void {
  queryClient.invalidateQueries({
    queryKey: [prefix],
  });
}
