import prisma from '@/lib/db';
import { logInfo, logError, logWarn } from '@/lib/logger';
import { getNewsProvider } from '../providers';
import type { RawFeedItem } from '../providers/types';
import { stripHtml, truncateWords, normalizeUrl } from '@/lib/utils';
import { getSettings } from '@/lib/settings';
import { checkDuplicate, recordDuplicateCheck, urlHashOf } from './dedupe';
import { computePriority, detectBreaking } from './priority';
import { ITEM_STATUS, DUPLICATE_VERDICT } from '@/lib/constants';

// Automatic News Fetcher (spec §4). For each active source, fetch feed items,
// normalize, validate, fingerprint, dedupe, assign priority, and store.
// Designed to run as a background job; per-source failures never abort the run.

function parseDate(item: RawFeedItem): Date | null {
  const raw = item.isoDate || item.pubDate;
  if (!raw) return null;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}

function validItem(item: RawFeedItem): boolean {
  if (!item.title || item.title.length < 8) return false;
  if (!item.link || !/^https?:\/\//i.test(item.link)) return false;
  return true;
}

export interface FetchSummary {
  sourcesProcessed: number;
  itemsFound: number;
  itemsNew: number;
  duplicates: number;
  errors: number;
}

export async function fetchAllSources(opts: { onlySourceId?: string } = {}): Promise<FetchSummary> {
  const settings = await getSettings();
  const provider = getNewsProvider();
  const summary: FetchSummary = { sourcesProcessed: 0, itemsFound: 0, itemsNew: 0, duplicates: 0, errors: 0 };

  const sources = await prisma.newsSource.findMany({
    where: { isActive: true, ...(opts.onlySourceId ? { id: opts.onlySourceId } : {}) },
    orderBy: { priority: 'desc' },
  });

  await logInfo('FETCH', `Fetch run started for ${sources.length} active source(s)`);

  for (const source of sources) {
    const started = Date.now();
    let found = 0;
    let created = 0;
    try {
      const items = await provider.fetch(source.feedUrl);
      found = items.length;
      summary.itemsFound += items.length;

      for (const raw of items) {
        if (!validItem(raw)) continue;
        const urlHash = urlHashOf(raw.link);

        // Fast path: skip if we already have this exact URL.
        const existing = await prisma.newsItem.findUnique({ where: { urlHash }, select: { id: true } });
        if (existing) {
          summary.duplicates++;
          continue;
        }

        const title = stripHtml(raw.title).slice(0, 300);
        const excerpt = raw.contentSnippet ? truncateWords(raw.contentSnippet, 80) : undefined;
        const text = stripHtml(`${raw.contentSnippet ?? ''} ${raw.content ?? ''}`).slice(0, 4000);
        const publishedAt = parseDate(raw);

        // Duplicate detection across recent items.
        let dup: import('./dedupe').DedupeResult = {
          score: 0,
          verdict: DUPLICATE_VERDICT.DIFFERENT,
          method: 'NEW',
          matchedItemId: undefined,
          urlHash,
          fingerprint: '',
        };
        if (settings.duplicateProtection) {
          dup = await checkDuplicate({ title, url: raw.link, text, publishedAt });
        } else {
          const { fingerprint } = await import('@/lib/similarity');
          dup.fingerprint = fingerprint(`${title} ${text}`);
        }

        const isBreaking = detectBreaking(title, excerpt);
        const priority = computePriority({
          title,
          excerpt,
          sourceTrust: source.trustScore,
          isOfficial: source.isOfficial,
          publishedAt,
          categorySlug: undefined,
          duplicateScore: dup.score,
        });

        const status = dup.verdict === DUPLICATE_VERDICT.DUPLICATE ? ITEM_STATUS.DUPLICATE : ITEM_STATUS.IMPORTED;

        try {
          const created_item = await prisma.newsItem.create({
            data: {
              sourceId: source.id,
              sourceName: source.name,
              sourceType: source.type,
              sourceUrl: raw.link,
              urlHash: dup.urlHash,
              fingerprint: dup.fingerprint,
              title,
              excerpt,
              rawContent: text.slice(0, 2000),
              imageUrl: raw.enclosureUrl,
              publishedAt,
              categoryId: source.categoryId,
              priority: isBreaking ? Math.max(priority, 92) : priority,
              duplicateScore: dup.score,
              status,
              isDemo: source.isDemo,
            },
          });
          if (dup.score > 0) await recordDuplicateCheck(created_item.id, dup);
          if (status === ITEM_STATUS.DUPLICATE) summary.duplicates++;
          else {
            created++;
            summary.itemsNew++;
          }
        } catch (e) {
          // Unique-constraint race: another concurrent fetch inserted it.
          summary.duplicates++;
        }
      }

      await prisma.newsSource.update({
        where: { id: source.id },
        data: { lastFetchAt: new Date(), lastSuccessAt: new Date(), errorCount: 0 },
      });
      await prisma.sourceFetchLog.create({
        data: { sourceId: source.id, status: 'SUCCESS', itemsFound: found, itemsNew: created, durationMs: Date.now() - started },
      });
      summary.sourcesProcessed++;
    } catch (err) {
      summary.errors++;
      const msg = (err as Error).message.slice(0, 500);
      await prisma.newsSource.update({
        where: { id: source.id },
        data: { lastFetchAt: new Date(), errorCount: { increment: 1 } },
      });
      await prisma.sourceFetchLog.create({
        data: { sourceId: source.id, status: 'ERROR', message: msg, durationMs: Date.now() - started },
      });
      await logError('FETCH', `Source "${source.name}" failed: ${msg}`, { sourceId: source.id });

      // Notify admin if a source keeps failing (spec §56).
      const src = await prisma.newsSource.findUnique({ where: { id: source.id }, select: { errorCount: true } });
      if (src && src.errorCount >= 3) {
        await prisma.notification.create({
          data: {
            type: 'SOURCE_FAIL',
            title: 'स्रोत विफल',
            message: `स्रोत "${source.name}" लगातार ${src.errorCount} बार विफल रहा।`,
            severity: 'WARN',
          },
        });
      }
    }
  }

  await logInfo(
    'FETCH',
    `Fetch complete: found ${summary.itemsFound}, new ${summary.itemsNew}, duplicates ${summary.duplicates}, errors ${summary.errors}`,
  );
  return summary;
}
