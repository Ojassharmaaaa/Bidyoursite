/**
 * The canonical origin for this deployment.
 *
 * Order matters: an explicit NEXT_PUBLIC_SITE_URL always wins, so a staging
 * deploy can point at itself. Preview deployments fall back to the Vercel URL
 * they were given, and anything else assumes production.
 *
 * Social scrapers reject relative image paths, so every OG/Twitter image URL
 * has to be built from this.
 */
export const SITE_URL: string = (() => {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/+$/, '');
  if (process.env.VERCEL_ENV === 'production') return 'https://bidyoursite.com';
  if (process.env.VERCEL_URL) return 'https://' + process.env.VERCEL_URL;
  return 'http://localhost:3000';
})();

export const SITE_NAME = 'BidYourSite';
export const SITE_TAGLINE = 'One project on the block at a time.';
export const CONTACT_EMAIL = 'hello@bidyoursite.com';

export function absolute(path: string): string {
  return SITE_URL + (path.startsWith('/') ? path : '/' + path);
}
