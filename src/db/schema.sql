-- BidYourSite schema. Money is always integer cents in bigint columns.
-- The Drop model: exactly one auction is `live` at a time. Everything else
-- waits in a queue and is promoted by the cron when the stage clears.

CREATE EXTENSION IF NOT EXISTS citext;

CREATE TABLE IF NOT EXISTS users (
  id              bigserial PRIMARY KEY,
  email           citext UNIQUE NOT NULL,
  handle          text UNIQUE NOT NULL,
  password_hash   text NOT NULL,
  bid_limit_cents bigint NOT NULL DEFAULT 2500000,
  status          text NOT NULL DEFAULT 'active',
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sessions (
  id         bigserial PRIMARY KEY,
  user_id    bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text UNIQUE NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id);

CREATE TABLE IF NOT EXISTS listings (
  id            bigserial PRIMARY KEY,
  seller_id     bigint NOT NULL REFERENCES users(id),
  title         text NOT NULL,
  domain        text NOT NULL,
  category      text NOT NULL,
  tagline       text NOT NULL,
  -- The confession. Required, and shown above the metrics.
  why_selling   text NOT NULL,
  body          text NOT NULL DEFAULT '',
  tech          text[] NOT NULL DEFAULT '{}',
  tier          text NOT NULL DEFAULT 'basic',
  verified      boolean NOT NULL DEFAULT false,
  mrr_cents     bigint NOT NULL DEFAULT 0,
  profit_cents  bigint NOT NULL DEFAULT 0,
  traffic       bigint NOT NULL DEFAULT 0,
  asset_age     text NOT NULL DEFAULT 'new',
  hue           int NOT NULL DEFAULT 258,
  views         bigint NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS listings_seller ON listings(seller_id);

CREATE TABLE IF NOT EXISTS auctions (
  id                  bigserial PRIMARY KEY,
  listing_id          bigint UNIQUE NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  -- queued -> live -> ended
  status              text NOT NULL DEFAULT 'queued',
  queued_at           timestamptz NOT NULL DEFAULT now(),
  starts_at           timestamptz,
  ends_at             timestamptz,
  duration_minutes    int NOT NULL DEFAULT 1440,
  start_price_cents   bigint NOT NULL DEFAULT 100,
  current_price_cents bigint NOT NULL DEFAULT 100,
  buy_now_cents       bigint NOT NULL DEFAULT 0,
  leading_bidder_id   bigint REFERENCES users(id),
  bid_count           int NOT NULL DEFAULT 0,
  extension_count     int NOT NULL DEFAULT 0,
  watchers_peak       int NOT NULL DEFAULT 0,
  settled_at          timestamptz
);
CREATE INDEX IF NOT EXISTS auctions_close ON auctions(status, ends_at);
CREATE INDEX IF NOT EXISTS auctions_queue ON auctions(status, queued_at);

-- Only one lot may hold the stage. Enforced by the database, not by hope.
CREATE UNIQUE INDEX IF NOT EXISTS auctions_one_live
  ON auctions ((status)) WHERE status = 'live';

CREATE TABLE IF NOT EXISTS bids (
  id               bigserial PRIMARY KEY,
  auction_id       bigint NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
  bidder_id        bigint NOT NULL REFERENCES users(id),
  amount_cents     bigint NOT NULL,
  -- The bidder's private ceiling. NEVER returned to any client.
  max_amount_cents bigint NOT NULL,
  kind             text NOT NULL DEFAULT 'manual',
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (auction_id, amount_cents)
);
CREATE INDEX IF NOT EXISTS bids_auction ON bids(auction_id, amount_cents DESC);
CREATE INDEX IF NOT EXISTS bids_bidder ON bids(bidder_id);

-- Presence: rows expire, count(*) of the fresh ones is the "N watching" figure.
CREATE TABLE IF NOT EXISTS presence (
  auction_id bigint NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
  viewer_key text NOT NULL,
  seen_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (auction_id, viewer_key)
);
CREATE INDEX IF NOT EXISTS presence_seen ON presence(auction_id, seen_at);

CREATE TABLE IF NOT EXISTS notifications (
  id         bigserial PRIMARY KEY,
  user_id    bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind       text NOT NULL,
  title      text NOT NULL,
  body       text NOT NULL DEFAULT '',
  link       text NOT NULL DEFAULT '',
  read_at    timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notifications_user ON notifications(user_id, created_at DESC);

-- Append-only. The app role is never granted UPDATE or DELETE here.
CREATE TABLE IF NOT EXISTS audit_log (
  id           bigserial PRIMARY KEY,
  actor_id     bigint,
  action       text NOT NULL,
  subject_type text NOT NULL,
  subject_id   bigint,
  detail       jsonb NOT NULL DEFAULT '{}',
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Crude but effective fixed-window limiter, kept in the DB so it survives
-- serverless cold starts. Swap for Redis when traffic justifies it.
CREATE TABLE IF NOT EXISTS rate_limits (
  key        text PRIMARY KEY,
  count      int NOT NULL DEFAULT 0,
  window_end timestamptz NOT NULL
);
