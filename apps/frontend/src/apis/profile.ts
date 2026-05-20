import { api } from '@/libs/api';
import type { PublicProfile, ProfileOwn, UpdateProfilePayload } from '@/types/profile';

/**
 * Ottieni il profilo pubblico di un utente dato lo slug.
 */
export async function getPublicProfile(slug: string) {
  return api.get<PublicProfile>(`/profile/${slug}`);
}

/**
 * Ottieni il proprio profilo (richiede autenticazione).
 */
export async function getOwnProfile(): Promise<{ success: true; data: ProfileOwn }> {
  return api.get('/profile/me');
}

/**
 * Aggiorna il proprio profilo.
 */
export async function updateOwnProfile(payload: UpdateProfilePayload) {
  return api.put<UpdateProfilePayload | { success: false; error: string }>('/profile/me', payload);
}

/**
 * Elimina il proprio account.
 */
export async function deleteOwnProfile() {
  return api.delete('/profile/me');
}
