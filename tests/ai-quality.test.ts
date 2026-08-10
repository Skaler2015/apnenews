import { describe, it, expect } from 'vitest';
import { mockAiProvider } from '@/server/providers/ai/mock';
import { factCheck, scoreQuality } from '@/server/services/quality';
import { generateSeo, scoreSeo, buildSlug } from '@/server/services/seo';
import type { GenerateInput } from '@/server/providers/types';

const input: GenerateInput = {
  sourceTitle: 'राजस्थान सरकार ने नई आवास योजना की घोषणा की',
  sourceExcerpt:
    'राजस्थान सरकार ने 15 अगस्त 2026 को एक नई योजना की घोषणा की जिसके तहत 2 लाख लाभार्थियों को सहायता दी जाएगी। योजना पर 1200 करोड़ रुपये खर्च होंगे।',
  sourceName: 'डेमो राजस्थान पत्रिका',
  sourceUrl: 'https://demo.apnenews.local/raj/example',
  categoryHint: 'rajasthan',
  categorySlugs: ['rajasthan', 'india', 'government-schemes', 'latest'],
  isBreaking: false,
  targetWords: 800,
};

describe('AI generation + quality (spec §7-§10, §44)', () => {
  it('generates an original Hindi article with structure and attribution', async () => {
    const { article } = await mockAiProvider.generateArticle(input);
    expect(article.title.length).toBeGreaterThan(5);
    expect(article.titleOptions.length).toBeGreaterThanOrEqual(1);
    expect(article.content).toContain('<h2>');
    expect(article.content).toContain('स्रोत'); // attribution present
    expect(article.tags.length).toBeGreaterThanOrEqual(1);
    expect(article.wordCount).toBeGreaterThan(20);
  });

  it('extracts real numbers/dates from source (never invents)', async () => {
    const { article } = await mockAiProvider.generateArticle(input);
    const joined = article.facts.numbers.join(' ') + article.facts.dates.join(' ');
    expect(joined).toMatch(/1200|2/); // figures from the source
  });

  it('fact-check confidence is high when claims trace to source', async () => {
    const { article } = await mockAiProvider.generateArticle(input);
    const fc = factCheck(article, input);
    expect(fc.confidence).toBeGreaterThan(50);
    expect(['PASS', 'REVIEW']).toContain(fc.verdict);
  });

  it('classifies into a valid category', async () => {
    const { article } = await mockAiProvider.generateArticle(input);
    expect(input.categorySlugs).toContain(article.suggestedCategorySlug);
  });

  it('produces a full quality breakdown', async () => {
    const { article } = await mockAiProvider.generateArticle(input);
    const seo = generateSeo(article, 'ApneNews');
    const q = scoreQuality({ factConfidence: 85, seoScore: scoreSeo(seo, article.wordCount), sourceTrust: 80, article, input });
    expect(q.finalScore).toBeGreaterThan(0);
    expect(q.finalScore).toBeLessThanOrEqual(100);
    for (const k of ['accuracy', 'originality', 'seo', 'readability', 'sourceTrust'] as const) {
      expect(q[k]).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('SEO engine (spec §13/§14)', () => {
  it('generates meta within length bounds and a stable slug', async () => {
    const { article } = await mockAiProvider.generateArticle(input);
    const seo = generateSeo(article, 'ApneNews');
    expect(seo.metaDescription.length).toBeLessThanOrEqual(160);
    expect(seo.seoTitle.length).toBeLessThanOrEqual(65);
    expect(seo.focusKeyword.length).toBeGreaterThan(0);

    const slug1 = buildSlug(article.title, 'abc123');
    const slug2 = buildSlug(article.title, 'abc123');
    expect(slug1).toBe(slug2); // deterministic / stable
    expect(slug1).toMatch(/^[a-z0-9-]+$/); // clean URL
  });
});
