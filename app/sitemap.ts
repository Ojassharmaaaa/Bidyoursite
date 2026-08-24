import type { MetadataRoute } from 'next';
import { sql } from '@/db';
import { SITE_URL } from '@/lib/site';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base: MetadataRoute.Sitemap = [
    { url: SITE_URL + '/', changeFrequency: 'hourly', priority: 1 },
    { url: SITE_URL + '/rules', changeFrequency: 'monthly', priority: 0.6 },
    { url: SITE_URL + '/about', changeFrequency: 'monthly', priority: 0.6 },
    { url: SITE_URL + '/list', changeFrequency: 'monthly', priority: 0.8 },
  ];

  // Lot permalinks are the pages worth indexing — they carry the story and the card.
  try {
    const rows = await sql`
      SELECT l.id, a.ends_at, a.queued_at
      FROM listings l JOIN auctions a ON a.listing_id = l.id
      ORDER BY a.queued_at DESC
      LIMIT 500
    `;
    for (const r of rows) {
      base.push({
        url: SITE_URL + '/lot/' + r.id,
        lastModified: new Date(r.ends_at ?? r.queued_at),
        changeFrequency: 'daily',
        priority: 0.7,
      });
    }
  } catch {
    // No database reachable at build or request time — still serve the static routes.
  }

  return base;
}
