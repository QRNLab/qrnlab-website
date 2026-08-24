import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'sqlite',
  schema: './worker/lib/schema.ts',
  out: './drizzle',
});
