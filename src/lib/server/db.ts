import { drizzle, type DrizzleD1Database } from 'drizzle-orm/d1';
import * as schemaModule from './schema';
import { cf } from './cf-env';

export type Db = DrizzleD1Database<typeof schemaModule.schema>;

let cached: Db | null = null;

export function getDb(): Db {
  if (!cached) {
    cached = drizzle(cf.DB, { schema: schemaModule.schema });
  }
  return cached;
}
