import { truncateWords, stripHtml, slugify } from '@/lib/utils';
import type { GeneratedArticle } from '../providers/types';

// Automatic SEO engine (spec §13). Generates title, meta, slug, keywords,
// canonical, OG/Twitter fields and alt text.

export interface SeoBundle {
  seoTitle: string;
  metaDescription: string;
  focusKeyword: string;
  secondaryKeywords: string[];
  ogTitle: string;
  ogDescription: string;
  twitterTitle: string;
  twitterDescription: string;
  imageAlt: string;
}

export function generateSeo(article: GeneratedArticle, siteName: string): SeoBundle {
  const title = article.title.trim();
  const seoTitle = title.length > 60 ? `${truncateWords(title, 9)}` : `${title} | ${siteName.split('·')[0].trim()}`;
  const metaDescription = truncateWords(article.summaryShort || stripHtml(article.content), 28).slice(0, 160);

  const focusKeyword = article.tags[0] || title.split(/\s+/).slice(0, 2).join(' ');
  const secondaryKeywords = article.tags.slice(1, 6);

  return {
    seoTitle: seoTitle.slice(0, 65),
    metaDescription,
    focusKeyword,
    secondaryKeywords,
    ogTitle: title.slice(0, 88),
    ogDescription: metaDescription,
    twitterTitle: title.slice(0, 70),
    twitterDescription: metaDescription,
    imageAlt: `${title} — प्रतीकात्मक चित्र`,
  };
}

/** Build a stable, unique, SEO-friendly slug (spec §14). */
export function buildSlug(title: string, uniqueSuffix: string): string {
  const base = slugify(title);
  return `${base}-${uniqueSuffix}`;
}

/** SEO sub-score for the quality engine (0-100). */
export function scoreSeo(seo: SeoBundle, wordCount: number): number {
  let s = 50;
  if (seo.metaDescription.length >= 120 && seo.metaDescription.length <= 160) s += 15;
  if (seo.seoTitle.length >= 30 && seo.seoTitle.length <= 65) s += 15;
  if (seo.focusKeyword) s += 10;
  if (seo.secondaryKeywords.length >= 3) s += 5;
  if (wordCount >= 400) s += 5;
  return Math.min(100, s);
}
