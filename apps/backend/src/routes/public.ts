import { Elysia, t } from 'elysia';
import { prisma } from '../db/prisma';

export const publicRoutes = new Elysia({ prefix: '/api' })
  .get('/public/info', async () => {
    return {
      message: 'Questa è una rotta pubblica',
      timestamp: new Date().toISOString(),
    };
  })
  .get('/public/health', async () => {
    return { status: 'ok' };
  });
