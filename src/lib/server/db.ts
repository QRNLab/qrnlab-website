import type { PgDatabase } from 'drizzle-orm/pg-core';
import * as schemaModule from './schema';

export type Db = PgDatabase<any, any>;

let cached: Db | null = null;

async function createDb(): Promise<Db> {
  if (process.env.DATABASE_DRIVER === 'pglite') {
    // Local development: embedded Postgres (PGlite), persisted to disk.
    const [{ PGlite }, { drizzle: pgliteDrizzle }, { migrate }] = await Promise.all([
      import('@electric-sql/pglite'),
      import('drizzle-orm/pglite'),
      import('drizzle-orm/pglite/migrator'),
    ]);
    const dataDir = process.env.PGLITE_DATA_DIR ?? 'pglite-data';
    const client = new PGlite(dataDir);
    if (typeof (client as any).waitReady === 'function') await (client as any).waitReady;
    const db = pgliteDrizzle(client, { schema: schemaModule.schema });
    await migrate(db, { migrationsFolder: './drizzle' });
    return db;
  }

  // Production: Neon serverless Postgres over HTTP.
  const [{ neon }, { drizzle: neonDrizzle }] = await Promise.all([
    import('@neondatabase/serverless'),
    import('drizzle-orm/neon-http'),
  ]);
  const connectionString = process.env.NEON_DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      'NEON_DATABASE_URL is not set. For local development set DATABASE_DRIVER=pglite.',
    );
  }
  return neonDrizzle(neon(connectionString), { schema: schemaModule.schema });
}

export async function getDb(): Promise<Db> {
  if (!cached) cached = await createDb();
  return cached;
}
