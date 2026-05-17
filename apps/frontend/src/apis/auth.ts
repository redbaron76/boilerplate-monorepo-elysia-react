import { api } from '@/libs/api';

/**
 * Payload per il login.
 */
export interface LoginPayload {
  email: string;
  password: string;
}

/**
 * Payload per la registrazione.
 */
export interface RegisterPayload {
  email: string;
  password: string;
}

/**
 * Payload per il refresh del token.
 */
export interface RefreshPayload {
  refreshToken: string;
}

/**
 * Risultato della risposta di autenticazione.
 */
export interface AuthSuccessResponse {
  success: true;
  data: {
    accessToken: string;
    refreshToken: string;
    user: { id: string; email: string; name: string | null };
  };
}

export interface AuthErrorResponse {
  success: false;
  error: string;
}

/**
 * Esegue il login con email e password.
 * Restituisce accessToken, refreshToken e dati utente.
 * @param payload - Email e password dell'utente
 * @returns Risposta dell'API con token e utente
 */
export async function login(payload: LoginPayload) {
  return api.post<AuthSuccessResponse | AuthErrorResponse>('/auth/login', {
    email: payload.email,
    password: payload.password,
  });
}

/**
 * Esegue la registrazione di un nuovo utente.
 * @param payload - Email e password del nuovo utente
 * @returns Risposta dell'API
 */
export async function register(payload: RegisterPayload) {
  return api.post<{ success: boolean; message: string }>('/auth/register', {
    email: payload.email,
    password: payload.password,
  });
}

/**
 * Rinnova il token di accesso usando il refresh token.
 * @param refreshToken - Refresh token corrente
 * @returns Nuovi accessToken e refreshToken
 */
export async function refreshAccessToken(refreshToken: string) {
  return api.post<{
    success: true;
    data: { accessToken: string; refreshToken: string };
  }>('/auth/refresh', { refreshToken });
}
