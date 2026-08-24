'use client';

import { useEffect, useRef, useState } from 'react';

type Feed = { amount_cents: number; at: string; kind: string; who: string };
type State = {
  live: boolean;
  watching?: number;
  auctionId?: number;
  priceCents?: number;
  bidCount?: number;
  extensions?: number;
  endsAt?: string | null;
  leading?: boolean;
  feed?: Feed[];
};

function money(cents: number): string {
  return '$' + Math.round(cents / 100).toLocaleString('en-US');
}
function pad(n: number) {
  return n < 10 ? '0' + n : String(n);
}

/**
 * The live half of the stage. Polls every 3s — deliberately simple; swap for
 * SSE when concurrent viewers make the request volume worth the complexity.
 */
export default function Stage(props: {
  auctionId: number;
  initialPriceCents: number;
  initialBidCount: number;
  initialEndsAt: string;
  minNextDollars: number;
  signedIn: boolean;
  isSeller: boolean;
}) {
  const [s, setS] = useState<State>({
    live: true,
    priceCents: props.initialPriceCents,
    bidCount: props.initialBidCount,
    endsAt: props.initialEndsAt,
    feed: [],
    watching: 1,
    extensions: 0,
  });
  const [amount, setAmount] = useState(String(props.minNextDollars));
  const [msg, setMsg] = useState<{ kind: string; text: string } | null>(null);
  const [bump, setBump] = useState(false);
  const [flash, setFlash] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const lastPrice = useRef(props.initialPriceCents);
  const lastExt = useRef(0);

  // Poll the stage.
  useEffect(() => {
    let alive = true;
    const pull = async () => {
      try {
        const r = await fetch('/api/stage', { cache: 'no-store' });
        const data: State = await r.json();
        if (!alive) return;
        if (data.live && typeof data.priceCents === 'number') {
          if (data.priceCents !== lastPrice.current) {
            lastPrice.current = data.priceCents;
            setBump(true);
            setTimeout(() => setBump(false), 520);
          }
          if ((data.extensions ?? 0) > lastExt.current) {
            lastExt.current = data.extensions ?? 0;
            setFlash(true);
            setTimeout(() => setFlash(false), 6000);
          }
        }
        setS(data);
        if (!data.live) location.reload(); // the lot closed — swap the stage
      } catch {
        /* transient network blip; the next tick retries */
      }
    };
    pull();
    const id = setInterval(pull, 3000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  // Local clock tick.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const ends = s.endsAt ? new Date(s.endsAt).getTime() : 0;
  const left = Math.max(0, ends - now);
  const d = Math.floor(left / 864e5);
  const h = Math.floor((left % 864e5) / 36e5);
  const m = Math.floor((left % 36e5) / 6e4);
  const sec = Math.floor((left % 6e4) / 1000);
  const hot = left < 5 * 60 * 1000;

  async function bid(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const r = await fetch('/api/bid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auctionId: props.auctionId, maxDollars: Number(amount) }),
      });
      const data = await r.json();
      setMsg({ kind: data.ok ? 'ok' : 'err', text: data.message });
    } catch {
      setMsg({ kind: 'err', text: 'Network problem — your bid was not placed.' });
    } finally {
      setBusy(false);
    }
  }

  const price = s.priceCents ?? props.initialPriceCents;
  const feed = s.feed ?? [];

  return (
    <div className="bidbox">
      <div className="live-strip" style={{ marginBottom: 6 }}>
        <span className="live-dot">
          <i /> Live
        </span>
        <span className="watching">
          <b>{s.watching ?? 1}</b> watching
        </span>
      </div>

      <div className="price-now">
        <div className="lbl">Current bid</div>
        <div className={'val' + (bump ? ' bump' : '')}>{money(price)}</div>
        <div className="sub">
          {s.bidCount ?? 0} bids · opened at $1
        </div>
      </div>

      {flash && <div className="extended">⏱ Extended · +2:00 on the clock</div>}
      {s.leading && <div className="leading-flag">✓ You are the highest bidder</div>}

      <div className={'clock' + (hot ? ' hot' : '')}>
        <div>
          <b>{pad(d)}</b>
          <span>days</span>
        </div>
        <div>
          <b>{pad(h)}</b>
          <span>hrs</span>
        </div>
        <div>
          <b>{pad(m)}</b>
          <span>min</span>
        </div>
        <div>
          <b>{pad(sec)}</b>
          <span>sec</span>
        </div>
      </div>

      {props.isSeller ? (
        <div className="note">This is your lot — you cannot bid on it. Share the card to pull a crowd.</div>
      ) : !props.signedIn ? (
        <a className="btn btn-p btn-block btn-lg" href="/login">
          Sign in to bid
        </a>
      ) : left <= 0 ? (
        <div className="note">The hammer has fallen. Waiting for the next lot…</div>
      ) : (
        <form onSubmit={bid}>
          <label className="lb" htmlFor="max">
            Your maximum <small>· we bid the minimum needed, never more</small>
          </label>
          <input
            className="fld"
            id="max"
            type="number"
            min={1}
            step={1}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
          <button className="btn btn-p btn-block" type="submit" disabled={busy} style={{ marginTop: 10 }}>
            {busy ? 'Placing…' : 'Place bid'}
          </button>
          <p className="hint" style={{ textAlign: 'center', marginTop: 10 }}>
            Bids are binding. Nobody sees your maximum.
          </p>
        </form>
      )}

      {msg && (
        <div className={msg.kind === 'ok' ? 'ok-note' : 'err'} style={{ marginTop: 14, marginBottom: 0 }}>
          {msg.text}
        </div>
      )}

      <div className="feed">
        <h3>Bid feed</h3>
        <div className="feed-list">
          {feed.length === 0 && (
            <div className="feed-row">
              <span className="tag">No bids yet</span>
              <span className="amt">$1</span>
            </div>
          )}
          {feed.map((f, i) => {
            const prev = feed[i + 1];
            const jump = prev ? f.amount_cents - prev.amount_cents : 0;
            const big = jump >= 50000;
            return (
              <div
                key={f.at + f.amount_cents}
                className={'feed-row' + (i === 0 ? ' top' : '') + (f.who === 'you' ? ' mine' : '')}
              >
                <span>{f.who === 'you' ? 'You' : f.who}</span>
                {f.kind === 'proxy' && <span className="tag">auto</span>}
                {big && <span className="jump">▲ {money(jump)} jump</span>}
                <span className="amt">{money(f.amount_cents)}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
