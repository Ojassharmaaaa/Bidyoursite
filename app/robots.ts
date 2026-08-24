import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  // Preview deployments must never be indexed — only the canonical domain.
  const isProduction = SITE_URL === 'https://bidyoursite.com';

  return {
    rules: isProduction
      ? [{ userAgent: '*', allow: '/', disallow: ['/api/', '/login', '/list'] }]
      : [{ userAgent: '*', disallow: '/' }],
    sitemap: SITE_URL + '/sitemap.xml',
    host: SITE_URL,
  };
}
