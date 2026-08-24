/**
 * Seeds a demo room: a few bidders, a queue of lots, and one lot already on
 * the stage so the homepage has something live to show.
 *
 *   node scripts/seed.mjs
 *
 * Every seeded account uses the password below. Development only.
 */
import { randomBytes, scrypt as _scrypt } from 'node:crypto';
import { promisify } from 'node:util';
import postgres from 'postgres';

const scrypt = promisify(_scrypt);
const PASSWORD = 'demo-password-1234';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set.');
  process.exit(1);
}
const sql = postgres(url, {
  max: 1,
  ssl: url.includes('localhost') || url.includes('127.0.0.1') ? false : 'require',
});

async function hash(pw) {
  const salt = randomBytes(16);
  const key = await scrypt(pw, salt, 64);
  return `scrypt$${salt.toString('hex')}$${key.toString('hex')}`;
}

const SELLERS = ['aditya.dev', 'mira.writes', 'swiftsam', 'domainvault'];
const BIDDERS = ['novaklein', 'pixelbroker', 'tinyacq', 'ramenprofit'];

const LOTS = [
  {
    title: 'Cron Cabin — Scheduled Jobs API', domain: 'croncabin.io', category: 'SaaS',
    tagline: 'Developer cron-as-a-service, 240 free and 38 paying accounts.',
    why: "I built this in a week because I was tired of writing the same retry logic. It found 38 people who felt the same. Then I joined a startup and every hour I spend on it is an hour I don't spend on my actual job. It runs itself on a $24 box — it just needs someone who cares.",
    body: 'Rust + Postgres on a single Hetzner box. Webhooks with retries and alerting. Docs and Terraform included.',
    tech: ['Rust', 'Postgres', 'Hetzner'], tier: 'spotlight', mrr: 456, profit: 420, traffic: 4200,
    age: '1 yr', hue: 14, hours: 24, verified: true, stage: true,
  },
  {
    title: 'The Sunday Stack — 24k Newsletter', domain: 'sundaystack.co', category: 'Newsletter',
    tagline: 'Dev-tools newsletter, 24,100 subscribers, 46% open rate.',
    why: "Three years of Sunday mornings. I still love the writing but I have a baby now and the sponsor admin is what breaks me — chasing invoices at 11pm. The list is loyal and fully owned. I want it to keep going without me.",
    body: 'Sponsor slots sell four weeks ahead at $650. Full Buttondown export, no platform lock-in.',
    tech: ['Buttondown', 'Ghost'], tier: 'spotlight', mrr: 2600, profit: 2450, traffic: 12000,
    age: '3 yr 1 mo', hue: 168, hours: 48, verified: true,
  },
  {
    title: 'PocketHabit — iOS Habit Tracker', domain: 'pockethabit.app', category: 'Mobile App',
    tagline: '31k downloads, 4.7 stars, one-time unlock model.',
    why: "Shipped it to learn SwiftUI. It worked — I learned SwiftUI, and 31,000 people downloaded it. But I have not opened Xcode in a year and the App Store keeps emailing me about SDK deadlines I ignore. Zero servers, zero cost, needs one afternoon a quarter.",
    body: 'Local-first with iCloud sync, so hosting cost is zero. ASO keywords and screenshots included.',
    tech: ['SwiftUI', 'CloudKit'], tier: 'featured', mrr: 380, profit: 380, traffic: 3100,
    age: '2 yr', hue: 200, hours: 24, verified: true,
  },
  {
    title: 'quietfocus.com — Premium .com', domain: 'quietfocus.com', category: 'Domain',
    tagline: 'Two-word brandable .com, clean history since 2009.',
    why: "Bought it for a meditation app I never built. It has sat parked for four years and the renewal reminder arrives every January like a small annual reproach. Someone should actually use this.",
    body: 'Never parked with ads, no trademark conflicts. Auth-code transfer within 24 hours.',
    tech: ['Namecheap'], tier: 'featured', mrr: 0, profit: 0, traffic: 140,
    age: '16 yr', hue: 30, hours: 24, verified: false,
  },
  {
    title: 'RegexCheatsheet — 190k/mo Content Site', domain: 'regexcheat.dev', category: 'Content Site',
    tagline: 'Developer reference ranking for 340 keywords, Carbon Ads.',
    why: "A weekend project that accidentally won at SEO. It needs nothing from me, which sounds great until you realise I have no idea how to grow it either. Someone who understands content could probably triple this.",
    body: 'Static Astro site on Netlify. Eight months untouched, traffic flat to slightly up.',
    tech: ['Astro', 'Netlify'], tier: 'basic', mrr: 610, profit: 590, traffic: 190000,
    age: '4 yr', hue: 288, hours: 24, verified: false,
  },
  {
    title: 'IndieDesk — Discord Community', domain: 'indiedesk.chat', category: 'Community',
    tagline: '7,400 member indie-hacker Discord with a paid tier.',
    why: "I love this community and that is exactly the problem — it deserves someone with the energy to run events again. 1,100 messages a day, three volunteer mods staying on. I would rather hand it over than watch it go quiet.",
    body: '140 supporters at $6/mo through Whop, plus job-board sponsorships.',
    tech: ['Discord', 'Whop'], tier: 'basic', mrr: 840, profit: 800, traffic: 5200,
    age: '2 yr 7 mo', hue: 320, hours: 24, verified: true,
  },
];

try {
  const pw = await hash(PASSWORD);

  const users = {};
  for (const handle of [...SELLERS, ...BIDDERS]) {
    const [u] = await sql`
      INSERT INTO users (email, handle, password_hash)
      VALUES (${handle + '@example.com'}, ${handle}, ${pw})
      ON CONFLICT (handle) DO UPDATE SET handle = EXCLUDED.handle
      RETURNING id
    `;
    users[handle] = Number(u.id);
  }

  let staged = 0;
  for (const [i, lot] of LOTS.entries()) {
    const seller = SELLERS[i % SELLERS.length];
    const [existing] = await sql`SELECT id FROM listings WHERE domain = ${lot.domain}`;
    if (existing) continue;

    const [l] = await sql`
      INSERT INTO listings (seller_id, title, domain, category, tagline, why_selling, body, tech,
                            tier, verified, mrr_cents, profit_cents, traffic, asset_age, hue)
      VALUES (${users[seller]}, ${lot.title}, ${lot.domain}, ${lot.category}, ${lot.tagline},
              ${lot.why}, ${lot.body}, ${lot.tech}, ${lot.tier}, ${lot.verified},
              ${lot.mrr * 100}, ${lot.profit * 100}, ${lot.traffic}, ${lot.age}, ${lot.hue})
      RETURNING id
    `;

    if (lot.stage && staged === 0) {
      staged = 1;
      await sql`
        INSERT INTO auctions (listing_id, status, starts_at, ends_at, duration_minutes)
        VALUES (${l.id}, 'live', now(), now() + ${lot.hours + ' hours'}::interval, ${lot.hours * 60})
      `;
    } else {
      await sql`
        INSERT INTO auctions (listing_id, duration_minutes)
        VALUES (${l.id}, ${lot.hours * 60})
      `;
    }
  }

  const [{ n }] = await sql`SELECT count(*) AS n FROM listings`;
  console.log(`seeded — ${n} listings, ${SELLERS.length + BIDDERS.length} accounts`);
  console.log(`sign in as any of: ${BIDDERS.map((b) => b + '@example.com').join(', ')}`);
  console.log(`password: ${PASSWORD}`);
} catch (err) {
  console.error('seed failed:', err.message);
  process.exitCode = 1;
} finally {
  await sql.end();
}
