/**
 * Query Key Factory — TanStack Query v5
 * Chiavi di invalidazione centralizzate per coerenza cache.
 *
 * Pattern: array di stringhe come const per tipizzazione stretta.
 * Per chiavi dinamiche: funzione che restituisce [key, ...rest] as const.
 */

export const queryKeys = {
  /** Dashboard API — /protected/dashboard */
  dashboard: ['dashboard'] as const,

  /** Profilo pubblico per slug — /:slug */
  publicProfile: (slug: string) => ['profile', 'public', slug] as const,

  /** Profilo proprio — /profile/me */
  ownProfile: ['profile', 'own'] as const,
} as const;
