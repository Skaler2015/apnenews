import prisma from '@/lib/db';
import { ARTICLE_STATUS } from '@/lib/constants';

// Trending engine (spec §28). trendingScore = recent views weighted by
// freshness decay. Recomputed by the calculate-trending cron.

export async function recalculateTrending(): Promise<number> {
  const since = new Date(Date.now() - 48 * 3.6e6);
  const articles = await prisma.newsArticle.findMany({
    where: { status: ARTICLE_STATUS.PUBLISHED, publishedAt: { gte: since } },
    select: { id: true, views: true, publishedAt: true, priority: true },
  });

  const now = Date.now();
  for (const a of articles) {
    const ageHours = a.publishedAt ? (now - a.publishedAt.getTime()) / 3.6e6 : 48;
    // Hacker-News-style decay.
    const decay = Math.pow(ageHours + 2, 1.5);
    const score = ((a.views + 1) * 10 + a.priority) / decay;
    await prisma.newsArticle.update({ where: { id: a.id }, data: { trendingScore: score } });
  }
  return articles.length;
}

export async function getTrending(limit = 10) {
  return prisma.newsArticle.findMany({
    where: { status: ARTICLE_STATUS.PUBLISHED },
    orderBy: [{ trendingScore: 'desc' }, { publishedAt: 'desc' }],
    take: limit,
    select: {
      id: true, title: true, slug: true, publishedAt: true, views: true,
      category: { select: { slug: true, name: true, color: true } },
      images: { where: { role: 'FEATURED' }, take: 1 },
    },
  });
}
