import { siteUrl, getNewsSitemapArticles, articleUrl } from '@/server/services/sitemap';
import { getSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';
export const revalidate = 300;

function xmlEscape(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Google-News-compatible sitemap (spec §35). Only articles within the
// configured recency window are included; older ones drop out automatically.
export async function GET() {
  const settings = await getSettings();
  const articles = await getNewsSitemapArticles();
  const pubName = settings.siteName.split('·')[0].trim();

  const parts: string[] = [];
  parts.push('<?xml version="1.0" encoding="UTF-8"?>');
  parts.push('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">');

  for (const a of articles) {
    if (!a.publishedAt) continue;
    parts.push(
      `<url><loc>${articleUrl(a.category?.slug, a.slug)}</loc>` +
        `<news:news><news:publication><news:name>${xmlEscape(pubName)}</news:name><news:language>hi</news:language></news:publication>` +
        `<news:publication_date>${a.publishedAt.toISOString()}</news:publication_date>` +
        `<news:title>${xmlEscape(a.title)}</news:title></news:news></url>`,
    );
  }
  parts.push('</urlset>');

  return new Response(parts.join('\n'), {
    headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=300' },
  });
}
