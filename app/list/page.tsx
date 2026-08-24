import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { TIER_ORDER, TIERS } from '@/lib/money';

export const dynamic = 'force-dynamic';

const CATEGORIES = ['SaaS', 'Newsletter', 'Domain', 'E-commerce', 'Content Site', 'Mobile App', 'Community'];

export default async function ListPage({
  searchParams,
}: {
  searchParams: Promise<{ e?: string; tier?: string }>;
}) {
  const user = await currentUser();
  if (!user) redirect('/login?next=/list');
  const { e, tier: preset } = await searchParams;

  return (
    <main className="wrap" style={{ paddingTop: 40, paddingBottom: 80, maxWidth: 780 }}>
      <div className="pg-head" style={{ padding: 0 }}>
        <div className="kicker">Join the queue</div>
        <h1>Put it on the block</h1>
        <p>
          One lot holds the stage at a time. Yours opens at <strong>$1</strong> when it gets there, and the
          room decides the rest. No reserve, no commission on the sale.
        </p>
      </div>

      {e && <div className="err" style={{ marginTop: 22 }}>{e}</div>}

      <form method="post" action="/api/listings" className="panel" style={{ marginTop: 24 }}>
        <div className="form-grid">
          <div>
            <label className="lb" htmlFor="title">
              Title <small>· what people see first</small>
            </label>
            <input className="fld" id="title" name="title" required maxLength={70}
              placeholder="Cron Cabin — Scheduled Jobs API" />
          </div>

          <div className="f2">
            <div>
              <label className="lb" htmlFor="domain">Domain</label>
              <input className="fld" id="domain" name="domain" required placeholder="croncabin.io" />
            </div>
            <div>
              <label className="lb" htmlFor="category">Category</label>
              <select className="fld" id="category" name="category" defaultValue="SaaS">
                {CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="lb" htmlFor="tagline">
              One-line pitch <small>· 10–110 characters</small>
            </label>
            <input className="fld" id="tagline" name="tagline" required minLength={10} maxLength={110}
              placeholder="Developer cron-as-a-service, 38 paying accounts." />
          </div>

          {/* The heart of the format. */}
          <div>
            <label className="lb" htmlFor="why_selling">
              Why are you selling? <small>· required, and the first thing buyers read</small>
            </label>
            <textarea className="fld" id="why_selling" name="why_selling" required minLength={40} maxLength={600}
              style={{ minHeight: 130 }}
              placeholder="Built it in 2021 during lockdown. Got to $940/mo. Then I took a job I actually liked and haven't opened the repo in 14 months. It deserves someone who'll ship." />
            <div className="hint">
              Be honest, including the unflattering parts. The listings that sell are the ones that read like a
              person wrote them, not a spec sheet.
            </div>
          </div>

          <div>
            <label className="lb" htmlFor="body">
              Anything else <small>· optional</small>
            </label>
            <textarea className="fld" id="body" name="body"
              placeholder="What it does, who uses it, how much work it takes to run, what exactly transfers." />
          </div>

          <div className="f2">
            <div>
              <label className="lb" htmlFor="mrr">Monthly revenue <small>· USD</small></label>
              <input className="fld" id="mrr" name="mrr" type="number" min={0} placeholder="456" />
            </div>
            <div>
              <label className="lb" htmlFor="profit">Monthly profit <small>· USD</small></label>
              <input className="fld" id="profit" name="profit" type="number" min={0} placeholder="420" />
            </div>
          </div>

          <div className="f2">
            <div>
              <label className="lb" htmlFor="traffic">Monthly visitors</label>
              <input className="fld" id="traffic" name="traffic" type="number" min={0} placeholder="4200" />
            </div>
            <div>
              <label className="lb" htmlFor="age">Age</label>
              <input className="fld" id="age" name="age" placeholder="1 yr 3 mo" />
            </div>
          </div>

          <div className="f2">
            <div>
              <label className="lb" htmlFor="tech">Stack <small>· comma separated</small></label>
              <input className="fld" id="tech" name="tech" placeholder="Rust, Postgres, Hetzner" />
            </div>
            <div>
              <label className="lb" htmlFor="hours">Time on stage</label>
              <select className="fld" id="hours" name="hours" defaultValue="24">
                <option value="6">6 hours — fast</option>
                <option value="24">24 hours — recommended</option>
                <option value="48">48 hours</option>
                <option value="72">72 hours</option>
              </select>
            </div>
          </div>

          <div>
            <label className="lb">Queue position</label>
            <div className="tier-opt">
              {TIER_ORDER.map((id) => {
                const t = TIERS[id];
                return (
                  <label key={id} className="q-row" style={{ cursor: 'pointer', display: 'block' }}>
                    <input type="radio" name="tier" value={id} defaultChecked={preset ? preset === id : id === 'basic'} />{' '}
                    <b>
                      ${t.priceCents / 100} · {t.name}
                    </b>
                    <div className="hint" style={{ marginTop: 4 }}>{t.blurb}</div>
                  </label>
                );
              })}
            </div>
            <div className="hint">
              Paid tiers jump the queue and carry a badge. Nothing is charged in this build — payments arrive
              with the Dodo integration.
            </div>
          </div>

          <div>
            <label className="lb" htmlFor="buyNow">Instant-buy price <small>· optional, USD</small></label>
            <input className="fld" id="buyNow" name="buyNow" type="number" min={0} placeholder="3600" />
          </div>

          <button className="btn btn-p btn-block btn-lg" type="submit">
            Join the queue
          </button>
          <p className="hint" style={{ textAlign: 'center' }}>
            By listing you confirm you own this outright and that <strong>bids are binding</strong>. See the{' '}
            <a href="/rules" style={{ color: 'var(--brand)' }}>rules</a>.
          </p>
        </div>
      </form>
    </main>
  );
}
