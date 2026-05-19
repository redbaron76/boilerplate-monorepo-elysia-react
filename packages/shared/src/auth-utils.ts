import { JWT_SECRET_DEFAULT, JWT_EXPIRY } from './schemas';

/**
 * Restituisce la configurazione JWT dal processo o dai valori di default.
 * Usato da auth.ts, profile.ts e protected.ts per evitare duplicati.
 */
export function getJwtConfig(): { secret: string; expiry: string } {
  const secret = process.env.JWT_SECRET || JWT_SECRET_DEFAULT;
  const expiry = JWT_EXPIRY;
  return { secret, expiry };
}
