import { Elysia, t } from 'elysia';
import { openapi } from '@elysia/openapi';
import { authRoutes } from './routes/auth';
import { publicRoutes } from './routes/public';
import { protectedRoutes } from './routes/protected';

const app = new Elysia()
  .use(
    openapi({
      mode: 'stable',
      documentation: {
        info: {
          title: 'Boilerplate Monorepo API',
          description: 'API REST per il monorepo Bun + ElysiaJS + React',
          version: '1.0.0',
        },
      },
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
    return { success: false, error: 'Errore interno del server' };
  })
  .use(publicRoutes)
  .use(authRoutes)
  .use(protectedRoutes)
  .listen(3001);

console.log(`🚀 Backend ElysiaJS su http://localhost:3001`);
console.log(`📘 OpenAPI Swagger UI disponibile su: http://localhost:3001/swagger`);

export default app;
