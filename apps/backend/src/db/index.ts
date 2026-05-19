import { PGlite } from '@electric-sql/pglite';

export class Database {
  private pg: PGlite | null = null;

  async init() {
    this.pg = await PGlite.create({
      dataDir: './pglite-data'
    });
    
    // Create users table
    await this.pg.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        refresh_token TEXT,
        name TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log('✅ Database initialized with PGlite');
  }

  async query<T = any>(sql: string, params: any[] = []): Promise<T> {
    if (!this.pg) throw new Error('Database not initialized');
    const result = await this.pg.query(sql, params);
    return result.rows as T;
  }

  async exec(sql: string): Promise<void> {
    if (!this.pg) throw new Error('Database not initialized');
    await this.pg.exec(sql);
  }

  async transaction<T>(fn: (db: Database) => Promise<T>): Promise<T> {
    if (!this.pg) throw new Error('Database not initialized');
    return await this.pg.transaction(async (tx) => {
      // Create a temporary db instance that uses the transaction
      const txDb = new Database();
      (txDb as any).pg = tx;
      return await fn(txDb);
    });
  }

  async close() {
    if (this.pg) {
      await this.pg.close();
    }
  }

  get instance(): PGlite {
    if (!this.pg) throw new Error('Database not initialized');
    return this.pg;
  }
}

export const db = new Database();
