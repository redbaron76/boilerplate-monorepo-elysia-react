import { Elysia, t } from 'elysia';
import { swagger } from '@elysiajs/swagger';
import { authRoutes } from './routes/auth';
import { publicRoutes } from './routes/public';
import { profileRoutes, protectedProfileRoutes } from './routes/profile';
import { protectedRoutes } from './routes/protected';
import { db } from './db';

// Ensure Prisma is connected
await db.$connect();

const app = new Elysia()
  .use(
    swagger({
      documentation: {
        info: {
          title: 'Boilerplate Monorepo API',
          description: 'API REST per il monorepo Bun + ElysiaJS + React',
          version: '1.0.0',
        },
      },
      path: '/swagger',
    })
  )
  .onError(({ code, error, set }) => {
    if (code === 'VALIDATION') {
      set.status = 400;
      return { success: false, error: error.message };
    }
    if (code === 'NOT_FOUND') {
      set.status = 404;
      return { success: false, error: 'Rotta non trovata' };
    }
    set.status = 500;
    console.error('SERVER ERROR:', error.message, '\n', error.stack);
    return { success: false, error: 'Errore interno del server' };
  })
  .use(publicRoutes)
  .use(profileRoutes)
  .use(authRoutes)
  .use(protectedRoutes)
  .use(protectedProfileRoutes)
  .listen(3001);

console.log(`🚀 Backend ElysiaJS su http://localhost:3001`);
console.log(`📘 OpenAPI Swagger UI disponibile su: http://localhost:3001/swagger`);

export default app;
