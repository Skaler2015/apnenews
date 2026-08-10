import { stripHtml } from '@/lib/utils';
import type { GeneratedArticle, GenerateInput } from '../providers/types';

// AI Fact-Checking + Quality layer (spec §10/§44). The fact-checker verifies
// that every entity/number/date in the generated article is traceable to the
// source material; anything unverifiable is flagged (never invented). Produces
// a fact-confidence and a composite quality score.

export interface FactCheckResult {
  confidence: number;
  checkedEntities: string[];
  unsupportedClaims: string[];
  verdict: 'PASS' | 'REVIEW' | 'FAIL';
}

export function factCheck(article: GeneratedArticle, input: GenerateInput): FactCheckResult {
  const sourceText = stripHtml(`${input.sourceTitle} ${input.sourceExcerpt} ${input.sourceContent ?? ''}`).toLowerCase();
  const checked: string[] = [];
  const unsupported: string[] = [];

  const claims = [
    ...article.facts.numbers,
    ...article.facts.dates,
    ...article.facts.people,
    ...article.facts.organizations,
    ...article.facts.locations,
  ];

  for (const claim of claims) {
    const needle = claim.toLowerCase().trim();
    if (!needle) continue;
    // A claim is "supported" if it (or a close token) appears in source text.
    const supported = sourceText.includes(needle) || needle.split(/\s+/).some((t) => t.length > 3 && sourceText.includes(t));
    if (supported) checked.push(claim);
    else unsupported.push(claim);
  }

  const total = checked.length + unsupported.length;
  const supportRatio = total === 0 ? 0.7 : checked.length / total;
  // Blend model's self-reported confidence with our traceability ratio.
  const confidence = Math.round(article.factConfidence * 0.5 + supportRatio * 100 * 0.5);

  const verdict: FactCheckResult['verdict'] =
    confidence >= 80 && unsupported.length <= 1 ? 'PASS' : confidence >= 60 ? 'REVIEW' : 'FAIL';

  return { confidence, checkedEntities: checked, unsupportedClaims: unsupported, verdict };
}

export interface QualityResult {
  accuracy: number;
  originality: number;
  seo: number;
  readability: number;
  sourceTrust: number;
  finalScore: number;
}

function readabilityScore(content: string): number {
  const text = stripHtml(content);
  const sentences = text.split(/(?<=[।.!?])\s+/).filter((s) => s.length > 0);
  const words = text.split(/\s+/).filter(Boolean).length;
  if (sentences.length === 0) return 50;
  const avgLen = words / sentences.length;
  // Ideal ~12-22 words/sentence for Hindi news.
  let s = 100 - Math.abs(avgLen - 17) * 3;
  const hasHeadings = /<h[23]/.test(content) ? 8 : -10;
  const hasBullets = /<ul|<li/.test(content) ? 5 : 0;
  return Math.max(40, Math.min(100, Math.round(s + hasHeadings + hasBullets)));
}

function originalityScore(article: GeneratedArticle, input: GenerateInput): number {
  // Penalise verbatim reuse of the source excerpt.
  const src = stripHtml(input.sourceExcerpt).toLowerCase();
  const gen = stripHtml(article.content).toLowerCase();
  if (!src) return 85;
  const srcWords = src.split(/\s+/);
  let overlap = 0;
  for (let i = 0; i < srcWords.length - 4; i++) {
    const gram = srcWords.slice(i, i + 5).join(' ');
    if (gen.includes(gram)) overlap++;
  }
  const density = srcWords.length > 4 ? overlap / (srcWords.length - 4) : 0;
  return Math.max(50, Math.round(95 - density * 120));
}

export function scoreQuality(params: {
  factConfidence: number;
  seoScore: number;
  sourceTrust: number;
  article: GeneratedArticle;
  input: GenerateInput;
}): QualityResult {
  const accuracy = params.factConfidence;
  const originality = originalityScore(params.article, params.input);
  const readability = readabilityScore(params.article.content);
  const seo = params.seoScore;
  const sourceTrust = params.sourceTrust;
  const finalScore = Math.round(
    accuracy * 0.3 + originality * 0.2 + seo * 0.2 + readability * 0.15 + sourceTrust * 0.15,
  );
  return { accuracy, originality, seo, readability, sourceTrust, finalScore };
}
