import { Elysia, t } from 'elysia';
import { db } from '../db';
import { jwt } from '@elysiajs/jwt';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-change-in-production-2024';
const authJwt = jwt({ name: 'jwt', secret: JWT_SECRET, exp: '15m' });

export const protectedRoutes = new Elysia({ prefix: '/api/protected' })
  .use(authJwt)
  .get('/dashboard', async ({ request, jwt: jwtHelper, set }) => {
    // Manually extract Bearer token from Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      set.status = 401;
      return { success: false, error: 'Token di autenticazione richiesto' };
    }

    const token = authHeader.slice(7);
    const user = await jwtHelper.verify(token);
    if (!user) {
      set.status = 401;
      return { success: false, error: 'Token non valido o scaduto' };
    }

    const rows = await db.query<any[]>('SELECT id, email, name, created_at FROM users WHERE id = $1', [user.sub]);
    if (rows.length === 0) {
      set.status = 404;
      return { success: false, error: 'Utente non trovato' };
    }

    const dbUser = rows[0];

    return {
      success: true,
      message: 'Benvenuto nella tua area riservata!',
      user: {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
      },
    };
  });
