# BidYourSite

**One project on the block at a time.** A home for abandoned side projects —
websites, domains, newsletters, apps, stores. Every lot opens at **$1**, one holds
the stage at a time, and the room decides what it is worth.

Next.js 15 (App Router) + Postgres. Bidding is server-authoritative: the client is
treated as hostile and every rule is enforced inside a database transaction.

---

## The format

- **The Drop** — exactly one auction is live at any moment, enforced by a partial
  unique index in Postgres, not by application hope. Everything else waits in a queue
  and is promoted automatically when the stage clears.
- **The confession** — every listing must answer *"why are you selling?"* in at least
  40 characters, and it sits above the metrics. A spec sheet hides why a project
  stalled; a straight answer is what makes the numbers believable.
- **Trading cards** — each lot gets a generated stat card (`/api/card/[id]`) with
  rarity derived from monthly revenue. It doubles as the OG image.
- **Live stage** — watcher count, scrolling bid feed, price-bump animation, and an
  `EXTENDED +2:00` slam when a late bid pushes the clock.

## Bidding rules

| Rule | Behaviour |
|---|---|
| Opening price | $1, no reserves |
| Increments | $5 under $100 · $10 to $500 · $25 to $2k · $50 to $10k · $100 above |
| Proxy bidding | You name a ceiling; the engine bids the minimum needed |
| Your ceiling | Never sent to any client, ever |
| Anti-snipe | A bid inside the final 2 minutes extends the clock by 2 minutes |
| Own lot | Sellers are blocked from bidding on themselves |
| Closing | A cron sweep, plus a read-time guard so a late cron cannot let a bid through |

## Pricing

Three fixed tiers, charged once for a queue position. **No commission on the sale.**

| Tier | Price | Buys |
|---|---|---|
| Basic | $1 | A place in the queue, 7-day cap |
| Featured | $5 | Jumps the queue, badge, homepage placement, 14-day cap |
| Spotlight | $10 | Front of the queue, homepage hero, social post, priority verification |

Payments are Phase 4 (Dodo Payments) — see `ARCHITECTURE.md`. Listings are currently
free to queue.

---

## Running it

You need a Postgres database. [Neon](https://neon.tech) and
[Supabase](https://supabase.com) both have a free tier; either works.

**1. Create `.env.local`** in the project root:

```
DATABASE_URL=postgres://user:password@host/dbname?sslmode=require
SESSION_SECRET=some-long-random-string
CRON_SECRET=another-long-random-string
```

Generate the secrets with:

```bash
node -e "console.log(crypto.randomUUID()+crypto.randomUUID())"
```

**2. Create the schema and seed a demo room:**

```bash
npm run db:migrate && npm run db:seed
```

**3. Start it:**

```bash
npm run dev
```

The seed prints demo accounts you can sign in with. One lot starts live on the stage
and the rest sit in the queue.

## Testing the bidding engine

The engine is the part that must never be wrong, so it has its own harness. With the
dev server running:

```bash
npm run test:bidding
```

It fires 30 simultaneous bids at a live lot and asserts: exactly one leader, the price
never goes backwards, no two bids share an amount, the leader holds the highest
ceiling, the price never exceeds that ceiling, sellers cannot bid on their own lot,
sub-minimum bids are refused, and no ceiling leaks through the public API.

## Deploying

Import the repo on Vercel. It auto-detects Next.js — no build settings to change. Then:

- Add `DATABASE_URL`, `SESSION_SECRET` and `CRON_SECRET` in project settings.
- Point `DATABASE_URL` at a **pooled** connection string (Neon pooled endpoint or
  Supabase pgbouncer), not the direct one.
- `vercel.json` registers a cron on `/api/cron/close` every minute. It closes finished
  lots and promotes the next from the queue.
- Enable Web Analytics in the Analytics tab.

## Layout

```
app/            pages and route handlers
  page.tsx      the stage — live lot, queue, hall of fame
  Stage.tsx     client component: polling, countdown, bid form, feed
  lot/[id]/     permalink for any lot, past or queued
  api/          bid · auth · listings · stage · card · cron
src/lib/
  bidding.ts    placeBid transaction, closeDueAuctions
  drops.ts      the queue, promotion, presence
  money.ts      increments, tiers, rarity — the only price definitions
  card.ts       trading-card SVG
  auth.ts       scrypt hashing, opaque sessions, origin checks
src/db/
  schema.sql    the whole schema, idempotent
demo/           the original static prototype, kept for reference
```

`demo/` is the old localStorage prototype. It is no longer wired up — kept only
because the design system in `assets/css/style.css` is shared with the live app.

---

## Note on originality

The concept — a marketplace where listings open at a single dollar — was inspired by
firstbid.lol, and the minimal three-page shape echoes theirs. Everything here was
written from scratch and diverges in the parts that matter: the one-lot-at-a-time
format, the required seller confession, generated trading cards, real server-side
proxy bidding with anti-snipe, and the $1/$5/$10 queue-position pricing with zero
commission.
