# BidYourSite — production architecture & security plan

Status: **proposal, not yet built.** The code in this repo today is a client-side demo:
all state lives in `localStorage`, bids are simulated, nothing is shared between users.
This document specifies what has to exist before real people can bid real money.

Decisions already made:

| Decision | Choice |
|---|---|
| Money model | Dodo Payments charges **platform fees only**; the asset sale settles through a licensed escrow partner |
| Stack | Next.js (App Router) + Postgres, deployed on Vercel |
| Delivery | This plan first, code after review |

---

## 1. The constraint that shapes everything

**Dodo Payments is a Merchant of Record.** Dodo becomes the legal seller of record, appears
on the buyer's statement, and absorbs VAT/GST filing, chargebacks and PCI scope. Their
documented surface is one-time payments, subscriptions, usage-based and credit billing —
[integration guide](https://docs.dodopayments.com/developer-resources/integration-guide).

There is **no documented marketplace, split-payment, connected-account or third-party
payout capability.** Dodo can charge *your* customers for *your* products. It cannot take
$4,200 from a buyer and deposit it in a seller's bank account.

Separately: holding a buyer's funds on a seller's behalf is **money transmission** in most
jurisdictions (US state MTLs, EU PSD2 payment-institution authorisation, India PA/PG rules).
Doing it without a licence or a licensed partner is not a technical risk, it is a regulatory
one. So:

```
Buyer ──pays asset price──► Escrow partner ──releases──► Seller
   │                        (licensed, holds funds)
   └──pays 0% premium
Seller ──pays $1 listing + 5% success fee──► Dodo Payments ──► You
```

Platform money and user money never mix. You are a venue and an invoicing party, never a
custodian.

---

## 2. Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 15 App Router, TypeScript strict | One repo, one deploy, server-side auth on every route |
| DB | Postgres (Neon or Supabase), Drizzle ORM | Transactions with row locks are non-negotiable for bidding |
| Cache / limits | Upstash Redis | Rate limiting, idempotency keys, realtime fan-out |
| Realtime | SSE from a Next route handler, Redis pub/sub behind it | Simpler than WebSockets on serverless; auctions are read-heavy |
| Auth | Auth.js (email + password with argon2id, plus GitHub/Google OAuth) | Sessions in httpOnly cookies, not JWTs in localStorage |
| Jobs | Vercel Cron (1-minute tick) + a durable queue for webhooks | Auction closing must not depend on any browser being open |
| Payments | Dodo Payments (platform fees) | MoR removes tax and PCI burden |
| Escrow | Escrow.com API, or manual handoff in v1 | Licensed custody of buyer funds |
| Files | Vercel Blob or S3 with signed URLs | Revenue screenshots, logos |
| Errors | Sentry | With PII scrubbing on |

The existing HTML/CSS becomes React components; `assets/css/style.css` transfers nearly
as-is — the design system is already token-based. `assets/js/app.js` is **thrown away**:
every function in it becomes a server action, because none of it can be trusted client-side.

---

## 3. Data model

Money is **integer minor units** (cents) in `bigint` columns everywhere. Never floats, never
`money`. Amounts are USD-only in v1; multi-currency needs a rate-snapshot table and is out
of scope.

```sql
users            id, email(citext unique), password_hash, name, handle(unique),
                 email_verified_at, totp_secret_enc, role, status,
                 kyc_status, bid_limit_cents, created_at, deleted_at

sessions         id, user_id, token_hash, ip, user_agent, expires_at, revoked_at

listings         id, seller_id, slug(unique), title, domain, category, tagline,
                 body_md, tech[], mrr_cents, profit_cents, traffic_monthly, asset_age,
                 verification_tier, status(draft|pending_payment|live|closed|cancelled),
                 listing_fee_payment_id, created_at

auctions         id, listing_id(unique), starts_at, ends_at, original_ends_at,
                 start_price_cents, current_price_cents, buy_now_cents,
                 leading_bidder_id, bid_count, extension_count,
                 status(scheduled|live|ended|settled|cancelled), version(int)

bids             id, auction_id, bidder_id, amount_cents, max_amount_cents,
                 kind(manual|proxy|buy_now), is_winning, created_at, ip_hash, device_hash
                 UNIQUE (auction_id, amount_cents)

watchlist        user_id, listing_id, created_at   PK(user_id, listing_id)

payments         id, user_id, dodo_payment_id(unique), purpose(listing_fee|success_fee|deposit),
                 amount_cents, status, raw_payload jsonb, created_at

webhook_events   id, provider, webhook_id(unique), event_type, payload jsonb,
                 received_at, processed_at, attempts, last_error

settlements      id, auction_id, escrow_ref, buyer_id, seller_id, amount_cents,
                 fee_cents, status, opened_at, released_at

audit_log        id, actor_id, action, subject_type, subject_id, before jsonb,
                 after jsonb, ip_hash, created_at        -- append-only

notifications    id, user_id, kind, title, body, link, read_at, created_at
```

Indexes that matter: `auctions(status, ends_at)` for the closing sweep,
`bids(auction_id, amount_cents desc)` for the leaderboard, `listings(status, category)`
for browse.

---

## 4. Bidding — the part that must be exactly right

Every rule the demo enforces in JavaScript is advisory. All of it moves server-side, and
the client is treated as hostile.

### 4.1 The transaction

A bid is one Postgres transaction holding a row lock on the auction. Concurrent bids
serialise behind that lock; there is no read-modify-write window.

```ts
await db.transaction(async (tx) => {
  const auction = await tx
    .select().from(auctions)
    .where(eq(auctions.id, auctionId))
    .for('update');                       // ← blocks concurrent bidders

  assert(auction.status === 'live');
  assert(now < auction.ends_at);          // server clock, never the client's
  assert(bidder.id !== listing.seller_id);
  assert(bidder.email_verified_at && bidder.status === 'active');
  assert(amount <= bidder.bid_limit_cents);
  assert(amount >= minNextBid(auction.current_price_cents));
  assert(amount > auction.current_price_cents);

  // …proxy resolution (4.2), anti-snipe (4.3), insert bid, update auction…
});
```

Validation order is deliberate: cheap checks before expensive ones, and every failure
returns the same shape so timing does not leak whether an account exists.

The `UNIQUE (auction_id, amount_cents)` constraint is a second line of defence — two bids
can never land on the same price even if the lock were somehow bypassed.

### 4.2 Proxy bidding (eBay semantics)

A bidder submits a **maximum**. The visible price is the *second*-highest maximum plus one
increment, capped at the leader's maximum.

```
leader max = $5,000, challenger max = $3,200, increment at that band = $50
→ visible price becomes $3,250, leader still ahead, nobody sees $5,000
```

`max_amount_cents` is **never** sent to any client — not to the seller, not in an API
response, not in a realtime event. It is the single most sensitive field in the schema.
The demo's `BYS.state.autobids` object, readable by anyone with devtools, is exactly the
bug this replaces.

Increment bands stay as in the demo: $5 under $100, $10 to $500, $25 to $2k, $50 to $10k,
$100 above.

### 4.3 Anti-snipe

Inside the transaction: if `ends_at - now < 120s`, set `ends_at = now + 120s` and increment
`extension_count`. Cap at, say, 50 extensions to bound a pathological auction, and log
every extension to the audit trail.

### 4.4 Closing

Never trust a timer in a browser tab. Two mechanisms, belt and braces:

1. **Vercel Cron every minute** sweeps `WHERE status='live' AND ends_at <= now()`, and
   closes each in its own transaction — idempotent, safe to re-run, safe to run twice
   concurrently.
2. **Read-time guard**: any request that loads an auction past `ends_at` treats it as
   ended regardless of the stored status, so a late cron never lets a bid through.

On close: mark winner, create the settlement row, raise the success-fee invoice, notify
both parties, start the payment clock.

### 4.5 Non-payment

Winner has 48 hours. Miss it and: deposit forfeited, account restricted, second-chance
offer to the underbidder at their last bid. All state transitions are in the audit log.

### 4.6 Realtime

Bid accepted → publish to Redis channel `auction:{id}` → SSE stream fans out to viewers.
Events carry only public fields (`current_price_cents`, `bid_count`, `ends_at`, masked
bidder handle). Clients reconcile on reconnect by refetching, never by trusting their own
accumulated state.

---

## 5. Security

Grouped by what an attacker would actually try.

### 5.1 Authentication

- Passwords: **argon2id**, per-user salt, minimum 12 characters, checked against a breached-
  password list (k-anonymity range query to HIBP).
- Sessions: opaque random token, **hashed at rest**, in an `httpOnly; Secure; SameSite=Lax`
  cookie. Not JWTs in `localStorage` — an XSS then reads every token.
- Rotate the session ID on login and on privilege change. Revoke all sessions on password
  change.
- Email verification required before the first bid.
- **TOTP 2FA mandatory for sellers** before any payout or bank-detail change.
- Login: constant-time comparison, generic error text, exponential backoff, account lockout
  after repeated failures from distinct IPs.

### 5.2 Authorisation

Deny by default. Every route handler re-derives the actor from the session cookie and
re-checks ownership against the database — never from a client-supplied `userId`, never
from a hidden form field. A single shared `requireUser()` / `requireOwner(listing)` helper
so it cannot be forgotten. IDOR is the most common way marketplaces get owned.

### 5.3 Rate limiting (Upstash sliding window)

| Action | Limit |
|---|---|
| Bid | 10 / min / user / auction, 60 / min / user overall |
| Login | 5 / 15 min / IP + 10 / hour / account |
| Signup | 3 / hour / IP |
| Listing create | 5 / day / user |
| Password reset | 3 / hour / account |
| Read endpoints | 300 / min / IP |

Plus a global circuit breaker so a bidding storm degrades reads before it drops writes.

### 5.4 Input and output

- **zod** schema at every boundary; parse, don't validate. Reject unknown keys.
- Amounts accepted as integer cents only; reject anything non-integer, negative, or above a
  sane ceiling.
- Seller descriptions are Markdown → sanitised HTML with a strict allowlist
  (`rehype-sanitize`). No raw HTML, no `<script>`, no `javascript:` URLs, no inline styles.
- React escapes by default; `dangerouslySetInnerHTML` banned by lint rule with no exceptions.
- Drizzle parameterised queries only. No string-built SQL anywhere.
- Domain names normalised and validated; block homograph/punycode lookalikes at listing time.

### 5.5 Headers and transport

```
Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-{random}';
  style-src 'self' 'nonce-{random}'; img-src 'self' data: blob:;
  connect-src 'self' https://*.upstash.io; frame-ancestors 'none'; base-uri 'none';
  form-action 'self' https://checkout.dodopayments.com
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
```

Note the CSP forces the analytics snippet to move to the official `@vercel/analytics`
package with a nonce — the current inline `<script>` would be blocked, correctly.

### 5.6 CSRF

`SameSite=Lax` cookies plus an `Origin`/`Sec-Fetch-Site` check on every mutating request,
plus a double-submit token on classic form posts. Server actions get the same treatment.

### 5.7 Uploads

Signed direct-to-blob URLs. Content-type allowlist (`png/jpeg/webp/pdf`), 10 MB cap, magic-
byte sniff server-side rather than trusting the header, EXIF stripped, randomised filenames,
served from a separate origin with `Content-Disposition: attachment` for anything not an
image. Never served from the app origin.

### 5.8 Secrets

Vercel environment variables, distinct values per environment, never in the repo. A
`gitleaks` pre-commit hook and a CI secret scan. Rotation runbook for the Dodo API key and
webhook secret. `.env.example` documents names only.

### 5.9 Audit trail

Append-only `audit_log` — no UPDATE or DELETE grant on that table for the app role. Every
bid, listing edit, price change, payout, refund, ban and admin action, with actor, IP hash
and before/after. This is what you will need when a seller claims a bid was tampered with,
and what a regulator will ask for.

### 5.10 Fraud and abuse — the auction-specific threats

These are the risks generic security checklists miss, and the ones that actually kill
marketplaces:

- **Shill bidding.** Seller bidding up their own lot via a second account. Detect by shared
  IP/device fingerprint, funding-instrument overlap, account-creation proximity, and the
  telltale pattern of an account that only ever bids on one seller's lots and never wins.
  Block seller↔bidder identity matches outright.
- **Bid shielding.** A confederate places a huge bid to scare others off, then retracts.
  Mitigated by: retractions allowed only within 60 seconds and only once per user per month.
- **Fake revenue claims.** Verification tiers with read-only Stripe/Paddle OAuth and
  read-only analytics, not uploaded screenshots. Screenshots are marked self-reported and
  labelled as such in the UI.
- **Non-paying winners.** Refundable deposit (via Dodo) required to bid above a threshold.
- **Account takeover before payout.** Bank-detail changes require 2FA re-auth plus a 24-hour
  hold with an email alert to the old address.
- **Sanctions/AML.** Screen sellers against sanctions lists before payout; escrow partner
  handles KYC, but you must not knowingly onboard blocked parties.
- **Stolen assets.** Domain-ownership proof (DNS TXT challenge) before a domain lot goes live.

### 5.11 Privacy

Data minimisation — no ID documents on your infrastructure, the escrow partner does KYC.
DSAR export and deletion endpoints. `deleted_at` soft delete with a hard-delete job after
the retention window, except where financial records must be retained. DPAs with Dodo,
Neon, Vercel, Sentry. Cookie consent only if you add non-essential tracking; Vercel
Analytics is cookieless, which keeps this simple.

---

## 6. Dodo Payments integration

### 6.1 What gets charged

| Purpose | When | Amount |
|---|---|---|
| Listing fee | Seller publishes | $1, credited back on sale |
| Success fee | Auction closes with a winner | 5% of hammer price, capped at $500 |
| Bidder deposit | Before bidding on high-value lots | Refundable, threshold-based |
| Verification / Pro seller | Optional subscription | Recurring |

### 6.2 Flow (one-time payment)

1. Seller clicks **Publish**. Server creates the listing as `pending_payment`.
2. Server calls Dodo's checkout-session endpoint with `product_cart`, `customer`
   (email, name), `return_url`, and `billing_currency` + `billing_address.country` to avoid
   currency mismatch. Our `listing_id` goes in metadata.
3. Redirect the seller to the returned `checkout_url`.
4. **Fulfilment happens on the `payment.succeeded` webhook, never on the browser redirect.**
   The redirect is a UX cue only — a user can close the tab, and a user can also forge a
   return URL. The listing flips to `live` when the webhook says so.

Events to handle: `payment.succeeded` (fulfil), `payment.failed` (prompt retry),
`payment.processing` (wait for a terminal event — do not fulfil), `payment.cancelled`
(release the hold).

### 6.3 Webhook security

Dodo implements the **Standard Webhooks** spec with `webhook-id`, `webhook-timestamp` and
`webhook-signature` headers, verified via the `standardwebhooks` library or the SDK's
`unwrap()`.

```ts
export const runtime = 'nodejs';           // needs the raw body

const raw = await req.text();              // NOT req.json() — parsing breaks the signature
const wh = new Webhook(process.env.DODO_WEBHOOK_SECRET!);
await wh.verify(raw, {                     // throws on bad signature
  'webhook-id': h('webhook-id'),
  'webhook-signature': h('webhook-signature'),
  'webhook-timestamp': h('webhook-timestamp'),
});
```

Non-negotiables around that call:

- Reject a timestamp skew beyond 5 minutes (replay window).
- **Dedupe on `webhook-id`** via a unique column in `webhook_events`; a duplicate returns
  200 without reprocessing. Retries are guaranteed, double-fulfilment must not be.
- Insert the event, return **2xx within a second or two**, process asynchronously. Slow
  handlers cause retry storms.
- Never use `unsafe_unwrap()` outside a local test.
- The endpoint is otherwise unauthenticated and public — treat every field as hostile input
  and re-derive amounts from your own records, not from the payload.
- Alert on `attempts > 3` or any event unprocessed for 15 minutes.

### 6.4 Open question to verify before building

The success fee is a **variable amount** (5% of a hammer price), but Dodo's checkout takes
`product_cart` entries of `product_id` + `quantity`. Three possible routes, in order of
preference:

1. A dedicated variable-price product, if Dodo supports one — needs confirming in the
   dashboard.
2. Creating a product per invoice via the API at settlement time.
3. A `$1` unit product with `quantity` = fee in dollars — works, but produces an ugly
   receipt and rounds to whole dollars.

I'd resolve this with Dodo support before writing the billing module, rather than build on
an assumption. Same question applies to refunding the $1 listing fee — issuing an account
credit is very likely simpler than a real refund.

---

## 7. Settlement and escrow

On auction close:

1. Create a settlement record; both parties are notified with a 48-hour payment deadline.
2. Open an escrow transaction with the partner (Escrow.com's API is the usual choice),
   storing `escrow_ref`. Terms: 5-day transfer window, 7-day buyer inspection.
3. Buyer funds escrow. Seller transfers domain, repo, hosting, analytics, payment processor
   and mailing list against a checklist in the app.
4. Buyer accepts, or the inspection window expires → escrow releases to seller.
5. Your success fee is invoiced separately through Dodo. It is **not** deducted from escrow —
   that would put you in the flow of funds, which is exactly what this design avoids.

Dispute handling is a documented human process with a policy page, not code. Write the
policy before launch; you will need it in week one.

---

## 8. Legal groundwork (parallel track, not optional)

Blocking items before real money moves — none of them are engineering, all of them can
stop a launch:

- Terms of Service covering binding bids, fees, prohibited assets, dispute process.
- Privacy policy and DPAs with every subprocessor.
- Escrow partner agreement.
- Confirmation of your own entity's tax position — Dodo's MoR status covers sales tax on
  *your* fees, not the sellers' income.
- A written policy for stolen/disputed assets and DMCA-style takedowns.
- Get a lawyer to confirm the fee-only model keeps you out of money-transmitter scope **in
  your jurisdiction**. This document is engineering advice, not legal advice.

---

## 9. Build order

Rough solo-developer estimates; treat as relative sizing, not commitments.

| Phase | Work | Est. |
|---|---|---|
| 0 | Legal + escrow partner selection (runs in parallel throughout) | — |
| 1 | Next.js scaffold, Postgres, Drizzle, Auth.js, sessions, security headers, CI with lint/typecheck/secret-scan | ~1 wk |
| 2 | Listings CRUD, browse/search/filter, image uploads, port the design system | ~1 wk |
| 3 | **Bidding engine**: transactional bids, proxy resolution, anti-snipe, closing cron, SSE realtime, notifications | ~1.5 wk |
| 4 | Dodo integration: checkout sessions, webhook endpoint with verification + dedupe, listing/success fees, receipts | ~1 wk |
| 5 | Settlement + escrow partner, transfer checklist, dispute states | ~1–1.5 wk |
| 6 | Trust & safety: verification tiers, shill detection, deposits, admin/moderation console, audit views | ~1 wk |
| 7 | Hardening: load test the bid path, third-party pen test, backup/restore drill, runbooks, staged launch | ~1 wk |

**~7–9 weeks** to a defensible v1. Phase 3 is where the real difficulty is concentrated —
concurrency bugs in a bidding engine cost money and trust, so it gets the heaviest test
coverage: property-based tests for increment maths, and a concurrent-bid harness that fires
hundreds of simultaneous bids and asserts exactly one winner and a monotonic price.

## 10. Operational readiness

- Postgres PITR, and a **restore actually rehearsed** — an untested backup is not a backup.
- Sentry with PII scrubbing; structured logs with no card data, no passwords, no session
  tokens, IPs hashed.
- Alerts: failed webhooks, auctions that should have closed but didn't, bid-error rate,
  p99 latency on the bid path, payment failure spikes.
- Staging environment with separate Dodo test keys and a seeded database.
- A status page and an incident runbook before launch, not after the first outage.

---

## 11. What I'd cut from v1

To get live sooner, in the order I'd drop them: multi-currency, subscriptions/Pro tiers,
mobile apps, buy-now on every lot, public seller profiles with review history, and the
automated escrow integration (phase 5 can start as a documented manual handoff with the
success fee invoiced through Dodo).

What cannot be cut: server-authoritative bidding, webhook signature verification with
deduplication, authorisation checks on every route, the audit log, and 2FA before payout.
