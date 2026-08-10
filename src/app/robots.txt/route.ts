import { siteUrl } from '@/server/services/sitemap';

export const dynamic = 'force-dynamic';

// robots.txt (spec §33). Blocks admin/api, points to sitemaps.
export function GET() {
  const base = siteUrl();
  const body = `User-agent: *
Allow: /
Disallow: /admin
Disallow: /api/

Sitemap: ${base}/sitemap.xml
Sitemap: ${base}/news-sitemap.xml
`;
  return new Response(body, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
}
