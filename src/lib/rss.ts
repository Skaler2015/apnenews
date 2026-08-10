import prisma from './db';
import { getSettings } from './settings';
import { siteUrl, articleUrl } from '@/server/services/sitemap';
import { ARTICLE_STATUS } from './constants';

function xmlEscape(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

// Website RSS output (spec §36).
export async function buildRssFeed(categorySlug?: string): Promise<string> {
  const settings = await getSettings();
  const base = siteUrl();
  const category = categorySlug
    ? await prisma.category.findUnique({ where: { slug: categorySlug }, select: { id: true, name: true } })
    : null;

  const articles = await prisma.newsArticle.findMany({
    where: { status: ARTICLE_STATUS.PUBLISHED, ...(category ? { categoryId: category.id } : {}) },
    orderBy: { publishedAt: 'desc' },
    take: 50,
    select: {
      title: true, slug: true, summaryShort: true, publishedAt: true,
      category: { select: { slug: true, name: true } },
    },
  });

  const title = category ? `${settings.siteName} — ${category.name}` : settings.siteName;
  const feedUrl = category ? `${base}/feed/${categorySlug}` : `${base}/feed`;

  const items = articles
    .map((a) => {
      const link = articleUrl(a.category?.slug, a.slug);
      return `<item>
  <title>${xmlEscape(a.title)}</title>
  <link>${link}</link>
  <guid isPermaLink="true">${link}</guid>
  <description>${xmlEscape(a.summaryShort || '')}</description>
  ${a.category ? `<category>${xmlEscape(a.category.name)}</category>` : ''}
  <pubDate>${(a.publishedAt || new Date()).toUTCString()}</pubDate>
</item>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>${xmlEscape(title)}</title>
  <link>${base}</link>
  <atom:link href="${feedUrl}" rel="self" type="application/rss+xml"/>
  <description>${xmlEscape(settings.siteTagline)}</description>
  <language>hi</language>
  <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
</channel>
</rss>`;
}
