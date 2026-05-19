import { PrismaClient } from '../prisma-client/client.js';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({
  connectionString: 'postgresql://boilerplate:boilerplate@10.21.0.1:5432/boilerplate',
});

/**
 * Singleton PrismaClient per PostgreSQL remoto.
 * Usato da tutte le route del backend per accedere al database.
 */
export const db = new PrismaClient({ adapter });
