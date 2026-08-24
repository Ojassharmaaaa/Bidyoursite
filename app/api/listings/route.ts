import { NextResponse } from 'next/server';
import { sql } from '@/db';
import { currentUser, sameOrigin } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';
import { tier } from '@/lib/money';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DOMAIN = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9-]+)+$/i;
const CATEGORIES = ['SaaS', 'Newsletter', 'Domain', 'E-commerce', 'Content Site', 'Mobile App', 'Community'];

export async function POST(req: Request) {
  if (!sameOrigin(req)) {
    return NextResponse.json({ ok: false, message: 'Bad origin.' }, { status: 403 });
  }
  const user = await currentUser();
  if (!user) return NextResponse.redirect(new URL('/login', req.url), 303);

  const limit = await rateLimit('list:user:' + user.id, 5, 86400);
  if (!limit.ok) {
    return NextResponse.redirect(new URL('/list?e=Listing+limit+reached+for+today.', req.url), 303);
  }

  const f = await req.formData();
  const s = (k: string) => String(f.get(k) || '').trim();
  const n = (k: string) => Math.max(0, Math.round(Number(f.get(k)) || 0));
  const fail = (m: string) =>
    NextResponse.redirect(new URL('/list?e=' + encodeURIComponent(m), req.url), 303);

  const title = s('title');
  const domain = s('domain').toLowerCase();
  const tagline = s('tagline');
  const why = s('why_selling');

  if (title.length < 4 || title.length > 70) return fail('Title must be 4-70 characters.');
  if (!DOMAIN.test(domain)) return fail('Enter a bare domain, e.g. croncabin.io');
  if (tagline.length < 10 || tagline.length > 110) return fail('Pitch must be 10-110 characters.');
  // The story is the point of the format, so it is enforced rather than nudged.
  if (why.length < 40) return fail('Tell us why you are selling — at least 40 characters. This is the bit buyers read first.');
  if (why.length > 600) return fail('Keep the story under 600 characters.');

  const category = CATEGORIES.includes(s('category')) ? s('category') : 'SaaS';
  const t = tier(s('tier'));
  const hours = Math.min(Math.max(Number(f.get('hours')) || 24, 1), 168);
  const tech = s('tech').split(',').map((v) => v.trim()).filter(Boolean).slice(0, 8);

  const listingId = await sql.begin(async (tx) => {
    const [l] = await tx`
      INSERT INTO listings (seller_id, title, domain, category, tagline, why_selling, body,
                            tech, tier, mrr_cents, profit_cents, traffic, asset_age, hue)
      VALUES (${user.id}, ${title}, ${domain}, ${category}, ${tagline}, ${why},
              ${s('body').slice(0, 4000)}, ${tech}, ${t.id}, ${n('mrr') * 100},
              ${n('profit') * 100}, ${n('traffic')}, ${s('age') || 'new'},
              ${Math.floor(Math.random() * 360)})
      RETURNING id
    `;
    await tx`
      INSERT INTO auctions (listing_id, duration_minutes, buy_now_cents)
      VALUES (${l.id}, ${hours * 60}, ${n('buyNow') * 100})
    `;
    await tx`
      INSERT INTO audit_log (actor_id, action, subject_type, subject_id, detail)
      VALUES (${user.id}, 'listing.create', 'listing', ${l.id}, ${sql.json({ tier: t.id, hours })})
    `;
    return Number(l.id);
  });

  // Tier payment is Phase 4 (Dodo). Until then lots join the queue for free.
  return NextResponse.redirect(new URL('/lot/' + listingId + '?queued=1', req.url), 303);
}
