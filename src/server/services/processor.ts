import prisma from '@/lib/db';
import { logInfo, logError } from '@/lib/logger';
import { getAiProvider, getImageProvider } from '../providers';
import type { GenerateInput } from '../providers/types';
import { getSettings } from '@/lib/settings';
import { ITEM_STATUS, ARTICLE_STATUS } from '@/lib/constants';
import { detectBreaking, isOfficialContent, targetWordCount } from './priority';
import { generateSeo, buildSlug, scoreSeo } from './seo';
import { factCheck, scoreQuality } from './quality';
import { shortHash } from '@/lib/utils';

// AI News Processing orchestrator (spec §7-§21, workflow steps 8-21).
// item -> facts -> original Hindi article -> title/summary/tags -> SEO ->
// image -> fact-check -> quality -> confidence-based routing into queue/review.

async function ensureTags(names: string[]): Promise<string[]> {
  const ids: string[] = [];
  for (const raw of names) {
    const name = raw.trim().slice(0, 60);
    if (!name) continue;
    const slug = (await import('@/lib/utils')).slugify(name) + '-' + shortHash(name, 4);
    const tag = await prisma.tag.upsert({
      where: { name },
      create: { name, slug },
      update: {},
    });
    ids.push(tag.id);
  }
  return ids;
}

async function pickAuthor(): Promise<string | null> {
  const author = await prisma.author.findFirst({ where: { isActive: true }, orderBy: { createdAt: 'asc' } });
  return author?.id ?? null;
}

/** Decide routing status from confidence + settings (spec §19-21, §43). */
function routeByConfidence(
  confidence: number,
  duplicateScore: number,
  settings: Awaited<ReturnType<typeof getSettings>>,
): string {
  if (settings.duplicateProtection && duplicateScore >= settings.duplicateBlockScore) {
    return ARTICLE_STATUS.NEEDS_REVIEW; // never auto-publish likely duplicates
  }
  if (settings.publishMode === 'REVIEW') return ARTICLE_STATUS.NEEDS_REVIEW;
  if (settings.publishMode === 'AUTO') {
    return confidence >= settings.reviewConfidence ? ARTICLE_STATUS.APPROVED : ARTICLE_STATUS.NEEDS_REVIEW;
  }
  // HYBRID
  if (confidence >= settings.autoPublishConfidence) return ARTICLE_STATUS.APPROVED;
  if (confidence >= settings.reviewConfidence) return ARTICLE_STATUS.NEEDS_REVIEW;
  return ARTICLE_STATUS.REJECTED;
}

