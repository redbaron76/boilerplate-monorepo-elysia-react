import { Elysia } from 'elysia';
import { authRoutes } from './routes/auth';
import { publicRoutes } from './routes/public';
import { protectedRoutes } from './routes/protected';

const app = new Elysia()
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

export default app;
