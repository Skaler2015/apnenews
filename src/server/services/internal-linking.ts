import prisma from '@/lib/db';
import { ARTICLE_STATUS } from '@/lib/constants';
import { jaccard } from '@/lib/similarity';

// Automatic internal linking (spec §15). On publish, find a few related
// published articles and record InternalLink rows (rendered as contextual
// links + "Related News"). Conservative: max 3 links, only genuinely related.

const MAX_LINKS = 3;

export async function buildInternalLinks(articleId: string): Promise<number> {
  const article = await prisma.newsArticle.findUnique({
    where: { id: articleId },
    select: { id: true, title: true, categoryId: true, summaryShort: true },
  });
  if (!article) return 0;

  const candidates = await prisma.newsArticle.findMany({
    where: {
      id: { not: articleId },
      status: ARTICLE_STATUS.PUBLISHED,
      categoryId: article.categoryId ?? undefined,
    },
    orderBy: { publishedAt: 'desc' },
    take: 40,
    select: { id: true, title: true, summaryShort: true },
  });

  const text = `${article.title} ${article.summaryShort ?? ''}`;
  const scored = candidates
    .map((c) => ({ id: c.id, title: c.title, score: jaccard(text, `${c.title} ${c.summaryShort ?? ''}`) }))
    .filter((c) => c.score >= 0.08)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_LINKS);

  let created = 0;
  for (const s of scored) {
    try {
      await prisma.internalLink.create({
        data: { sourceId: articleId, targetId: s.id, anchorText: s.title.slice(0, 120) },
      });
      created++;
    } catch {
      // unique constraint — link already exists
    }
  }
  return created;
}

/** Related articles for the article page (category + recency fallback). */
export async function getRelated(articleId: string, categoryId: string | null, limit = 6) {
  const links = await prisma.internalLink.findMany({
    where: { sourceId: articleId },
    include: { target: { select: { id: true, title: true, slug: true, publishedAt: true, category: { select: { slug: true, name: true } }, images: { where: { role: 'FEATURED' }, take: 1 } } } },
  });
  const linked = links.map((l) => l.target).filter((t) => t);
  if (linked.length >= limit) return linked.slice(0, limit);

  const more = await prisma.newsArticle.findMany({
    where: {
      id: { not: articleId, notIn: linked.map((l) => l.id) },
      status: ARTICLE_STATUS.PUBLISHED,
      ...(categoryId ? { categoryId } : {}),
    },
    orderBy: { publishedAt: 'desc' },
    take: limit - linked.length,
    select: { id: true, title: true, slug: true, publishedAt: true, category: { select: { slug: true, name: true } }, images: { where: { role: 'FEATURED' }, take: 1 } },
  });
  return [...linked, ...more];
}
