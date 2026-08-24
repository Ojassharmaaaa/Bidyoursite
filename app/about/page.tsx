export const metadata = { title: 'About — BidYourSite' };

export default function AboutPage() {
  return (
    <main className="wrap" style={{ paddingTop: 44, paddingBottom: 80, maxWidth: 760 }}>
      <div className="kicker">About</div>
      <h1 style={{ fontSize: 'clamp(1.9rem,4.5vw,2.7rem)', letterSpacing: '-.035em', margin: '10px 0 16px' }}>
        Most side projects die in a folder.
      </h1>
      <p style={{ color: 'var(--ink-2)', fontSize: '1.05rem' }}>
        Not because they were bad. Because selling one was harder than abandoning it. Brokers want a $500k
        asset. Marketplaces want a valuation you cannot produce. So the domain lapses, the repo goes private,
        and something that made $400 a month for two years quietly stops existing.
      </p>

      <div className="panel" style={{ marginTop: 28 }}>
        <h3>What we do instead</h3>
        <p style={{ color: 'var(--ink-2)', marginBottom: 14 }}>
          One project goes on the block at a time. It opens at a dollar. Everyone who turns up is watching the
          same lot, bidding against each other in the open, and the price lands wherever the room says it
          lands. No valuation call, no listing review, no exclusivity agreement.
        </p>
        <p style={{ color: 'var(--ink-2)' }}>
          The dollar is deliberate. Low enough that listing a dead project is a shrug rather than a decision,
          and it guarantees the auction starts below what anyone thinks the thing is worth — which is exactly
          where auctions work.
        </p>
      </div>

      <div className="panel" style={{ marginTop: 20 }}>
        <h3>Every listing answers one question</h3>
        <p style={{ color: 'var(--ink-2)', marginBottom: 14 }}>
          <strong>Why are you selling?</strong> It is required, and it sits above the metrics.
        </p>
        <div className="confession" style={{ marginTop: 0 }}>
          <blockquote>
            &ldquo;Built it in 2021 during lockdown. Got to $940/mo. Then I took a job I actually liked and
            haven&rsquo;t opened the repo in 14 months. It deserves someone who&rsquo;ll ship.&rdquo;
          </blockquote>
        </div>
        <p style={{ color: 'var(--ink-2)', marginTop: 14 }}>
          That is the difference between a marketplace and a home for abandoned projects. A spec sheet hides
          why something stalled. A straight answer is what makes the rest of the numbers believable.
        </p>
      </div>

      <div className="panel" style={{ marginTop: 20 }}>
        <h3>Four things we will not do</h3>
        <div className="rows">
          <div className="row"><span>Take a commission</span><span>$1, $5 or $10 to list. 0% of your sale.</span></div>
          <div className="row"><span>Hide reserves</span><span>No secret floors. Beat the increment, win the lot.</span></div>
          <div className="row"><span>Let snipers win</span><span>Late bids extend the clock, every time.</span></div>
          <div className="row"><span>Touch your money</span><span>Escrow holds it. We are a venue, not a bank.</span></div>
        </div>
      </div>

      <div className="panel" style={{ marginTop: 20 }}>
        <h3>The honest caveats</h3>
        <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 12, color: 'var(--ink-2)', fontSize: '.93rem' }}>
          <li><strong>A $1 open can end at $1.</strong> Thin projects with no traffic sometimes attract nobody.</li>
          <li><strong>One lot at a time means waiting.</strong> The queue is the trade-off for the crowd.</li>
          <li><strong>Bids are binding.</strong> Do not bid to see what happens.</li>
          <li><strong>We are not a broker.</strong> Nobody talks your project up on a call. Your listing is the pitch.</li>
        </ul>
      </div>

      <div className="panel" style={{ marginTop: 28, textAlign: 'center', padding: '44px 26px',
        background: 'linear-gradient(135deg,var(--brand),var(--brand-2))', border: 'none', color: '#fff' }}>
        <h2 style={{ fontSize: 'clamp(1.5rem,3.6vw,2.1rem)', letterSpacing: '-.03em', marginBottom: 10 }}>
          One dollar to find out.
        </h2>
        <p style={{ opacity: 0.9, marginBottom: 20 }}>That is the whole pitch. Put the thing on the block.</p>
        <a className="btn btn-lg" href="/list" style={{ background: '#fff', color: 'var(--brand)' }}>
          Join the queue
        </a>
      </div>
    </main>
  );
}
