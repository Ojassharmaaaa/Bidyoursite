import { NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { sql } from '@/db';
import { onStage, touchPresence, marketStats } from '@/lib/drops';
import { currentUser } from '@/lib/auth';
import { maskHandle } from '@/lib/mask';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * The heartbeat behind the live stage: current price, bid feed, watcher count.
 * Returns public fields only — a bidder's ceiling (`max_amount_cents`) is never
 * selected here, so it cannot leak through the polling loop.
 */
export async function GET(req: Request) {
  const lot = await onStage();
  const stats = await marketStats();
  if (!lot) {
    return NextResponse.json({ live: false, stats }, { headers: { 'Cache-Control': 'no-store' } });
  }

  // Anonymous, rotating viewer key — enough to count heads, useless for tracking.
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'anon';
  const day = new Date().toISOString().slice(0, 10);
  const viewerKey = createHash('sha256').update(ip + day + (process.env.SESSION_SECRET || '')).digest('hex').slice(0, 32);
  const watching = await touchPresence(lot.auction_id, viewerKey);

  const rows = await sql`
    SELECT b.amount_cents, b.created_at, b.kind, b.bidder_id, u.handle
    FROM bids b JOIN users u ON u.id = b.bidder_id
    WHERE b.auction_id = ${lot.auction_id}
    ORDER BY b.amount_cents DESC
    LIMIT 12
  `;
  const me = await currentUser();

  return NextResponse.json(
    {
      live: true,
      stats,
      watching,
      auctionId: lot.auction_id,
      listingId: lot.listing_id,
      priceCents: lot.price_cents,
      bidCount: lot.bid_count,
      extensions: lot.extension_count,
      endsAt: lot.ends_at,
      leading: me ? lot.leading_bidder_id === me.id : false,
      feed: rows.map((r) => ({
        amount_cents: Number(r.amount_cents),
        at: new Date(r.created_at).toISOString(),
        kind: r.kind as string,
        who: me && Number(r.bidder_id) === me.id ? 'you' : maskHandle(r.handle as string),
      })),
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
