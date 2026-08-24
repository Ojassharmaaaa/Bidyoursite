/**
 * Money rules. Everything is integer cents — no floats anywhere near a price.
 * These are the only definitions of increments and tiers in the system; the
 * client never computes a minimum bid it is trusted on.
 */

export const CENT = 1;
export const DOLLAR = 100;

export function money(cents: number | string): string {
  const n = Math.round(Number(cents));
  return '$' + (n / 100).toLocaleString('en-US', {
    minimumFractionDigits: n % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

/** Sliding increment bands, in cents. */
export function increment(currentCents: number): number {
  if (currentCents < 100 * DOLLAR) return 5 * DOLLAR;
  if (currentCents < 500 * DOLLAR) return 10 * DOLLAR;
  if (currentCents < 2000 * DOLLAR) return 25 * DOLLAR;
  if (currentCents < 10000 * DOLLAR) return 50 * DOLLAR;
  return 100 * DOLLAR;
}

export function minNextBid(currentCents: number): number {
  return currentCents + increment(currentCents);
}

export type TierId = 'basic' | 'featured' | 'spotlight';

export const TIERS: Record<TierId, {
  id: TierId; name: string; priceCents: number; days: number; blurb: string; perks: string[];
}> = {
  basic: {
    id: 'basic', name: 'Basic', priceCents: 1 * DOLLAR, days: 7,
    blurb: 'Listed in the $1 section.',
    perks: ['Your lot sits in the $1 section of Browse', '7-day auction', 'Full stats and bid history', 'Escrow-backed handover'],
  },
  featured: {
    id: 'featured', name: 'Featured', priceCents: 5 * DOLLAR, days: 14,
    blurb: 'Own section above every $1 lot.',
    perks: ['Your own $5 section, above every $1 lot', 'Featured badge on your card', 'Homepage placement', '14-day auction', 'Included in the weekly buyer email'],
  },
  spotlight: {
    id: 'spotlight', name: 'Spotlight', priceCents: 10 * DOLLAR, days: 14,
    blurb: 'The top section, above everything.',
    perks: ['The $10 section sits above every other lot', 'Hero slot on the homepage', 'Featured badge on your card', 'Posted to our social accounts', 'Priority verification review'],
  },
};

export const TIER_ORDER: TierId[] = ['basic', 'featured', 'spotlight'];

export function tier(id: string | null | undefined) {
  return TIERS[(id as TierId)] ?? TIERS.basic;
}
export function tierRank(id: string | null | undefined): number {
  return TIER_ORDER.indexOf(tier(id).id);
}

/**
 * Card rarity, derived from monthly revenue. Purely a presentation device —
 * it makes a stat card worth screenshotting, and gives a pre-revenue project
 * an honest label rather than a flattering one.
 */
export type Rarity = { key: string; name: string; hex: string; glow: string };

export const RARITIES: Rarity[] = [
  { key: 'common',    name: 'Common',    hex: '#8a93a8', glow: '#c9cfdd' },
  { key: 'uncommon',  name: 'Uncommon',  hex: '#00c48c', glow: '#7ff0cd' },
  { key: 'rare',      name: 'Rare',      hex: '#3b82f6', glow: '#9dc4ff' },
  { key: 'epic',      name: 'Epic',      hex: '#a855f7', glow: '#dcb6ff' },
  { key: 'legendary', name: 'Legendary', hex: '#f5a524', glow: '#ffd98a' },
];

export function rarityFor(mrrCents: number): Rarity {
  if (mrrCents >= 500000) return RARITIES[4];
  if (mrrCents >= 200000) return RARITIES[3];
  if (mrrCents >= 50000)  return RARITIES[2];
  if (mrrCents > 0)       return RARITIES[1];
  return RARITIES[0];
}

export function compact(n: number): string {
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'k';
  return String(n);
}

/** Anti-snipe: a bid inside this window pushes the close out by the same amount. */
export const SNIPE_WINDOW_MS = 2 * 60 * 1000;
export const MAX_EXTENSIONS = 50;
