import prisma from '@/lib/db';

// Analytics recording + aggregation (spec §52). Privacy-conscious: stores
// coarse events only (no PII, no precise IP).

export async function recordArticleView(articleId: string, meta: { referrer?: string; device?: string } = {}): Promise<void> {
  await prisma.$transaction([
    prisma.newsArticle.update({ where: { id: articleId }, data: { views: { increment: 1 } } }),
    prisma.analyticsEvent.create({
      data: { type: 'ARTICLE_VIEW', articleId, referrer: meta.referrer?.slice(0, 200), device: meta.device },
    }),
  ]);
}

export async function recordSearch(query: string): Promise<void> {
  const q = query.trim().toLowerCase().slice(0, 100);
  if (!q) return;
  await prisma.searchQuery.upsert({
    where: { query: q },
    create: { query: q, count: 1 },
    update: { count: { increment: 1 } },
  });
  await prisma.analyticsEvent.create({ data: { type: 'SEARCH', path: `/search?q=${encodeURIComponent(q)}` } });
}

export async function getPopularSearches(limit = 8): Promise<string[]> {
  const rows = await prisma.searchQuery.findMany({ orderBy: { count: 'desc' }, take: limit });
  return rows.map((r) => r.query);
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function getDashboardStats() {
  const today = startOfToday();
  const [
    publishedToday, pendingReview, queued, failed, breakingToday, totalArticles, totalSources, activeSources,
    fetchedToday, aiUsageToday, viewsToday,
  ] = await Promise.all([
    prisma.newsArticle.count({ where: { status: 'PUBLISHED', publishedAt: { gte: today } } }),
    prisma.newsArticle.count({ where: { status: 'NEEDS_REVIEW' } }),
    prisma.newsQueue.count({ where: { publishStatus: 'QUEUED' } }),
    prisma.newsItem.count({ where: { status: 'FAILED' } }),
    prisma.newsArticle.count({ where: { isBreaking: true, publishedAt: { gte: today } } }),
    prisma.newsArticle.count(),
    prisma.newsSource.count(),
    prisma.newsSource.count({ where: { isActive: true } }),
    prisma.newsItem.count({ where: { importedAt: { gte: today } } }),
    prisma.aiUsage.aggregate({ where: { createdAt: { gte: today } }, _sum: { costInr: true, inputTokens: true, outputTokens: true }, _count: { _all: true } }),
    prisma.analyticsEvent.count({ where: { type: 'ARTICLE_VIEW', createdAt: { gte: today } } }),
  ]);

  return {
    publishedToday, pendingReview, queued, failed, breakingToday, totalArticles, totalSources, activeSources,
    fetchedToday, viewsToday,
    aiCostToday: aiUsageToday._sum.costInr ?? 0,
    aiCallsToday: aiUsageToday._count._all,
    aiTokensToday: (aiUsageToday._sum.inputTokens ?? 0) + (aiUsageToday._sum.outputTokens ?? 0),
  };
}

/** Articles-per-day series for the dashboard chart (last N days). */
export async function getArticlesPerDay(days = 14): Promise<{ date: string; count: number }[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);
  since.setHours(0, 0, 0, 0);
  const rows = await prisma.newsArticle.findMany({
    where: { status: 'PUBLISHED', publishedAt: { gte: since } },
    select: { publishedAt: true },
  });
  const map = new Map<string, number>();
  for (let i = 0; i < days; i++) {
    const d = new Date(since);
    d.setDate(since.getDate() + i);
    map.set(d.toISOString().slice(0, 10), 0);
  }
  for (const r of rows) {
    if (!r.publishedAt) continue;
    const key = r.publishedAt.toISOString().slice(0, 10);
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return Array.from(map.entries()).map(([date, count]) => ({ date, count }));
}

export async function getCategoryDistribution() {
  const rows = await prisma.newsArticle.groupBy({
    by: ['categoryId'],
    where: { status: 'PUBLISHED' },
    _count: { _all: true },
  });
  const cats = await prisma.category.findMany({ select: { id: true, name: true, color: true } });
  const byId = new Map(cats.map((c) => [c.id, c]));
  return rows
    .map((r) => ({ name: r.categoryId ? byId.get(r.categoryId)?.name ?? 'अन्य' : 'अन्य', color: r.categoryId ? byId.get(r.categoryId)?.color ?? '#999' : '#999', count: r._count._all }))
    .sort((a, b) => b.count - a.count);
}
