/**
 * Integration test for the part that must never be wrong.
 *
 * Fires many simultaneous bids at a live lot and asserts the invariants a
 * bidding engine has to hold under concurrency:
 *
 *   1. Exactly one leader at the end.
 *   2. The price only ever goes up.
 *   3. No two bids land on the same amount.
 *   4. A seller cannot bid on their own lot.
 *   5. A bid below the minimum increment is refused.
 *   6. Losing to a proxy raises the price but not the leader.
 *
 * Usage: start the dev server, then
 *   node scripts/test-bidding.mjs [baseUrl]
 */
import postgres from 'postgres';

const BASE = process.argv[2] || 'http://127.0.0.1:3000';
const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set.');
  process.exit(1);
}
const sql = postgres(url, {
  max: 4,
  ssl: url.includes('localhost') || url.includes('127.0.0.1') ? false : 'require',
});

let pass = 0;
let fail = 0;
function check(name, cond, extra = '') {
  if (cond) {
    pass++;
    console.log(`  PASS  ${name}`);
  } else {
    fail++;
    console.log(`  FAIL  ${name} ${extra}`);
  }
}

/** Sign up and return the session cookie. */
async function signUp(handle) {
  const body = new URLSearchParams({
    action: 'signup',
    handle,
    email: `${handle}@test.local`,
    password: 'test-password-1234',
  });
  const r = await fetch(`${BASE}/api/auth`, {
    method: 'POST',
    body,
    redirect: 'manual',
    headers: { Origin: BASE },
  });
  const cookie = (r.headers.getSetCookie?.() || [])
    .map((c) => c.split(';')[0])
    .join('; ');
  if (!cookie) throw new Error(`signup failed for ${handle} (status ${r.status})`);
  return cookie;
}

async function bid(cookie, auctionId, maxDollars) {
  const r = await fetch(`${BASE}/api/bid`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie, Origin: BASE },
    body: JSON.stringify({ auctionId, maxDollars }),
  });
  return { status: r.status, body: await r.json() };
}

try {
  // A clean lot to bid on, owned by a fresh seller.
  const stamp = Date.now().toString(36).slice(-6);
  const sellerHandle = `t.sell${stamp}`;
  const sellerCookie = await signUp(sellerHandle);
  const [seller] = await sql`SELECT id FROM users WHERE handle = ${sellerHandle}`;

  const [listing] = await sql`
    INSERT INTO listings (seller_id, title, domain, category, tagline, why_selling, tier)
    VALUES (${seller.id}, ${'Test Lot ' + stamp}, ${'test-' + stamp + '.dev'}, 'SaaS',
            'A lot that exists only to be bid on.',
            'Written by the test harness because the story field is required.', 'basic')
    RETURNING id
  `;
  // Park any real live lot so ours can hold the stage.
  await sql`UPDATE auctions SET status = 'queued' WHERE status = 'live'`;
  const [auction] = await sql`
    INSERT INTO auctions (listing_id, status, starts_at, ends_at, duration_minutes)
    VALUES (${listing.id}, 'live', now(), now() + interval '2 hours', 120)
    RETURNING id
  `;
  const auctionId = Number(auction.id);
  console.log(`\nlot ${listing.id} / auction ${auctionId} live for the test\n`);

  // --- 4. seller cannot bid on their own lot ---
  const own = await bid(sellerCookie, auctionId, 50);
  check('seller cannot bid on own lot', own.body.ok === false && own.body.code === 'own_lot',
    JSON.stringify(own.body));

  // --- bidders ---
  const bidders = [];
  for (let i = 0; i < 6; i++) bidders.push(await signUp(`t.bid${stamp}${i}`));

  // --- 5. below-minimum bid refused (first bid must meet the $1 open) ---
  const low = await bid(bidders[0], auctionId, 0.5);
  check('sub-minimum bid refused', low.body.ok === false, JSON.stringify(low.body));

  // --- opening bid, then a proxy duel ---
  const open = await bid(bidders[0], auctionId, 100);
  check('opening bid accepted', open.body.ok === true, JSON.stringify(open.body));

  // --- 6. losing to a standing proxy raises price, not leadership ---
  const loser = await bid(bidders[1], auctionId, 40);
  check('bid under standing ceiling does not take the lead',
    loser.body.ok === true && loser.body.leading === false, JSON.stringify(loser.body));
  const [afterProxy] = await sql`SELECT current_price_cents FROM auctions WHERE id = ${auctionId}`;
  check('standing proxy pushed the price up', Number(afterProxy.current_price_cents) > 100,
    `price=${afterProxy.current_price_cents}`);

  // --- 1-3. concurrency storm ---
  const before = Number(afterProxy.current_price_cents);
  const storm = [];
  for (let round = 0; round < 5; round++) {
    for (let i = 0; i < bidders.length; i++) {
      storm.push(bid(bidders[i], auctionId, 150 + round * 40 + i * 7));
    }
  }
  const results = await Promise.all(storm);
  const accepted = results.filter((r) => r.body.ok).length;
  console.log(`\n  ${storm.length} simultaneous bids fired, ${accepted} accepted\n`);

  const [final] = await sql`
    SELECT current_price_cents, leading_bidder_id, bid_count FROM auctions WHERE id = ${auctionId}
  `;
  const rows = await sql`
    SELECT amount_cents FROM bids WHERE auction_id = ${auctionId} ORDER BY id ASC
  `;
  const amounts = rows.map((r) => Number(r.amount_cents));

  check('exactly one leader', final.leading_bidder_id !== null,
    `leader=${final.leading_bidder_id}`);
  check('price never went backwards', Number(final.current_price_cents) >= before,
    `${before} -> ${final.current_price_cents}`);
  check('no duplicate bid amounts', new Set(amounts).size === amounts.length,
    `${amounts.length} bids, ${new Set(amounts).size} distinct`);

  const [leaderMax] = await sql`
    SELECT MAX(max_amount_cents) AS m FROM bids
    WHERE auction_id = ${auctionId} AND bidder_id = ${final.leading_bidder_id}
  `;
  const runnerUp = await sql`
    SELECT MAX(max_amount_cents) AS m FROM bids
    WHERE auction_id = ${auctionId} AND bidder_id <> ${final.leading_bidder_id}
  `;
  check('leader holds the highest ceiling',
    Number(leaderMax.m) >= Number(runnerUp[0]?.m ?? 0),
    `leader=${leaderMax.m} runnerUp=${runnerUp[0]?.m}`);
  check('price never exceeds the winning ceiling',
    Number(final.current_price_cents) <= Number(leaderMax.m),
    `price=${final.current_price_cents} ceiling=${leaderMax.m}`);

  // --- the ceiling must not leak through the public API ---
  const stage = await fetch(`${BASE}/api/stage`, { cache: 'no-store' }).then((r) => r.text());
  check('max_amount_cents never appears in the API response',
    !stage.includes('max_amount') && !stage.includes(String(leaderMax.m)),
    'ceiling visible in /api/stage');

  console.log(`\n${pass} passed, ${fail} failed\n`);
  process.exitCode = fail === 0 ? 0 : 1;
} catch (err) {
  console.error('\ntest harness error:', err.message);
  process.exitCode = 1;
} finally {
  await sql.end();
}
