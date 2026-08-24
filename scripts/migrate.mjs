/**
 * Applies src/db/schema.sql. Idempotent — every statement is IF NOT EXISTS,
 * so running it repeatedly is safe.
 *
 *   node scripts/migrate.mjs
 */
import { readFileSync } from 'node:fs';
import postgres from 'postgres';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set. Copy .env.example to .env.local and export it.');
  process.exit(1);
}

const sql = postgres(url, {
  max: 1,
  ssl: url.includes('localhost') || url.includes('127.0.0.1') ? false : 'require',
});

const schema = readFileSync(new URL('../src/db/schema.sql', import.meta.url), 'utf8');

try {
  await sql.unsafe(schema);
  console.log('schema applied');
} catch (err) {
  console.error('migration failed:', err.message);
  process.exitCode = 1;
} finally {
  await sql.end();
}
