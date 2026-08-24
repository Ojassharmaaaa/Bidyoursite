import { getLot } from '@/lib/drops';
import { cardSVG } from '@/lib/card';

export const runtime = 'nodejs';

/**
 * The shareable stat card, as SVG. Doubles as the OG image for a lot, and the
 * "download card" link points straight here.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const listingId = Number(id);
  if (!Number.isSafeInteger(listingId) || listingId <= 0) {
    return new Response('Not found', { status: 404 });
  }
  const lot = await getLot(listingId);
  if (!lot) return new Response('Not found', { status: 404 });

  return new Response(cardSVG(lot), {
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      // Prices move, so keep this short-lived but still CDN-friendly.
      'Cache-Control': 'public, max-age=30, s-maxage=30, stale-while-revalidate=120',
    },
  });
}
