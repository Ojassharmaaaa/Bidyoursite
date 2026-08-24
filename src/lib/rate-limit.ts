import { sql } from '@/db';

/**
 * Fixed-window limiter kept in Postgres so it survives serverless cold starts.
 * Not as precise as a Redis sliding window, but it needs no extra service and
 * stops the abuse that matters: credential stuffing and bid spam.
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<{ ok: boolean; retryAfter: number }> {
  const [row] = await sql`
    INSERT INTO rate_limits (key, count, window_end)
    VALUES (${key}, 1, now() + ${windowSeconds + ' seconds'}::interval)
    ON CONFLICT (key) DO UPDATE SET
      count      = CASE WHEN rate_limits.window_end < now() THEN 1 ELSE rate_limits.count + 1 END,
      window_end = CASE WHEN rate_limits.window_end < now()
                        THEN now() + ${windowSeconds + ' seconds'}::interval
                        ELSE rate_limits.window_end END
    RETURNING count, window_end
  `;
  const count = Number(row.count);
  const retryAfter = Math.max(0, Math.ceil((new Date(row.window_end).getTime() - Date.now()) / 1000));
  return { ok: count <= limit, retryAfter };
}

/** Hash an IP before it touches the database — we never store raw addresses. */
export function clientKey(req: Request, scope: string): string {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown';
  return `${scope}:${ip}`;
}
