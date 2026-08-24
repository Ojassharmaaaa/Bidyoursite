import { sql } from '@/db';
import { tierRank } from './money';

/**
 * The Drop: exactly one lot holds the stage at a time.
 *
 * A partial unique index in the schema guarantees this at the database level,
 * so two cron invocations racing to promote the next lot cannot both win —
 * the loser's INSERT/UPDATE simply fails and it moves on.
 */

export type StageLot = {
  listing_id: number;
  auction_id: number;
  title: string;
  domain: string;
  category: string;
  tagline: string;
  why_selling: string;
  body: string;
  tech: string[];
  tier: string;
  verified: boolean;
  hue: number;
  mrr_cents: number;
  profit_cents: number;
  traffic: number;
  asset_age: string;
  seller: string;
  seller_id: number;
  price_cents: number;
  start_price_cents: number;
  buy_now_cents: number;
  bid_count: number;
  extension_count: number;
  status: string;
  starts_at: string | null;
  ends_at: string | null;
  queued_at: string;
  duration_minutes: number;
  leading_bidder_id: number | null;
};

function norm(r: Record<string, any>): StageLot {
  return {
    ...r,
    listing_id: Number(r.listing_id),
    auction_id: Number(r.auction_id),
    seller_id: Number(r.seller_id),
    mrr_cents: Number(r.mrr_cents),
    profit_cents: Number(r.profit_cents),
    traffic: Number(r.traffic),
    price_cents: Number(r.price_cents),
    start_price_cents: Number(r.start_price_cents),
    buy_now_cents: Number(r.buy_now_cents),
    bid_count: Number(r.bid_count),
    extension_count: Number(r.extension_count),
    duration_minutes: Number(r.duration_minutes),
    leading_bidder_id: r.leading_bidder_id ? Number(r.leading_bidder_id) : null,
    starts_at: r.starts_at ? new Date(r.starts_at).toISOString() : null,
    ends_at: r.ends_at ? new Date(r.ends_at).toISOString() : null,
    queued_at: new Date(r.queued_at).toISOString(),
  } as StageLot;
}

// Built inside a function so no query fragment is created at import time.
const cols = () => sql`
  l.id AS listing_id, a.id AS auction_id,
  l.title, l.domain, l.category, l.tagline, l.why_selling, l.body, l.tech, l.tier,
  l.verified, l.hue, l.mrr_cents, l.profit_cents, l.traffic, l.asset_age,
  u.handle AS seller, l.seller_id,
  a.current_price_cents AS price_cents, a.start_price_cents, a.buy_now_cents,
  a.bid_count, a.extension_count, a.status, a.starts_at, a.ends_at, a.queued_at,
  a.duration_minutes, a.leading_bidder_id
`;


/** The lot currently on stage, if any. */
export async function onStage(): Promise<StageLot | null> {
  const [row] = await sql`
    SELECT ${cols()} FROM auctions a
    JOIN listings l ON l.id = a.listing_id
    JOIN users u ON u.id = l.seller_id
    WHERE a.status = 'live'
    LIMIT 1
  `;
  return row ? norm(row) : null;
}

/**
 * What is coming up. Paid tiers jump the queue — that is the entire value of
 * the $5 and $10 listings, and it is stated plainly on the pricing page rather
 * than hidden.
 */
export async function upNext(limit = 8): Promise<StageLot[]> {
  const rows = await sql`
    SELECT ${cols()} FROM auctions a
    JOIN listings l ON l.id = a.listing_id
    JOIN users u ON u.id = l.seller_id
    WHERE a.status = 'queued'
    ORDER BY a.queued_at ASC
    LIMIT 40
  `;
  return rows
    .map(norm)
    .sort((x, y) => tierRank(y.tier) - tierRank(x.tier) || +new Date(x.queued_at) - +new Date(y.queued_at))
    .slice(0, limit);
}

export async function recentlySold(limit = 6): Promise<StageLot[]> {
  const rows = await sql`
    SELECT ${cols()} FROM auctions a
    JOIN listings l ON l.id = a.listing_id
    JOIN users u ON u.id = l.seller_id
    WHERE a.status = 'ended'
    ORDER BY a.settled_at DESC NULLS LAST
    LIMIT ${limit}
  `;
  return rows.map(norm);
}

export async function getLot(listingId: number): Promise<StageLot | null> {
  const [row] = await sql`
    SELECT ${cols()} FROM auctions a
    JOIN listings l ON l.id = a.listing_id
    JOIN users u ON u.id = l.seller_id
    WHERE l.id = ${listingId}
  `;
  return row ? norm(row) : null;
}

/**
 * Promote the front of the queue onto the stage. No-op if a lot is already
 * live. Returns the listing id promoted, or null.
 */
export async function promoteNextDrop(): Promise<number | null> {
  const [live] = await sql`SELECT 1 FROM auctions WHERE status = 'live' LIMIT 1`;
  if (live) return null;

  const queued = await upNext(1);
  if (!queued.length) return null;
  const next = queued[0];

  try {
    const [row] = await sql`
      UPDATE auctions SET
        status    = 'live',
        starts_at = now(),
        ends_at   = now() + (duration_minutes || ' minutes')::interval
      WHERE id = ${next.auction_id} AND status = 'queued'
      RETURNING listing_id
    `;
    if (!row) return null;
    await sql`
      INSERT INTO notifications (user_id, kind, title, body, link)
      VALUES (${next.seller_id}, 'live', 'Your lot is on stage',
              ${next.title + ' is live now'}, ${'/lot/' + next.listing_id})
    `;
    await sql`
      INSERT INTO audit_log (actor_id, action, subject_type, subject_id, detail)
      VALUES (NULL, 'drop.promote', 'auction', ${next.auction_id}, ${sql.json({ tier: next.tier })})
    `;
    return Number(row.listing_id);
  } catch {
    // Lost the race against another worker holding the one-live index.
    return null;
  }
}

/** Heartbeat a viewer and return how many are watching in the last 45s. */
export async function touchPresence(auctionId: number, viewerKey: string): Promise<number> {
  await sql`
    INSERT INTO presence (auction_id, viewer_key, seen_at)
    VALUES (${auctionId}, ${viewerKey}, now())
    ON CONFLICT (auction_id, viewer_key) DO UPDATE SET seen_at = now()
  `;
  const [row] = await sql`
    SELECT count(*) AS n FROM presence
    WHERE auction_id = ${auctionId} AND seen_at > now() - interval '45 seconds'
  `;
  const n = Number(row.n);
  await sql`
    UPDATE auctions SET watchers_peak = GREATEST(watchers_peak, ${n})
    WHERE id = ${auctionId}
  `;
  return n;
}

export async function watcherCount(auctionId: number): Promise<number> {
  const [row] = await sql`
    SELECT count(*) AS n FROM presence
    WHERE auction_id = ${auctionId} AND seen_at > now() - interval '45 seconds'
  `;
  return Number(row.n);
}

export async function marketStats() {
  const [row] = await sql`
    SELECT
      (SELECT count(*) FROM auctions WHERE status = 'queued')                  AS queued,
      (SELECT count(*) FROM auctions WHERE status = 'ended')                   AS sold,
      (SELECT coalesce(sum(current_price_cents), 0)
         FROM auctions WHERE status = 'ended' AND leading_bidder_id IS NOT NULL) AS volume,
      (SELECT count(*) FROM bids)                                              AS bids
  `;
  return {
    queued: Number(row.queued),
    sold: Number(row.sold),
    volumeCents: Number(row.volume),
    bids: Number(row.bids),
  };
}
