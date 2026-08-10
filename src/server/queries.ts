import prisma from '@/lib/db';
import { ARTICLE_STATUS } from '@/lib/constants';

// Read helpers for the public frontend. Kept lean and index-friendly.

const CARD_SELECT = {
  id: true,
  title: true,
  slug: true,
  subtitle: true,
  summaryOneLine: true,
  publishedAt: true,
  isBreaking: true,
  views: true,
  category: { select: { slug: true, name: true, color: true } },
  images: { where: { role: 'FEATURED' as const }, take: 1, select: { url: true, altText: true } },
} as const;

export type ArticleCardData = {
  id: string;
  title: string;
  slug: string;
  subtitle: string | null;
  summaryOneLine: string | null;
  publishedAt: Date | null;
  isBreaking: boolean;
  views: number;
  category: { slug: string; name: string; color: string } | null;
  images: { url: string; altText: string | null }[];
};

export async function getNavCategories() {
  return prisma.category.findMany({
    where: { isActive: true },
    orderBy: { order: 'asc' },
    select: { name: true, slug: true, color: true, isLocal: true },
  });
}

export async function getLatestArticles(limit = 12, skip = 0): Promise<ArticleCardData[]> {
  return prisma.newsArticle.findMany({
    where: { status: ARTICLE_STATUS.PUBLISHED },
    orderBy: { publishedAt: 'desc' },
    take: limit,
    skip,
    select: CARD_SELECT,
  });
}

export async function getHeroArticles(limit = 5): Promise<ArticleCardData[]> {
  // Prefer breaking/featured then most recent high-priority.
  return prisma.newsArticle.findMany({
    where: { status: ARTICLE_STATUS.PUBLISHED },
    orderBy: [{ isBreaking: 'desc' }, { priority: 'desc' }, { publishedAt: 'desc' }],
    take: limit,
    select: CARD_SELECT,
  });
}

export async function getCategoryArticles(slug: string, limit = 8, skip = 0): Promise<ArticleCardData[]> {
  return prisma.newsArticle.findMany({
    where: { status: ARTICLE_STATUS.PUBLISHED, category: { slug } },
    orderBy: { publishedAt: 'desc' },
    take: limit,
    skip,
    select: CARD_SELECT,
  });
}

export async function getCategoryBySlug(slug: string) {
  return prisma.category.findUnique({ where: { slug } });
}

export async function getBreakingTicker(limit = 8) {
  return prisma.newsArticle.findMany({
    where: { status: ARTICLE_STATUS.PUBLISHED, isBreaking: true },
    orderBy: { publishedAt: 'desc' },
    take: limit,
    select: { title: true, slug: true, category: { select: { slug: true } } },
  });
}

export async function getArticleBySlug(slug: string) {
  return prisma.newsArticle.findFirst({
    where: { slug, status: ARTICLE_STATUS.PUBLISHED },
    include: {
      category: true,
      district: true,
      author: true,
      images: true,
      tags: { include: { tag: true } },
      seo: true,
      versions: { orderBy: { createdAt: 'desc' } },
    },
  });
}

export async function searchArticles(q: string, limit = 20): Promise<ArticleCardData[]> {
  const query = q.trim();
  if (!query) return [];
  // Portable LIKE-based search across title/summary/content (spec §27).
  return prisma.newsArticle.findMany({
    where: {
      status: ARTICLE_STATUS.PUBLISHED,
      OR: [
        { title: { contains: query } },
        { summaryShort: { contains: query } },
        { content: { contains: query } },
        { tags: { some: { tag: { name: { contains: query } } } } },
      ],
    },
    orderBy: { publishedAt: 'desc' },
    take: limit,
    select: CARD_SELECT,
  });
}

export async function getHomepageSections() {
  const slugs = ['rajasthan', 'india', 'business', 'technology', 'sports', 'education', 'entertainment', 'government-schemes', 'world'];
  const sections = await Promise.all(
    slugs.map(async (slug) => {
      const cat = await prisma.category.findUnique({ where: { slug }, select: { name: true, slug: true, color: true } });
      if (!cat) return null;
      const articles = await getCategoryArticles(slug, 4);
      if (articles.length === 0) return null;
      return { category: cat, articles };
    }),
  );
  return sections.filter(Boolean) as { category: { name: string; slug: string; color: string }; articles: ArticleCardData[] }[];
}
