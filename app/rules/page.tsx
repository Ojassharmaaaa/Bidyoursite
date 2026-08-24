import { TIER_ORDER, TIERS } from '@/lib/money';

export const metadata = { title: 'Rules — BidYourSite' };

const FAQ: Array<[string, string]> = [
  [
    'Why only one auction at a time?',
    'Because twelve auctions running quietly in parallel is twelve auctions nobody is watching. One lot at a time means everyone who shows up is looking at the same thing, and a room bidding against each other reaches a real price far faster than a grid of listings ever does.',
  ],
  [
    'How does the queue work?',
    'First in, first up — except paid tiers jump the line. That is the entire thing the $5 and $10 buy, and it is stated here rather than hidden. When the stage clears, the front of the queue goes up automatically and opens at $1.',
  ],
  [
    'What is a proxy bid?',
    'You name the most you would pay. We bid the minimum needed to keep you in front and stop the moment someone passes your ceiling. Nobody — not the seller, not other bidders, not the page source — ever sees that number.',
  ],
  [
    'What happens in the last two minutes?',
    'Any bid inside the final two minutes pushes the clock out by two minutes, repeatedly. Sniping wins nothing here. The price ends where demand actually is, not where reflexes are fastest.',
  ],
  [
    'Do you take a cut of the sale?',
    'No. You pay $1, $5 or $10 once for a queue position, and whatever the hammer falls at is yours. We would rather charge every seller a few dollars than take a percentage from the few who sell big.',
  ],
  [
    'Why is "why are you selling" required?',
    'Because it is the only part of a listing that tells a buyer what they are really getting. A spec sheet hides the reason a project stalled; a straight answer is what makes someone trust the rest of the numbers.',
  ],
];

export default function RulesPage() {
  return (
    <main className="wrap" style={{ paddingTop: 44, paddingBottom: 80, maxWidth: 800 }}>
      <div className="kicker">Rules</div>
      <h1 style={{ fontSize: 'clamp(1.9rem,4.5vw,2.7rem)', letterSpacing: '-.035em', margin: '10px 0 14px' }}>
        How this works
      </h1>
      <p style={{ color: 'var(--ink-2)', marginBottom: 30 }}>
        One lot on the block at a time. Everything opens at $1. Bids are binding, the clock extends on late
        action, and we take nothing from your sale.
      </p>

      <div className="panel">
        <h3>Bidding</h3>
        <div className="rows">
          <div className="row"><span>Opening price</span><span>$1 on every lot, no reserves</span></div>
          <div className="row"><span>Increments</span><span>$5 under $100 · $10 to $500 · $25 to $2k · $50 to $10k · $100 above</span></div>
          <div className="row"><span>Bids binding?</span><span>Yes — a winning bid is a contract</span></div>
          <div className="row"><span>Bidding on your own lot</span><span>Blocked, and grounds for removal</span></div>
          <div className="row"><span>Proxy bidding</span><span>Set a ceiling; we bid the minimum needed</span></div>
          <div className="row"><span>Your maximum</span><span>Never shown to anyone, ever</span></div>
          <div className="row"><span>Late bids</span><span>Inside 2 minutes → clock extends 2 minutes</span></div>
        </div>
      </div>

      <div className="panel" style={{ marginTop: 20 }}>
        <h3>The queue</h3>
        <div className="rows">
          {TIER_ORDER.map((id) => {
            const t = TIERS[id];
            return (
              <div className="row" key={id}>
                <span>
                  ${t.priceCents / 100} · {t.name}
                </span>
                <span>{t.blurb}</span>
              </div>
            );
          })}
          <div className="row"><span>Commission on the sale</span><span><strong>0%</strong></span></div>
          <div className="row"><span>Buyer&rsquo;s premium</span><span>None</span></div>
          <div className="row"><span>No sale</span><span>No further charge, one free requeue</span></div>
        </div>
      </div>

      <div className="panel" style={{ marginTop: 20 }}>
        <h3>Settlement</h3>
        <p style={{ color: 'var(--ink-2)', marginBottom: 14 }}>
          Funds move through a licensed escrow partner, never through us — we are a venue, not a custodian.
          The winner pays within 48 hours, the seller transfers within 5 business days, and the buyer has a
          7-day window to check the numbers before escrow releases.
        </p>
        <div className="note">
          <b>Misstated numbers void the sale.</b> If a buyer shows within the inspection window that revenue
          or traffic was materially misrepresented, escrow refunds in full and the seller is removed.
        </div>
      </div>

      <div className="panel" style={{ marginTop: 20 }}>
        <h3>What may not be listed</h3>
        <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10, color: 'var(--ink-2)', fontSize: '.92rem' }}>
          <li>✗ Anything you do not own outright, or that carries a lien or partner claim.</li>
          <li>✗ Traffic or revenue from bots, click farms or paid-to-click schemes.</li>
          <li>✗ Sites built on scraped personal data, or lists collected without consent.</li>
          <li>✗ Trademark-infringing domains and typosquats.</li>
          <li>✗ Anything earning through malware, phishing or deceptive billing.</li>
        </ul>
      </div>

      <div className="panel" style={{ marginTop: 20 }}>
        <h3>Questions people actually ask</h3>
        {FAQ.map(([q, a]) => (
          <details key={q} style={{ borderBottom: '1px solid var(--line)', padding: '14px 0' }}>
            <summary style={{ cursor: 'pointer', fontWeight: 600 }}>{q}</summary>
            <p style={{ color: 'var(--ink-2)', marginTop: 10, fontSize: '.92rem' }}>{a}</p>
          </details>
        ))}
      </div>
    </main>
  );
}