export async function processItem(itemId: string): Promise<{ articleId?: string; status: string } | null> {
  const settings = await getSettings();
  const item = await prisma.newsItem.findUnique({ where: { id: itemId }, include: { category: true, article: { select: { id: true } } } });
  if (!item) return null;
  if (item.article) return { articleId: item.article.id, status: 'ALREADY_PROCESSED' };

  await prisma.newsItem.update({ where: { id: itemId }, data: { status: ITEM_STATUS.PROCESSING, attempts: { increment: 1 } } });

  try {
    const categories = await prisma.category.findMany({ where: { isActive: true }, select: { slug: true, name: true, id: true, color: true } });
    const categorySlugs = categories.map((c) => c.slug);
    const isBreaking = detectBreaking(item.title, item.excerpt ?? '');
    const priority = item.priority;

    const input: GenerateInput = {
      sourceTitle: item.title,
      sourceExcerpt: item.excerpt ?? '',
      sourceContent: item.rawContent ?? '',
      sourceName: item.sourceName,
      sourceUrl: item.sourceUrl,
      categoryHint: item.category?.nameEn ?? item.category?.slug,
      categorySlugs,
      isBreaking,
      targetWords: targetWordCount(priority, isBreaking),
    };

    // --- AI generation ---
    const ai = getAiProvider();
    const { article: gen, usage } = await ai.generateArticle(input);
    await prisma.aiUsage.create({
      data: {
        jobType: 'ARTICLE',
        provider: usage.provider,
        model: usage.model,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        costInr: usage.costInr,
        refId: itemId,
      },
    });

    // Resolve category
    const chosenSlug = gen.suggestedCategorySlug || item.category?.slug || 'latest';
    const category = categories.find((c) => c.slug === chosenSlug) || categories.find((c) => c.slug === 'latest') || categories[0];

    // --- SEO ---
    const seo = generateSeo(gen, settings.siteName);
    const seoScore = scoreSeo(seo, gen.wordCount);

    // --- Fact check ---
    const fc = settings.autoFactValidation
      ? factCheck(gen, input)
      : { confidence: gen.factConfidence, checkedEntities: [], unsupportedClaims: [], verdict: 'PASS' as const };

    // --- Quality ---
    const source = item.sourceId ? await prisma.newsSource.findUnique({ where: { id: item.sourceId }, select: { trustScore: true } }) : null;
    const quality = scoreQuality({
      factConfidence: fc.confidence,
      seoScore,
      sourceTrust: source?.trustScore ?? 70,
      article: gen,
      input,
    });

    // --- Routing ---
    const status = routeByConfidence(fc.confidence, item.duplicateScore, settings);

    // --- Persist article ---
    const slug = buildSlug(gen.title, shortHash(item.id + item.sourceUrl, 6));
    const authorId = await pickAuthor();
    const tagIds = await ensureTags(gen.tags);

    const article = await prisma.newsArticle.create({
      data: {
        newsItemId: item.id,
        title: gen.title.slice(0, 300),
        subtitle: gen.subtitle?.slice(0, 300),
        slug,
        content: gen.content,
        summaryOneLine: gen.summaryOneLine,
        summaryShort: gen.summaryShort,
        socialSummary: gen.socialSummary,
        pushSummary: gen.pushSummary,
        faq: JSON.stringify(gen.faq ?? []),
        wordCount: gen.wordCount,
        categoryId: category?.id,
        authorId,
        sourceName: item.sourceName,
        sourceUrl: item.sourceUrl,
        sourceType: item.sourceType,
        sourcePublishedAt: item.publishedAt,
        priority,
        duplicateScore: item.duplicateScore,
        factConfidence: fc.confidence,
        qualityScore: quality.finalScore,
        isBreaking: isBreaking && settings.breakingNewsEnabled,
        isDemo: item.isDemo,
        status,
        tags: { create: tagIds.map((tagId) => ({ tagId })) },
        seo: {
          create: {
            seoTitle: seo.seoTitle,
            metaDescription: seo.metaDescription,
            focusKeyword: seo.focusKeyword,
            secondaryKeywords: JSON.stringify(seo.secondaryKeywords),
            ogTitle: seo.ogTitle,
            ogDescription: seo.ogDescription,
            twitterTitle: seo.twitterTitle,
            twitterDescription: seo.twitterDescription,
            imageAlt: seo.imageAlt,
          },
        },
        factCheck: {
          create: {
            confidence: fc.confidence,
            checkedEntities: JSON.stringify(fc.checkedEntities),
            unsupportedClaims: JSON.stringify(fc.unsupportedClaims),
            verdict: fc.verdict,
          },
        },
        quality: {
          create: {
            accuracy: quality.accuracy,
            originality: quality.originality,
            seo: quality.seo,
            readability: quality.readability,
            sourceTrust: quality.sourceTrust,
            finalScore: quality.finalScore,
          },
        },
      },
    });

    // --- Image (spec §16) ---
    if (settings.autoImage) {
      try {
        const imageProvider = getImageProvider();
        const img = await imageProvider.generate({
          title: gen.title,
          categoryName: category?.name ?? 'समाचार',
          categoryColor: category?.color ?? '#c8102e',
          topic: seo.focusKeyword,
          isSensitive: /क्राइम|हादसा|मौत|attack|blast/i.test(gen.title),
        });
        await prisma.newsImage.create({
          data: {
            articleId: article.id,
            role: 'FEATURED',
            url: img.url,
            altText: img.altText,
            caption: img.caption,
            credit: img.credit,
            provider: img.provider,
            width: img.width,
            height: img.height,
          },
        });
      } catch (e) {
        await logError('IMAGE', `Image generation failed for ${article.id}: ${(e as Error).message}`);
      }
    }

    // --- Queue routing ---
    if (status === ARTICLE_STATUS.APPROVED) {
      await prisma.newsQueue.create({
        data: { articleId: article.id, priority, publishStatus: 'QUEUED' },
      });
    }

    await prisma.newsItem.update({ where: { id: itemId }, data: { status: ITEM_STATUS.PROCESSED } });
    await logInfo('AI', `Processed item -> article "${gen.title.slice(0, 50)}" (conf ${fc.confidence}, quality ${quality.finalScore}, status ${status})`);

    return { articleId: article.id, status };
  } catch (err) {
    const msg = (err as Error).message.slice(0, 500);
    await prisma.newsItem.update({ where: { id: itemId }, data: { status: ITEM_STATUS.FAILED, lastError: msg } });
    await logError('AI', `Processing failed for item ${itemId}: ${msg}`);
    await prisma.notification.create({
      data: { type: 'AI_FAIL', title: 'AI प्रोसेसिंग विफल', message: msg, severity: 'WARN' },
    });
    return { status: 'FAILED' };
  }
}

/** Process a batch of imported items ordered by priority. */
export async function processPending(limit = 30): Promise<{ processed: number; failed: number }> {
  const items = await prisma.newsItem.findMany({
    where: { status: ITEM_STATUS.IMPORTED, attempts: { lt: 3 } },
    orderBy: [{ priority: 'desc' }, { importedAt: 'asc' }],
    take: limit,
    select: { id: true },
  });
  let processed = 0;
  let failed = 0;
  for (const it of items) {
    const res = await processItem(it.id);
    if (res?.status === 'FAILED') failed++;
    else processed++;
  }
  return { processed, failed };
}
