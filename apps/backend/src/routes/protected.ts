import { Elysia, t } from 'elysia';
import { prisma } from '../db/prisma';
import { jwt } from '@elysiajs/jwt';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-change-in-production-2024';
const authJwt = jwt({ name: 'jwt', secret: JWT_SECRET, exp: '15m' });

export const protectedRoutes = new Elysia({ prefix: '/api/protected' })
  .use(authJwt)
  .get('/dashboard', async ({ request, jwt: jwtHelper, error, set }) => {
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

    const dbUser = await prisma.user.findUnique({
      where: { id: user.sub },
      select: { id: true, email: true, name: true, createdAt: true },
    });

    if (!dbUser) {
      set.status = 404;
      return { success: false, error: 'Utente non trovato' };
    }

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
