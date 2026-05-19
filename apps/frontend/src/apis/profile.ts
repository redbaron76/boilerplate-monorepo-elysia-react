import { api } from '@/libs/api';

/**
 * ProfilePublic — risposta API per profilo pubblico.
 */
export interface ProfilePublic {
  id: number;
  nickname: string;
  gender: 'MALE' | 'FEMALE' | 'NON_BINARY' | 'PREFER_NOT_TO_SAY' | null;
  birthDate: string | null;
  avatar: string | null;
  createdAt: string;
}

/**
 * ProfileOwn — risposta API per profilo proprio (con updatedAt).
 */
export interface ProfileOwn {
  id: number;
  nickname: string | null;
  gender: 'MALE' | 'FEMALE' | 'NON_BINARY' | 'PREFER_NOT_TO_SAY' | null;
  birthDate: string | null;
  avatar: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Payload per l'aggiornamento del profilo.
 */
export interface UpdateProfilePayload {
  nickname?: string;
  gender?: 'MALE' | 'FEMALE' | 'NON_BINARY' | 'PREFER_NOT_TO_SAY' | '';
  birthDate?: string | '';
  avatar?: string | '';
}

/**
 * Ottieni il profilo pubblico di un utente per nickname.
 * @param nickname — nickname dell'utente da cercare
 * @returns Risposta API con profilo pubblico o errore
 */
export async function getPublicProfile(nickname: string) {
  return api.get<
    { success: true; data: ProfilePublic } | { success: false; error: string }
  >(`/profile/${encodeURIComponent(nickname)}`);
}

/**
 * Ottieni il proprio profilo (richiede autenticazione).
 * @returns Risposta API con profilo completo
 */
export async function getOwnProfile() {
  return api.get<
    { success: true; data: ProfileOwn } | { success: false; error: string }
  >('/profile/me');
}

/**
 * Aggiorna il proprio profilo (richiede autenticazione).
 * @param payload — Campi da aggiornare (solo quelli non-null/non-vuoti)
 * @returns Risposta API con profilo aggiornato
 */
export async function updateOwnProfile(payload: UpdateProfilePayload) {
  return api.put<
    { success: true; data: ProfileOwn } | { success: false; error: string }
  >('/profile/me', payload);
}

/**
 * Elimina il proprio account (richiede autenticazione).
 * @returns Risposta API con conferma eliminazione
 */
export async function deleteOwnAccount() {
  return api.delete<
    { success: true; message: string } | { success: false; error: string }
  >('/profile/me');
}
