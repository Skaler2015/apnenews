import prisma from '@/lib/db';
import { getSettings } from '@/lib/settings';
import { ARTICLE_STATUS } from '@/lib/constants';

// Sitemap data helpers (spec §33-§35). The actual XML is rendered by route
// handlers in src/app; these functions return the eligible URL sets and log
// each regeneration.

export function siteUrl(): string {
  return (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');
}

export function articleUrl(categorySlug: string | null | undefined, slug: string): string {
  return `${siteUrl()}/${categorySlug ?? 'news'}/${slug}`;
}

export async function getPublishedArticlesForSitemap(limit = 5000) {
  return prisma.newsArticle.findMany({
    where: { status: ARTICLE_STATUS.PUBLISHED },
    orderBy: { publishedAt: 'desc' },
    take: limit,
    select: {
      slug: true, updatedAt: true, publishedAt: true, title: true,
      category: { select: { slug: true } },
      images: { where: { role: 'FEATURED' }, take: 1, select: { url: true, altText: true } },
    },
  });
}

/** Google-News-eligible recent articles within the configured window. */
export async function getNewsSitemapArticles() {
  const settings = await getSettings();
  const since = new Date(Date.now() - settings.newsSitemapWindowHours * 3.6e6);
  return prisma.newsArticle.findMany({
    where: { status: ARTICLE_STATUS.PUBLISHED, publishedAt: { gte: since } },
    orderBy: { publishedAt: 'desc' },
    take: 1000,
    select: {
      slug: true, title: true, publishedAt: true,
      category: { select: { slug: true, name: true } },
    },
  });
}

export async function refreshSitemapLog(): Promise<void> {
  const count = await prisma.newsArticle.count({ where: { status: ARTICLE_STATUS.PUBLISHED } });
  await prisma.sitemapLog.create({ data: { type: 'MAIN', urlCount: count, status: 'SUCCESS' } });
}
