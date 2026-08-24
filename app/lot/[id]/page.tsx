import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getLot, upNext } from '@/lib/drops';
import { bidHistory } from '@/lib/queries';
import { money, compact, rarityFor, tier } from '@/lib/money';
import { absolute, SITE_NAME } from '@/lib/site';

export const dynamic = 'force-dynamic';

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> },
): Promise<Metadata> {
  const { id } = await params;
  const lot = await getLot(Number(id));
  if (!lot) return { title: 'Lot not found — BidYourSite' };
  const card = absolute(`/api/card/${lot.listing_id}`);
  const url = absolute(`/lot/${lot.listing_id}`);
  return {
    title: lot.title,
    description: lot.tagline,
    alternates: { canonical: `/lot/${lot.listing_id}` },
    openGraph: {
      title: lot.title,
      description: lot.tagline,
      url,
      siteName: SITE_NAME,
      type: 'article',
      images: [{ url: card, width: 800, height: 1120, alt: `${lot.title} stat card` }],
    },
    twitter: {
      card: 'summary_large_image',
      title: lot.title,
      description: lot.tagline,
      images: [card],
    },
  };
}

export default async function LotPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lot = await getLot(Number(id));
  if (!lot) notFound();

  const history = await bidHistory(lot.auction_id, 20);
  const queue = lot.status === 'queued' ? await upNext(20) : [];
  const position = queue.findIndex((q) => q.listing_id === lot.listing_id) + 1;
  const r = rarityFor(lot.mrr_cents);

  return (
    <main className="wrap" style={{ paddingTop: 30, paddingBottom: 70 }}>
      <div className="crumb" style={{ paddingTop: 0, marginBottom: 18 }}>
        <a href="/">Stage</a> / {lot.title}
      </div>

      {lot.status === 'live' && (
        <div className="ok-note">
          This lot is on the block right now. <a href="/">Go to the stage to bid →</a>
        </div>
      )}
      {lot.status === 'queued' && (
        <div className="note" style={{ marginBottom: 18 }}>
          <b>Queued.</b> {position > 0 ? `Position ${position} in line.` : 'Waiting for a slot.'} It opens at
          $1 the moment it reaches the stage.
        </div>
      )}
      {lot.status === 'ended' && (
        <div className="note" style={{ marginBottom: 18 }}>
          <b>Closed.</b> {lot.leading_bidder_id ? `Sold for ${money(lot.price_cents)}.` : 'Ended without a bid.'}
        </div>
      )}

      <div className="detail" style={{ paddingTop: 0 }}>
        <div>
          <div
            className="lot-art"
            style={{
              background: `linear-gradient(135deg,hsl(${lot.hue} 78% 58%),hsl(${(lot.hue + 42) % 360} 80% 46%))`,
            }}
          >
            <span className="cat">{lot.category.toUpperCase()}</span>
            <span className="rare" style={{ background: r.hex }}>
              {r.name.toUpperCase()}
            </span>
            <h1>{lot.title}</h1>
            <p>{lot.tagline}</p>
          </div>

          <div className="confession">
            <h3>Why I&rsquo;m selling</h3>
            <blockquote>&ldquo;{lot.why_selling}&rdquo;</blockquote>
            <div className="by">
              — @{lot.seller}
              {lot.verified ? ' ✓' : ''} · {lot.domain}
            </div>
          </div>

          <div className="panel" style={{ marginTop: 20 }}>
            <h3>The numbers</h3>
            <div className="rows">
              <div className="row">
                <span>Domain</span>
                <span>{lot.domain}</span>
              </div>
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
                <span>Age</span>
                <span>{lot.asset_age}</span>
              </div>
              <div className="row">
                <span>Listing tier</span>
                <span>{tier(lot.tier).name}</span>
              </div>
            </div>
            {lot.body && <p style={{ marginTop: 16, color: 'var(--ink-2)' }}>{lot.body}</p>}
          </div>

          {history.length > 0 && (
            <div className="panel" style={{ marginTop: 20 }}>
              <h3>Bid history ({lot.bid_count})</h3>
              <div className="feed-list">
                {history.map((b, i) => (
                  <div className={'feed-row' + (i === 0 ? ' top' : '')} key={b.created_at + b.amount_cents}>
                    <span>{b.handle}</span>
                    {b.kind === 'proxy' && <span className="tag">auto</span>}
                    <span className="amt">{money(b.amount_cents)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <aside className="sticky">
          <div className="panel">
            <div className="price-now">
              <div className="lbl">{lot.status === 'ended' ? 'Sold for' : 'Current bid'}</div>
              <div className="val">{money(lot.price_cents)}</div>
              <div className="sub">{lot.bid_count} bids · opened at $1</div>
            </div>
            {lot.status === 'live' && (
              <a className="btn btn-p btn-block btn-lg" href="/">
                Bid on the stage
              </a>
            )}
          </div>

          <div className="panel">
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
                <a
                  className="btn btn-g btn-sm"
                  target="_blank"
                  rel="noreferrer"
                  href={
                    'https://x.com/intent/tweet?text=' +
                    encodeURIComponent(`${lot.title} — on the block at BidYourSite, opened at $1`) +
                    '&url=' +
                    encodeURIComponent(absolute(`/lot/${lot.listing_id}`))
                  }
                >
                  Share on X
                </a>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
