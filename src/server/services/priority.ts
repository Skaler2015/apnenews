import { BREAKING_KEYWORDS, OFFICIAL_KEYWORDS } from '@/lib/constants';
import { clamp } from '@/lib/utils';

// News Priority Engine (spec §6). Scores 0-100 from source trust, breaking
// signal, officialness, freshness, category importance, geo relevance,
// keyword importance, and (inverse) duplicate probability.

const CATEGORY_WEIGHT: Record<string, number> = {
  breaking: 100,
  latest: 70,
  india: 90,
  rajasthan: 85,
  politics: 82,
  business: 78,
  economy: 76,
  world: 75,
  'government-schemes': 84,
  jobs: 80,
  education: 78,
  sports: 74,
  technology: 72,
  health: 76,
  weather: 70,
  crime: 78,
  entertainment: 66,
  viral: 60,
  agriculture: 72,
};

export interface PriorityInput {
  title: string;
  excerpt?: string;
  sourceTrust: number;
  isOfficial: boolean;
  publishedAt?: Date | null;
  categorySlug?: string;
  duplicateScore: number;
}

export function detectBreaking(title: string, excerpt = ''): boolean {
  const text = `${title} ${excerpt}`.toLowerCase();
  return BREAKING_KEYWORDS.some((k) => text.includes(k.toLowerCase()));
}

export function isOfficialContent(title: string, excerpt = ''): boolean {
  const text = `${title} ${excerpt}`.toLowerCase();
  return OFFICIAL_KEYWORDS.some((k) => text.includes(k.toLowerCase()));
}

function freshnessScore(publishedAt?: Date | null): number {
  if (!publishedAt) return 60;
  const ageHours = (Date.now() - publishedAt.getTime()) / 3.6e6;
  if (ageHours < 1) return 100;
  if (ageHours < 3) return 90;
  if (ageHours < 6) return 80;
  if (ageHours < 12) return 65;
  if (ageHours < 24) return 50;
  if (ageHours < 48) return 35;
  return 20;
}

export function computePriority(input: PriorityInput): number {
  const breaking = detectBreaking(input.title, input.excerpt);
  const official = input.isOfficial || isOfficialContent(input.title, input.excerpt);

  const trust = clamp(input.sourceTrust, 0, 100);
  const fresh = freshnessScore(input.publishedAt ?? null);
  const catWeight = input.categorySlug ? CATEGORY_WEIGHT[input.categorySlug] ?? 60 : 60;

  // Weighted blend
  let score =
    trust * 0.25 +
    fresh * 0.2 +
    catWeight * 0.25 +
    (breaking ? 100 : 40) * 0.2 +
    (official ? 95 : 55) * 0.1;

  // Duplicate probability lowers priority.
  score -= (input.duplicateScore / 100) * 25;

  // Hard boosts.
  if (breaking) score = Math.max(score, 92);
  if (official) score = Math.max(score, 88);

  return Math.round(clamp(score, 0, 100));
}

/** Choose target article length from priority/importance (spec §9). */
export function targetWordCount(priority: number, isBreaking: boolean): number {
  if (isBreaking) return 550; // 400-700
  if (priority >= 85) return 1200; // detailed 1000-1500
  return 800; // normal 600-1000
}
