import { onStage, upNext, recentlySold, marketStats, watcherCount } from '@/lib/drops';
import { currentUser } from '@/lib/auth';
import { money, minNextBid, rarityFor, tier, compact } from '@/lib/money';
import Stage from './Stage';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const [lot, queue, sold, stats, me] = await Promise.all([
    onStage(),
    upNext(6),
    recentlySold(4),
    marketStats(),
    currentUser(),
  ]);
  const watching = lot ? await watcherCount(lot.auction_id) : 0;

  return (
    <main>
      <section className="stage">
        <div className="wrap stage-in">
          {lot ? (
            <>
              <div className="live-strip">
                <span className="live-dot">
                  <i /> On the block now
                </span>
                <span className="watching">
                  <b>{watching || 1}</b> watching · <b>{stats.queued}</b> waiting in the queue
                </span>
              </div>

              <div className="stage-grid">
                <div>
                  <div
                    className="lot-art"
                    style={{
                      background: `linear-gradient(135deg,hsl(${lot.hue} 78% 58%),hsl(${(lot.hue + 42) % 360} 80% 46%))`,
                    }}
                  >
                    <span className="cat">{lot.category.toUpperCase()}</span>
                    <span className="rare" style={{ background: rarityFor(lot.mrr_cents).hex }}>
                      {rarityFor(lot.mrr_cents).name.toUpperCase()}
                    </span>
                    <h1>{lot.title}</h1>
                    <p>{lot.tagline}</p>
                  </div>

                  <div className="confession">
                    <h3>Why I&rsquo;m selling</h3>
                    <blockquote>&ldquo;{lot.why_selling}&rdquo;</blockquote>
                    <div className="by">
                      — @{lot.seller}
                      {lot.verified ? ' ✓' : ''} · {lot.domain} · {lot.asset_age} old
                    </div>
                  </div>

                  <div className="panel" style={{ marginTop: 20 }}>
                    <h3>The numbers</h3>
                    <div className="rows">
                      <div className="row">
                        <span>Monthly revenue</span>
                        <span>{lot.mrr_cents ? money(lot.mrr_cents) : 'Pre-revenue'}</span>
                      </div>
                      <div className="row">
                        <span>Monthly profit</span>
                        <span>{lot.profit_cents ? money(lot.profit_cents) : '—'}</span>
                      </div>
                      <div className="row">
                        <span>Monthly visitors</span>
                        <span>{compact(lot.traffic)}</span>
                      </div>
                      <div className="row">
                        <span>Multiple at current bid</span>
                        <span>
                          {lot.profit_cents ? (lot.price_cents / lot.profit_cents).toFixed(1) + '× monthly' : '—'}
                        </span>
                      </div>
                      <div className="row">
                        <span>Revenue proof</span>
                        <span>{lot.verified ? 'Verified' : 'Self-reported'}</span>
                      </div>
                    </div>
                    {lot.body && <p style={{ marginTop: 16, color: 'var(--ink-2)' }}>{lot.body}</p>}
                    {lot.tech?.length > 0 && (
                      <div className="tags" style={{ marginTop: 16 }}>
                        {lot.tech.map((t) => (
                          <span className="tag" key={t}>
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="panel" style={{ marginTop: 20 }}>
                    <h3>The card</h3>
                    <div className="card-wrap">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        className="trading-card"
                        src={`/api/card/${lot.listing_id}`}
                        alt={`${lot.title} stat card`}
                        width={340}
                        height={476}
                      />
                      <div className="card-actions">
                        <a className="btn btn-g btn-sm" href={`/api/card/${lot.listing_id}`} target="_blank">
                          Open full size
                        </a>
                        <a className="btn btn-g btn-sm" href={`/lot/${lot.listing_id}`}>
                          Permalink
                        </a>
                      </div>
                      <p className="hint" style={{ textAlign: 'center' }}>
                        Rarity comes from monthly revenue. Post it — that is how bidders find this.
                      </p>
                    </div>
                  </div>
                </div>

                <aside>
                  <Stage
                    auctionId={lot.auction_id}
                    initialPriceCents={lot.price_cents}
                    initialBidCount={lot.bid_count}
                    initialEndsAt={lot.ends_at ?? new Date().toISOString()}
                    minNextDollars={Math.ceil(
                      (lot.bid_count > 0 ? minNextBid(lot.price_cents) : lot.start_price_cents) / 100,
                    )}
                    signedIn={!!me}
                    isSeller={!!me && me.id === lot.seller_id}
                  />
                </aside>
              </div>
            </>
          ) : (
            <div className="dark-stage">
              <div className="ic">🎪</div>
              <h2>The stage is empty</h2>
              <p>
                No lot is on the block right now. One project goes up at a time — put yours in the queue and
                it opens at $1 the moment the stage clears.
              </p>
              <a className="btn btn-p btn-lg" href="/list">
                Put mine on the block
              </a>
            </div>
          )}
        </div>
      </section>

      <section className="wrap" style={{ paddingBottom: 30 }}>
        <div className="stat-strip">
          <div className="stat">
            <div className="stat-v">{stats.queued}</div>
            <div className="stat-l">In the queue</div>
          </div>
          <div className="stat">
            <div className="stat-v">{stats.sold}</div>
            <div className="stat-l">Lots closed</div>
          </div>
          <div className="stat">
            <div className="stat-v">{money(stats.volumeCents)}</div>
            <div className="stat-l">Sold to date</div>
          </div>
          <div className="stat">
            <div className="stat-v">{stats.bids}</div>
            <div className="stat-l">Bids placed</div>
          </div>
        </div>
      </section>

      <section className="sec" style={{ paddingTop: 20 }}>
        <div className="wrap">
          <div className="sec-head">
            <div>
              <div className="kicker">Up next</div>
              <h2>The queue</h2>
              <p>One at a time, in order. Paid tiers jump the line — that is what the $5 and $10 buy.</p>
            </div>
            <a className="btn btn-g" href="/list">
              Join the queue
            </a>
          </div>
          {queue.length === 0 ? (
            <div className="empty">
              <div className="ic">📭</div>
              <h4>Nothing queued</h4>
              <p>Be the next lot on the block.</p>
            </div>
          ) : (
            <div className="queue">
              {queue.map((q, i) => (
                <a className={`q-row t-${tier(q.tier).id}`} key={q.listing_id} href={`/lot/${q.listing_id}`}>
                  <span className="q-pos">{i + 1}</span>
                  <span className="q-main">
                    <b>{q.title}</b>
                    <span>
                      {q.category} · {q.domain} · {q.mrr_cents ? money(q.mrr_cents) + '/mo' : 'pre-revenue'} · @
                      {q.seller}
                    </span>
                  </span>
                  <span className="q-eta">{tier(q.tier).name}</span>
                </a>
              ))}
            </div>
          )}
        </div>
      </section>

      {sold.length > 0 && (
        <section className="sec" style={{ paddingTop: 0 }}>
          <div className="wrap">
            <div className="sec-head">
              <div>
                <div className="kicker">Hall of fame</div>
                <h2>Recently adopted</h2>
                <p>Projects that found someone to run them.</p>
              </div>
            </div>
            <div className="queue">
              {sold.map((q) => (
                <a className="q-row" key={q.listing_id} href={`/lot/${q.listing_id}`}>
                  <span className="q-pos">✓</span>
                  <span className="q-main">
                    <b>{q.title}</b>
                    <span>
                      {q.bid_count} bids · {q.category} · @{q.seller}
                    </span>
                  </span>
                  <span className="q-eta" style={{ color: 'var(--accent)', fontWeight: 800 }}>
                    {money(q.price_cents)}
                  </span>
                </a>
              ))}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
