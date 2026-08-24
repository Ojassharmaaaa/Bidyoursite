import { sql } from '@/db';
import { maskHandle } from './mask';

/**
 * Public bid history. Bidder handles are masked and `max_amount_cents` is
 * never selected — a bidder's ceiling must not leak through this route.
 */
export async function bidHistory(auctionId: number, limit = 20) {
  const rows = await sql`
    SELECT b.amount_cents, b.created_at, b.kind, u.handle, b.bidder_id
    FROM bids b JOIN users u ON u.id = b.bidder_id
    WHERE b.auction_id = ${auctionId}
    ORDER BY b.amount_cents DESC
    LIMIT ${limit}
  `;
  return rows.map((r) => ({
    amount_cents: Number(r.amount_cents),
    created_at: new Date(r.created_at).toISOString(),
    kind: r.kind as string,
    bidder_id: Number(r.bidder_id),
    handle: maskHandle(r.handle as string),
  }));
}
