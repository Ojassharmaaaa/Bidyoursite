import postgres from 'postgres';

type Sql = ReturnType<typeof postgres>;

declare global {
  // eslint-disable-next-line no-var
  var __bysSql: Sql | undefined;
}

/**
 * The connection is created on first query, not on import.
 *
 * Next collects route configuration at build time by importing every module,
 * and a build machine has no DATABASE_URL. Connecting eagerly here fails the
 * build; connecting lazily means a missing URL only surfaces when something
 * actually tries to reach the database.
 *
 * `max: 5` keeps a serverless fleet from exhausting connection slots — point
 * DATABASE_URL at a pooler (Neon pooled endpoint, Supabase pgbouncer) in
 * production.
 */
function connect(): Sql {
  if (global.__bysSql) return global.__bysSql;

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.');
  }
  const client = postgres(url, {
    max: 5,
    idle_timeout: 20,
    ssl: url.includes('localhost') || url.includes('127.0.0.1') ? false : 'require',
  });
  global.__bysSql = client;
  return client;
}

/**
 * Proxy so `sql\`...\`` (tagged template) and `sql.begin(...)` / `sql.json(...)`
 * both work while still deferring the connection.
 */
export const sql = new Proxy((() => {}) as unknown as Sql, {
  apply(_target, _thisArg, args: unknown[]) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (connect() as any)(...args);
  },
  get(_target, prop) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = connect() as any;
    const value = client[prop];
    return typeof value === 'function' ? value.bind(client) : value;
  },
}) as Sql;
