import prisma from '@/lib/db';
import { logInfo, logError } from '@/lib/logger';
import { getSettings } from '@/lib/settings';
import { ARTICLE_STATUS } from '@/lib/constants';
import { buildInternalLinks } from './internal-linking';
import { generateSocialContent } from './social';
import { refreshSitemapLog } from './sitemap';

// Automatic Publishing Engine (spec §18-§20, §81). Enforces daily min/max,
// category balancing and smart prioritisation. NEVER fabricates content to hit
// the target — publishes only available, approved, high-quality articles.

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function publishedTodayCount(): Promise<number> {
  return prisma.newsArticle.count({
    where: { status: ARTICLE_STATUS.PUBLISHED, publishedAt: { gte: startOfToday() } },
  });
}

/** Per-category published counts today, for balancing (spec §20). */
async function categoryCountsToday(): Promise<Record<string, number>> {
  const rows = await prisma.newsArticle.groupBy({
    by: ['categoryId'],
    where: { status: ARTICLE_STATUS.PUBLISHED, publishedAt: { gte: startOfToday() } },
    _count: { _all: true },
  });
  const map: Record<string, number> = {};
  for (const r of rows) if (r.categoryId) map[r.categoryId] = r._count._all;
  return map;
}

/** Publish a single approved article: flip status, wire internal links,
 *  generate social content, refresh sitemap log. */
export async function publishArticle(articleId: string): Promise<boolean> {
  try {
    const article = await prisma.newsArticle.findUnique({ where: { id: articleId }, select: { id: true, status: true, isBreaking: true, title: true } });
    if (!article) return false;

    await prisma.newsArticle.update({
      where: { id: articleId },
      data: { status: ARTICLE_STATUS.PUBLISHED, publishedAt: new Date() },
    });
    await prisma.newsQueue.updateMany({ where: { articleId }, data: { publishStatus: 'PUBLISHED' } });
    await prisma.publishLog.create({ data: { articleId, action: 'PUBLISHED', message: 'Auto-published' } });

    // Post-publish steps (workflow §26-§29). Failures here never unpublish.
    await buildInternalLinks(articleId).catch((e) => logError('PUBLISH', `internal links: ${(e as Error).message}`));
    await generateSocialContent(articleId).catch((e) => logError('SOCIAL', `social gen: ${(e as Error).message}`));
    await refreshSitemapLog().catch(() => {});

    if (article.isBreaking) {
      await prisma.notification.create({
        data: { type: 'BREAKING', title: 'ब्रेकिंग न्यूज़ प्रकाशित', message: article.title, severity: 'INFO' },
      });
    }
    await logInfo('PUBLISH', `Published: ${article.title.slice(0, 60)}`);
    return true;
  } catch (err) {
    await logError('PUBLISH', `Publish failed for ${articleId}: ${(err as Error).message}`);
    await prisma.notification.create({
      data: { type: 'PUBLISH_FAIL', title: 'प्रकाशन विफल', message: (err as Error).message, severity: 'CRITICAL' },
    });
    return false;
  }
}

export interface PublishRunResult {
  publishedNow: number;
  publishedToday: number;
  remaining: number;
  reason: string;
}

/** Run one tick of the publishing scheduler. Publishes a batch respecting the
 *  daily max, category balance and breaking-news priority. */
export async function runPublishTick(): Promise<PublishRunResult> {
  const settings = await getSettings();
  if (!settings.automationEnabled || !settings.autoPublishing) {
    return { publishedNow: 0, publishedToday: await publishedTodayCount(), remaining: 0, reason: 'Auto-publishing disabled' };
  }

  const today = await publishedTodayCount();
  if (today >= settings.dailyMax) {
    return { publishedNow: 0, publishedToday: today, remaining: 0, reason: `Daily max (${settings.dailyMax}) reached` };
  }

  // How many to publish this tick. Smart mode paces toward min; otherwise a
  // small batch per interval.
  const capacity = settings.dailyMax - today;
  const batchSize = Math.min(capacity, settings.smartPublishing ? 5 : 3);

  // Candidates: approved + queued, breaking first, then priority/quality.
  const queued = await prisma.newsQueue.findMany({
    where: { publishStatus: 'QUEUED' },
    include: { article: { select: { id: true, categoryId: true, isBreaking: true, priority: true, qualityScore: true, status: true } } },
    orderBy: [{ priority: 'desc' }],
    take: 100,
  });

  const eligible = queued
    .filter((q) => q.article && q.article.status === ARTICLE_STATUS.APPROVED)
    .sort((a, b) => {
      if (a.article!.isBreaking !== b.article!.isBreaking) return a.article!.isBreaking ? -1 : 1;
      if (b.article!.priority !== a.article!.priority) return b.article!.priority - a.article!.priority;
      return b.article!.qualityScore - a.article!.qualityScore;
    });

  const catCounts = await categoryCountsToday();
  const maxPerCategory = Math.max(3, Math.ceil(settings.dailyMax / 4)); // soft cap to avoid flooding

  let published = 0;
  const usedCat = { ...catCounts };
  for (const q of eligible) {
    if (published >= batchSize) break;
    const cat = q.article!.categoryId ?? 'none';
    // Category balancing — breaking news bypasses the soft cap.
    if (!q.article!.isBreaking && (usedCat[cat] ?? 0) >= maxPerCategory) continue;
    const ok = await publishArticle(q.article!.id);
    if (ok) {
      published++;
      usedCat[cat] = (usedCat[cat] ?? 0) + 1;
    }
  }

  const nowTotal = today + published;
  // Notify if the day is ending well short of the minimum (spec §56).
  if (new Date().getHours() >= 22 && nowTotal < settings.dailyMin) {
    await prisma.notification.create({
      data: {
        type: 'TARGET_MISS',
        title: 'दैनिक लक्ष्य अधूरा',
        message: `आज ${nowTotal}/${settings.dailyMin} लेख प्रकाशित। गुणवत्ता से समझौता नहीं किया गया।`,
        severity: 'INFO',
      },
    });
  }

  return {
    publishedNow: published,
    publishedToday: nowTotal,
    remaining: Math.max(0, settings.dailyMax - nowTotal),
    reason: published > 0 ? `Published ${published}` : 'No eligible approved articles',
  };
}

/** Immediate breaking-news publish path (spec §21). */
export async function publishBreakingNow(): Promise<number> {
  const breaking = await prisma.newsArticle.findMany({
    where: { status: ARTICLE_STATUS.APPROVED, isBreaking: true },
    orderBy: { priority: 'desc' },
    take: 5,
    select: { id: true },
  });
  let n = 0;
  for (const b of breaking) if (await publishArticle(b.id)) n++;
  return n;
}
