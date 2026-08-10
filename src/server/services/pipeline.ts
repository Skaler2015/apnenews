import prisma from '@/lib/db';
import { logInfo } from '@/lib/logger';
import { getSettings } from '@/lib/settings';
import { fetchAllSources } from './fetcher';
import { processPending } from './processor';
import { runPublishTick, publishBreakingNow, publishedTodayCount } from './publisher';
import { recalculateTrending } from './trending';

// Full automation orchestrator (spec §80/§92). Runs the end-to-end workflow.
// Each stage is independently safe; a failure in one stage is logged and the
// pipeline continues (spec §86).

export interface PipelineResult {
  fetch: Awaited<ReturnType<typeof fetchAllSources>> | null;
  process: { processed: number; failed: number } | null;
  breakingPublished: number;
  publish: Awaited<ReturnType<typeof runPublishTick>> | null;
  trending: number;
  publishedToday: number;
}

export async function runFullPipeline(opts: { fetch?: boolean; process?: boolean; publish?: boolean; trending?: boolean } = {}): Promise<PipelineResult> {
  const settings = await getSettings();
  const result: PipelineResult = { fetch: null, process: null, breakingPublished: 0, publish: null, trending: 0, publishedToday: 0 };

  await logInfo('SYSTEM', 'Pipeline tick started');

  if ((opts.fetch ?? true) && settings.automationEnabled) {
    try {
      result.fetch = await fetchAllSources();
    } catch (e) {
      await logInfo('SYSTEM', `Fetch stage error (continuing): ${(e as Error).message}`);
    }
  }

  if ((opts.process ?? true) && settings.autoAiProcessing) {
    try {
      result.process = await processPending(30);
    } catch (e) {
      await logInfo('SYSTEM', `Process stage error (continuing): ${(e as Error).message}`);
    }
  }

  // Breaking news jumps the queue (spec §21).
  if (settings.breakingNewsEnabled && settings.autoPublishing) {
    try {
      result.breakingPublished = await publishBreakingNow();
    } catch (e) {
      await logInfo('SYSTEM', `Breaking publish error: ${(e as Error).message}`);
    }
  }

  if ((opts.publish ?? true)) {
    try {
      result.publish = await runPublishTick();
    } catch (e) {
      await logInfo('SYSTEM', `Publish stage error (continuing): ${(e as Error).message}`);
    }
  }

  if (opts.trending ?? true) {
    try {
      result.trending = await recalculateTrending();
    } catch {
      /* non-critical */
    }
  }

  result.publishedToday = await publishedTodayCount();
  await logInfo('SYSTEM', `Pipeline tick complete. Published today: ${result.publishedToday}`);
  return result;
}

/** Daily automation report (spec §57). */
export async function generateDailyReport() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const [fetched, published, rejected, failed, duplicates, quality, aiCost, topCat] = await Promise.all([
    prisma.newsItem.count({ where: { importedAt: { gte: start } } }),
    prisma.newsArticle.count({ where: { status: 'PUBLISHED', publishedAt: { gte: start } } }),
    prisma.newsArticle.count({ where: { status: 'REJECTED', createdAt: { gte: start } } }),
    prisma.newsItem.count({ where: { status: 'FAILED', importedAt: { gte: start } } }),
    prisma.newsItem.count({ where: { status: 'DUPLICATE', importedAt: { gte: start } } }),
    prisma.newsArticle.aggregate({ where: { publishedAt: { gte: start } }, _avg: { qualityScore: true } }),
    prisma.aiUsage.aggregate({ where: { createdAt: { gte: start } }, _sum: { costInr: true } }),
    prisma.newsArticle.groupBy({ by: ['categoryId'], where: { status: 'PUBLISHED', publishedAt: { gte: start } }, _count: { _all: true }, orderBy: { _count: { categoryId: 'desc' } }, take: 1 }),
  ]);

  const unique = fetched - duplicates;
  let topCategory = 'N/A';
  if (topCat[0]?.categoryId) {
    const c = await prisma.category.findUnique({ where: { id: topCat[0].categoryId }, select: { name: true } });
    topCategory = c?.name ?? 'N/A';
  }
  const topArticle = await prisma.newsArticle.findFirst({
    where: { status: 'PUBLISHED', publishedAt: { gte: start } },
    orderBy: { views: 'desc' },
    select: { title: true, views: true },
  });

  return {
    date: start.toISOString().slice(0, 10),
    fetched,
    unique,
    published,
    rejected,
    duplicates,
    failed,
    avgQuality: Math.round(quality._avg.qualityScore ?? 0),
    aiCostInr: Number((aiCost._sum.costInr ?? 0).toFixed(2)),
    topCategory,
    topArticle: topArticle?.title ?? 'N/A',
  };
}
