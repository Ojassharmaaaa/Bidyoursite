import { sql } from '@/db';
import { increment, minNextBid, SNIPE_WINDOW_MS, MAX_EXTENSIONS, money } from './money';
import { promoteNextDrop } from './drops';

export type BidResult =
  | { ok: true; leading: boolean; priceCents: number; extended: boolean; message: string }
  | { ok: false; code: string; message: string };

/**
 * Place a proxy bid.
 *
 * The caller submits the MOST they are willing to pay. The visible price only
 * ever rises to one increment above the runner-up's ceiling — so a bidder who
 * names $5,000 against a $3,200 rival pays $3,250, not $5,000.
 *
 * Everything happens inside one transaction holding `FOR UPDATE` on the auction
 * row, so simultaneous bidders serialise instead of racing. Nothing here trusts
 * a single value supplied by the client except the amount itself, which is
 * re-validated against the locked row.
 */
export async function placeBid(
  auctionId: number,
  bidderId: number,
  maxCents: number,
): Promise<BidResult> {
  if (!Number.isSafeInteger(maxCents) || maxCents <= 0) {
    return { ok: false, code: 'bad_amount', message: 'Enter a valid amount.' };
  }

  try {
    return await sql.begin(async (tx) => {
      const [auction] = await tx`
        SELECT a.*, l.seller_id, l.title
        FROM auctions a
        JOIN listings l ON l.id = a.listing_id
        WHERE a.id = ${auctionId}
        FOR UPDATE OF a
      `;
      if (!auction) return { ok: false, code: 'not_found', message: 'That lot does not exist.' };

      // The server clock decides, never the browser's.
      const now = new Date();
      const endsAt = new Date(auction.ends_at);
      if (auction.status !== 'live' || now >= endsAt) {
        return { ok: false, code: 'ended', message: 'This auction has already ended.' };
      }
      if (Number(auction.seller_id) === bidderId) {
        return { ok: false, code: 'own_lot', message: 'You cannot bid on your own listing.' };
      }

      const [bidder] = await tx`
        SELECT id, status, bid_limit_cents FROM users WHERE id = ${bidderId}
      `;
      if (!bidder || bidder.status !== 'active') {
        return { ok: false, code: 'blocked', message: 'Your account cannot bid right now.' };
      }
      if (maxCents > Number(bidder.bid_limit_cents)) {
        return {
          ok: false,
          code: 'over_limit',
          message: `That exceeds your bidding limit of ${money(bidder.bid_limit_cents)}.`,
        };
      }

      const price = Number(auction.current_price_cents);
      const startPrice = Number(auction.start_price_cents);
      const leaderId = auction.leading_bidder_id ? Number(auction.leading_bidder_id) : null;
      const hasBids = Number(auction.bid_count) > 0;

      const required = hasBids ? minNextBid(price) : startPrice;
      if (maxCents < required) {
        return {
          ok: false,
          code: 'too_low',
          message: `Minimum bid is ${money(required)}.`,
        };
      }

      // The leader's ceiling is read here and never leaves this function.
      let leaderMax = 0;
      if (leaderId) {
        const [row] = await tx`
          SELECT MAX(max_amount_cents) AS m FROM bids
          WHERE auction_id = ${auctionId} AND bidder_id = ${leaderId}
        `;
        leaderMax = Number(row?.m ?? 0);
      }

      let newPrice = price;
      let newLeader = leaderId;
      let outbidUser: number | null = null;

      if (!hasBids) {
        newPrice = startPrice;
        newLeader = bidderId;
      } else if (leaderId === bidderId) {
        // Raising your own ceiling. Price does not move — you are already winning.
        if (maxCents <= leaderMax) {
          return {
            ok: false,
            code: 'lower_max',
            message: `Your ceiling is already ${money(leaderMax)}. Enter more to raise it.`,
          };
        }
        newPrice = price;
        newLeader = bidderId;
      } else if (maxCents > leaderMax) {
        // Challenger wins: pay one increment over the old leader, capped at own max.
        newPrice = Math.min(maxCents, leaderMax + increment(leaderMax));
        if (newPrice <= price) newPrice = Math.min(maxCents, minNextBid(price));
        newLeader = bidderId;
        outbidUser = leaderId;
      } else {
        // Challenger loses to the standing ceiling, but pushes the price up.
        newPrice = Math.min(leaderMax, maxCents + increment(maxCents));
        if (newPrice <= price) newPrice = Math.min(leaderMax, minNextBid(price));
        newLeader = leaderId;
      }

      // Anti-snipe: late bids buy everyone else more time.
      let extended = false;
      let endsAtNew = endsAt;
      if (
        endsAt.getTime() - now.getTime() < SNIPE_WINDOW_MS &&
        Number(auction.extension_count) < MAX_EXTENSIONS
      ) {
        endsAtNew = new Date(now.getTime() + SNIPE_WINDOW_MS);
        extended = true;
      }

      // The challenger's row always records their true ceiling; the visible
      // amount is what the auction moved to on their account.
      await tx`
        INSERT INTO bids (auction_id, bidder_id, amount_cents, max_amount_cents, kind)
        VALUES (${auctionId}, ${bidderId}, ${newLeader === bidderId ? newPrice : Math.min(maxCents, newPrice)},
                ${maxCents}, 'manual')
        ON CONFLICT (auction_id, amount_cents) DO NOTHING
      `;
      if (newLeader !== bidderId && newLeader !== null) {
        // The standing leader's proxy answered automatically.
        await tx`
          INSERT INTO bids (auction_id, bidder_id, amount_cents, max_amount_cents, kind)
          VALUES (${auctionId}, ${newLeader}, ${newPrice}, ${leaderMax}, 'proxy')
          ON CONFLICT (auction_id, amount_cents) DO NOTHING
        `;
      }

      await tx`
        UPDATE auctions SET
          current_price_cents = ${newPrice},
          leading_bidder_id   = ${newLeader},
          bid_count           = bid_count + 1,
          ends_at             = ${endsAtNew},
          extension_count     = extension_count + ${extended ? 1 : 0}
        WHERE id = ${auctionId}
      `;

      if (outbidUser) {
        await tx`
          INSERT INTO notifications (user_id, kind, title, body, link)
          VALUES (${outbidUser}, 'out', 'You were outbid',
                  ${auction.title + ' is now ' + money(newPrice)},
                  ${'/lot/' + auction.listing_id})
        `;
      }
      await tx`
        INSERT INTO audit_log (actor_id, action, subject_type, subject_id, detail)
        VALUES (${bidderId}, 'bid.place', 'auction', ${auctionId},
                ${sql.json({ price: newPrice, leader: newLeader, extended })})
      `;

      return {
        ok: true,
        leading: newLeader === bidderId,
        priceCents: newPrice,
        extended,
        message:
          newLeader === bidderId
            ? `You are the highest bidder at ${money(newPrice)}.`
            : `Outbid — a standing proxy pushed the price to ${money(newPrice)}.`,
      };
    });
  } catch (err) {
    console.error('placeBid failed', err);
    return { ok: false, code: 'error', message: 'Could not place that bid. Try again.' };
  }
}

