import { money, compact, rarityFor, tier } from './money';
import type { StageLot } from './drops';

/** Escape for XML text nodes — listing text is user-supplied. */
function x(s: string): string {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]!),
  );
}

function clip(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s;
}

/**
 * A shareable stat card. Rendered as SVG on the server so it works as an
 * OG image, downloads cleanly, and needs no canvas or headless browser.
 * 800x1120 — a 5:7 trading-card ratio.
 */
export function cardSVG(lot: StageLot): string {
  const r = rarityFor(lot.mrr_cents);
  const t = tier(lot.tier);
  const W = 800, H = 1120;

  const stats: Array<[string, string, number]> = [
    ['MRR', lot.mrr_cents ? money(lot.mrr_cents) : '—', bar(lot.mrr_cents, 500000)],
    ['PROFIT', lot.profit_cents ? money(lot.profit_cents) : '—', bar(lot.profit_cents, 500000)],
    ['TRAFFIC', compact(lot.traffic) + '/mo', bar(lot.traffic, 200000)],
    ['AGE', lot.asset_age, 0.55],
  ];

  const statRows = stats
    .map(([label, value, fill], i) => {
      const y = 690 + i * 76;
      return `
    <text x="60" y="${y}" font-family="Inter,sans-serif" font-size="19" font-weight="700"
          letter-spacing="2.4" fill="#8a93a8">${x(label)}</text>
    <text x="740" y="${y}" text-anchor="end" font-family="ui-monospace,monospace"
          font-size="27" font-weight="700" fill="#f2f4fa">${x(value)}</text>
    <rect x="60" y="${y + 14}" width="680" height="7" rx="3.5" fill="#242938"/>
    <rect x="60" y="${y + 14}" width="${Math.round(680 * fill)}" height="7" rx="3.5" fill="${r.hex}"/>`;
    })
    .join('');

  const chips = (lot.tech || [])
    .slice(0, 4)
    .map((tech, i) => {
      const cx = 60 + i * 172;
      return `
    <rect x="${cx}" y="1012" width="160" height="42" rx="21" fill="#161a28" stroke="#242938"/>
    <text x="${cx + 80}" y="1039" text-anchor="middle" font-family="Inter,sans-serif"
          font-size="17" fill="#a8b0c4">${x(clip(tech, 13))}</text>`;
    })
    .join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img"
     aria-label="${x(lot.title)} — ${x(r.name)} lot on BidYourSite">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0d1020"/><stop offset="100%" stop-color="#161a28"/>
    </linearGradient>
    <linearGradient id="art" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="hsl(${lot.hue} 78% 58%)"/>
      <stop offset="100%" stop-color="hsl(${(lot.hue + 42) % 360} 80% 46%)"/>
    </linearGradient>
    <linearGradient id="rare" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${r.hex}"/><stop offset="100%" stop-color="${r.glow}"/>
    </linearGradient>
    <filter id="soft" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="26"/>
    </filter>
  </defs>

  <rect width="${W}" height="${H}" rx="40" fill="url(#bg)"/>
  <rect x="9" y="9" width="${W - 18}" height="${H - 18}" rx="33" fill="none" stroke="url(#rare)" stroke-width="4"/>
  <ellipse cx="640" cy="150" rx="240" ry="170" fill="${r.hex}" opacity=".2" filter="url(#soft)"/>

  <text x="60" y="86" font-family="Inter,sans-serif" font-size="22" font-weight="800"
        letter-spacing="1.6" fill="#f2f4fa">BID<tspan fill="#7c5cff">YOURSITE</tspan></text>
  <rect x="${W - 60 - rarityWidth(r.name)}" y="60" width="${rarityWidth(r.name)}" height="36" rx="18" fill="url(#rare)"/>
  <text x="${W - 60 - rarityWidth(r.name) / 2}" y="85" text-anchor="middle" font-family="Inter,sans-serif"
        font-size="17" font-weight="800" letter-spacing="1.8" fill="#0d1020">${x(r.name.toUpperCase())}</text>

  <rect x="60" y="130" width="680" height="300" rx="26" fill="url(#art)"/>
  <text x="400" y="305" text-anchor="middle" font-family="Inter,sans-serif" font-size="66"
        font-weight="800" fill="#ffffff" opacity=".95">${x(clip(lot.domain, 18))}</text>
  <rect x="88" y="158" width="${lot.category.length * 12 + 34}" height="34" rx="17" fill="#00000055"/>
  <text x="${88 + (lot.category.length * 12 + 34) / 2}" y="181" text-anchor="middle"
        font-family="Inter,sans-serif" font-size="16" font-weight="700" letter-spacing="1.2"
        fill="#ffffff">${x(lot.category.toUpperCase())}</text>

  <text x="60" y="494" font-family="Inter,sans-serif" font-size="40" font-weight="800"
        fill="#f2f4fa">${x(clip(lot.title, 30))}</text>
  <text x="60" y="536" font-family="Inter,sans-serif" font-size="21"
        fill="#a8b0c4">${x(clip(lot.tagline, 58))}</text>

  <rect x="60" y="566" width="680" height="86" rx="20" fill="#11141f" stroke="#242938"/>
  <text x="84" y="602" font-family="Inter,sans-serif" font-size="15" font-weight="700"
        letter-spacing="2" fill="#6d768d">${lot.status === 'ended' ? 'SOLD FOR' : 'CURRENT BID'}</text>
  <text x="84" y="638" font-family="ui-monospace,monospace" font-size="35" font-weight="700"
        fill="${r.hex}">${x(money(lot.price_cents))}</text>
  <text x="716" y="602" text-anchor="end" font-family="Inter,sans-serif" font-size="15"
        font-weight="700" letter-spacing="2" fill="#6d768d">BIDS</text>
  <text x="716" y="638" text-anchor="end" font-family="ui-monospace,monospace" font-size="35"
        font-weight="700" fill="#f2f4fa">${lot.bid_count}</text>
  ${statRows}
  ${chips}

  <text x="60" y="1090" font-family="Inter,sans-serif" font-size="17" fill="#6d768d">
    @${x(clip(lot.seller, 16))}${lot.verified ? ' ✓' : ''} · ${x(t.name)} tier · opened at $1
  </text>
</svg>`;
}

function bar(value: number, max: number): number {
  if (!value) return 0.04;
  return Math.max(0.06, Math.min(1, value / max));
}
function rarityWidth(name: string): number {
  return name.length * 12 + 34;
}
