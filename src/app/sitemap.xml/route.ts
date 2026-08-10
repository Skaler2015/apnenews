import prisma from '@/lib/db';
import { siteUrl, getPublishedArticlesForSitemap, articleUrl } from '@/server/services/sitemap';

export const dynamic = 'force-dynamic';
export const revalidate = 900;

function xmlEscape(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Main + category + image sitemap (spec §33). Includes image entries for
// featured images where present.
export async function GET() {
  const base = siteUrl();
  const [articles, categories] = await Promise.all([
    getPublishedArticlesForSitemap(),
    prisma.category.findMany({ where: { isActive: true }, select: { slug: true, updatedAt: true } }),
  ]);

  const staticUrls = [
    { loc: base, priority: '1.0', changefreq: 'always' },
    { loc: `${base}/latest`, priority: '0.9', changefreq: 'hourly' },
    { loc: `${base}/trending`, priority: '0.8', changefreq: 'hourly' },
  ];

  const parts: string[] = [];
  parts.push('<?xml version="1.0" encoding="UTF-8"?>');
  parts.push('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">');

  for (const u of staticUrls) {
    parts.push(`<url><loc>${u.loc}</loc><changefreq>${u.changefreq}</changefreq><priority>${u.priority}</priority></url>`);
  }
  for (const c of categories) {
    parts.push(`<url><loc>${base}/${c.slug}</loc><changefreq>hourly</changefreq><priority>0.7</priority><lastmod>${c.updatedAt.toISOString()}</lastmod></url>`);
  }
  for (const a of articles) {
    const loc = articleUrl(a.category?.slug, a.slug);
    const img = a.images[0];
    const imageXml = img
      ? `<image:image><image:loc>${xmlEscape(img.url.startsWith('data:') ? loc : img.url)}</image:loc><image:title>${xmlEscape(a.title)}</image:title></image:image>`
      : '';
    parts.push(
      `<url><loc>${loc}</loc><lastmod>${(a.updatedAt || a.publishedAt || new Date()).toISOString()}</lastmod><changefreq>daily</changefreq><priority>0.6</priority>${imageXml}</url>`,
    );
  }
  parts.push('</urlset>');

  return new Response(parts.join('\n'), {
    headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=900' },
  });
}