/**
 * Close every auction whose clock has run out. Idempotent and safe to run
 * concurrently — the row lock plus the status check means a lot can only be
 * settled once, however many times this fires.
 */
export async function closeDueAuctions(): Promise<number> {
  const due = await sql`
    SELECT id FROM auctions
    WHERE status = 'live' AND ends_at <= now()
    LIMIT 200
  `;
  let closed = 0;

  for (const { id } of due) {
    await sql.begin(async (tx) => {
      const [a] = await tx`
        SELECT a.*, l.title, l.seller_id, l.id AS listing_id
        FROM auctions a JOIN listings l ON l.id = a.listing_id
        WHERE a.id = ${id} AND a.status = 'live' AND a.ends_at <= now()
        FOR UPDATE OF a
      `;
      if (!a) return; // another worker got there first

      await tx`
        UPDATE auctions SET status = 'ended', settled_at = now() WHERE id = ${id}
      `;
      if (a.leading_bidder_id) {
        await tx`
          INSERT INTO notifications (user_id, kind, title, body, link)
          VALUES (${a.leading_bidder_id}, 'won', 'You won',
                  ${a.title + ' at ' + money(a.current_price_cents)},
                  ${'/lot/' + a.listing_id}),
                 (${a.seller_id}, 'won', 'Your lot sold',
                  ${a.title + ' closed at ' + money(a.current_price_cents)},
                  ${'/lot/' + a.listing_id})
        `;
      } else {
        await tx`
          INSERT INTO notifications (user_id, kind, title, body, link)
          VALUES (${a.seller_id}, 'time', 'Your lot ended without a bid',
                  ${a.title + ' — you can relist once for free'},
                  ${'/lot/' + a.listing_id})
        `;
      }
      await tx`
        INSERT INTO audit_log (actor_id, action, subject_type, subject_id, detail)
        VALUES (NULL, 'auction.close', 'auction', ${id},
                ${sql.json({ price: Number(a.current_price_cents), winner: a.leading_bidder_id })})
      `;
      closed++;
    });
  }
  // The stage must never sit empty while a queue exists.
  await promoteNextDrop();
  return closed;
}

/** Treat anything past its clock as ended, even if the sweep has not run yet. */
export function isLive(a: { status: string; ends_at: string | Date }): boolean {
  return a.status === 'live' && new Date(a.ends_at).getTime() > Date.now();
}
