import type { AiProvider, GenerateInput, GeneratedArticle, ArticleFacts, AiUsageInfo } from '../types';
import { stripHtml, wordCount } from '@/lib/utils';
import { clamp } from '@/lib/utils';

// Deterministic, keyless AI provider. It NEVER invents facts (spec §64): it
// only extracts entities/numbers/dates that are literally present in the
// supplied source text and rephrases them into an original Hindi editorial
// structure with explicit source attribution. Fact confidence scales with how
// much verifiable source material is available. Swap AI_PROVIDER=anthropic to
// use a real LLM via the anthropic provider.

function extractFacts(text: string): ArticleFacts {
  const clean = stripHtml(text);
  const numbers = Array.from(
    new Set(
      (clean.match(/\b\d[\d,.]*\s?(?:%|प्रतिशत|करोड़|लाख|हज़ार|रुपये|रुपए|km|किमी|साल|वर्ष)?\b/gi) || [])
        .map((s) => s.trim())
        .filter((s) => s.length > 0),
    ),
  ).slice(0, 12);

  // Dates (dd Month yyyy / yyyy / Hindi month names)
  const dates = Array.from(
    new Set(
      (clean.match(
        /\b(\d{1,2}\s?(?:जनवरी|फरवरी|मार्च|अप्रैल|मई|जून|जुलाई|अगस्त|सितंबर|अक्टूबर|नवंबर|दिसंबर|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s?\d{0,4})|\b(20\d{2})\b/gi,
      ) || []).map((s) => s.trim()),
    ),
  ).slice(0, 6);

  // Capitalised Latin sequences + notable Hindi proper-noun-ish tokens
  const latinEntities = clean.match(/\b([A-Z][a-zA-Z]+(?:\s[A-Z][a-zA-Z]+){0,3})\b/g) || [];
  const orgWords = ['सरकार', 'मंत्रालय', 'विभाग', 'बोर्ड', 'आयोग', 'कंपनी', 'बैंक', 'यूनिवर्सिटी', 'Ltd', 'Corp', 'Ministry', 'Board'];
  const organizations = Array.from(
    new Set([...latinEntities, ...findAround(clean, orgWords)]),
  )
    .filter((e) => orgWords.some((w) => e.includes(w)) || /Ltd|Corp|Ministry|Board|Bank|University/.test(e))
    .slice(0, 8);

  const placeWords = ['राजस्थान', 'जयपुर', 'दिल्ली', 'भारत', 'सीकर', 'जोधपुर', 'उदयपुर', 'मुंबई', 'India', 'Delhi', 'Rajasthan', 'Jaipur'];
  const locations = Array.from(new Set(placeWords.filter((p) => clean.includes(p)))).slice(0, 6);

  const people = Array.from(new Set(latinEntities))
    .filter((e) => !organizations.includes(e) && !locations.includes(e))
    .slice(0, 6);

  const entities = Array.from(new Set([...people, ...organizations, ...locations])).slice(0, 12);

  // Key facts = the most information-dense sentences from the source excerpt.
  const sentences = clean
    .split(/(?<=[।.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 25);
  const keyFacts = sentences.slice(0, 5);

  return { entities, people, organizations, locations, dates, numbers, keyFacts };
}

function findAround(text: string, words: string[]): string[] {
  const out: string[] = [];
  for (const w of words) {
    const idx = text.indexOf(w);
    if (idx >= 0) {
      const start = Math.max(0, idx - 15);
      out.push(text.slice(start, idx + w.length).trim().split(/\s+/).slice(-3).join(' '));
    }
  }
  return out;
}

function computeConfidence(input: GenerateInput, facts: ArticleFacts): number {
  const material = stripHtml(`${input.sourceTitle} ${input.sourceExcerpt} ${input.sourceContent ?? ''}`);
  const words = material.split(/\s+/).filter(Boolean).length;
  let score = 40;
  if (words > 40) score += 15;
  if (words > 120) score += 15;
  if (facts.numbers.length > 0) score += 8;
  if (facts.dates.length > 0) score += 7;
  if (facts.entities.length >= 2) score += 8;
  if (input.sourceUrl) score += 5;
  // Official / well-sourced material scores higher.
  return clamp(score, 20, 96);
}

function buildTitleOptions(input: GenerateInput): string[] {
  const base = input.sourceTitle.replace(/\s+/g, ' ').trim();
  const opts = [
    base,
    `${base} — जानिए पूरी जानकारी`,
    input.isBreaking ? `बड़ी खबर: ${base}` : `${base}: क्या है पूरा मामला`,
  ];
  return Array.from(new Set(opts)).slice(0, 3);
}

function buildContent(input: GenerateInput, facts: ArticleFacts): string {
  const title = input.sourceTitle.trim();
  const intro = facts.keyFacts[0] || input.sourceExcerpt || `${title} से जुड़ी जानकारी सामने आई है।`;
  const parts: string[] = [];

  parts.push(`<p><strong>${escapeHtml(input.categoryHint || 'समाचार')} डेस्क:</strong> ${escapeHtml(intro)}</p>`);

  // Main facts as bullets (only source-derived facts)
  if (facts.keyFacts.length > 1) {
    parts.push('<h2>मुख्य बिंदु</h2>');
    parts.push('<ul>');
    for (const f of facts.keyFacts.slice(0, 4)) parts.push(`<li>${escapeHtml(f)}</li>`);
    parts.push('</ul>');
  }

  // Detail section
  parts.push('<h2>विस्तार से</h2>');
  const detail = facts.keyFacts.slice(1, 4).join(' ') || input.sourceExcerpt || intro;
  parts.push(`<p>${escapeHtml(detail)}</p>`);

  // Data highlights table (numbers/dates), only if present
  if (facts.numbers.length || facts.dates.length) {
    parts.push('<h3>अहम आंकड़े</h3>');
    parts.push('<table><thead><tr><th>विवरण</th><th>मान</th></tr></thead><tbody>');
    facts.dates.slice(0, 3).forEach((d) => parts.push(`<tr><td>तारीख</td><td>${escapeHtml(d)}</td></tr>`));
    facts.numbers.slice(0, 4).forEach((n) => parts.push(`<tr><td>आंकड़ा</td><td>${escapeHtml(n)}</td></tr>`));
    parts.push('</tbody></table>');
  }

  // Entities / background
  if (facts.entities.length) {
    parts.push('<h3>संबंधित पक्ष</h3>');
    parts.push(`<p>इस मामले से जुड़े प्रमुख नाम: ${facts.entities.map(escapeHtml).join(', ')}।</p>`);
  }

  parts.push('<h2>आगे क्या</h2>');
  parts.push(
    `<p>इस विषय पर आधिकारिक अपडेट आने पर खबर को अपडेट किया जाएगा। पाठकों से अनुरोध है कि किसी भी निर्णय से पहले संबंधित आधिकारिक स्रोत से पुष्टि अवश्य करें।</p>`,
  );

  // Source attribution (spec §11) — always present, never claims original reporting
  parts.push(
    `<p class="source-note"><em>यह रिपोर्ट <a href="${escapeHtml(input.sourceUrl)}" rel="nofollow noopener" target="_blank">${escapeHtml(
      input.sourceName,
    )}</a> में प्रकाशित जानकारी के आधार पर संपादकीय रूप से तैयार की गई है। मूल तथ्यों का श्रेय स्रोत को जाता है।</em></p>`,
  );

  return parts.join('\n');
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildTags(input: GenerateInput, facts: ArticleFacts): string[] {
  const tags = new Set<string>();
  if (input.categoryHint) tags.add(input.categoryHint);
  facts.locations.forEach((l) => tags.add(l));
  facts.organizations.slice(0, 2).forEach((o) => tags.add(o.split(/\s+/).slice(0, 2).join(' ')));
  // Extract salient keywords from title
  const titleWords = stripHtml(input.sourceTitle).split(/\s+/).filter((w) => w.length > 3);
  titleWords.slice(0, 3).forEach((w) => tags.add(w));
  tags.add('ताज़ा अपडेट');
  return Array.from(tags)
    .filter(Boolean)
    .slice(0, 8);
}

function classify(input: GenerateInput, facts: ArticleFacts): string | undefined {
  const text = `${input.sourceTitle} ${input.sourceExcerpt}`.toLowerCase();
  const rules: [string, string[]][] = [
    ['rajasthan', ['राजस्थान', 'जयपुर', 'सीकर', 'जोधपुर', 'rajasthan', 'jaipur']],
    ['sports', ['क्रिकेट', 'मैच', 'खेल', 'cricket', 'match', 'ipl', 'गोल']],
    ['business', ['शेयर', 'बाजार', 'कंपनी', 'निवेश', 'business', 'stock', 'market']],
    ['technology', ['टेक', 'ऐप', 'स्मार्टफोन', 'ai', 'technology', 'app', 'gadget']],
    ['politics', ['चुनाव', 'नेता', 'पार्टी', 'election', 'minister', 'सरकार']],
    ['health', ['स्वास्थ्य', 'बीमारी', 'अस्पताल', 'health', 'covid', 'वैक्सीन']],
    ['education', ['परीक्षा', 'रिजल्ट', 'स्कूल', 'exam', 'result', 'admission']],
    ['jobs', ['भर्ती', 'नौकरी', 'vacancy', 'recruitment', 'job']],
    ['weather', ['मौसम', 'बारिश', 'तापमान', 'weather', 'rain']],
    ['entertainment', ['फिल्म', 'बॉलीवुड', 'movie', 'bollywood', 'actor']],
  ];
  for (const [slug, kws] of rules) {
    if (kws.some((k) => text.includes(k)) && input.categorySlugs.includes(slug)) return slug;
  }
  return input.categoryHint && input.categorySlugs.includes(input.categoryHint) ? input.categoryHint : undefined;
}

export const mockAiProvider: AiProvider = {
  name: 'mock',
  model: 'rule-based-hi',
  async generateArticle(input: GenerateInput) {
    const facts = extractFacts(`${input.sourceTitle}. ${input.sourceExcerpt} ${input.sourceContent ?? ''}`);
    const content = buildContent(input, facts);
    const titleOptions = buildTitleOptions(input);
    const factConfidence = computeConfidence(input, facts);
    const oneLine = (facts.keyFacts[0] || input.sourceExcerpt || input.sourceTitle).slice(0, 140);
    const short = stripHtml(content).split(/\s+/).slice(0, 50).join(' ');

    const article: GeneratedArticle = {
      titleOptions,
      title: titleOptions[0],
      subtitle: oneLine,
      content,
      summaryOneLine: oneLine,
      summaryShort: short,
      socialSummary: `${titleOptions[0]} — पढ़ें पूरी खबर।`,
      pushSummary: titleOptions[0].slice(0, 90),
      tags: buildTags(input, facts),
      faq:
        facts.keyFacts.length >= 2
          ? [
              { q: `${input.sourceTitle} — मुख्य बात क्या है?`, a: oneLine },
              { q: 'यह जानकारी कहाँ से है?', a: `यह रिपोर्ट ${input.sourceName} की जानकारी पर आधारित है।` },
            ]
          : [],
      facts,
      factConfidence,
      suggestedCategorySlug: classify(input, facts),
      wordCount: wordCount(content),
    };

    const usage: AiUsageInfo = {
      inputTokens: Math.round(stripHtml(`${input.sourceTitle}${input.sourceExcerpt}`).length / 4),
      outputTokens: Math.round(stripHtml(content).length / 4),
      costInr: 0, // keyless mock has no cost
      provider: 'mock',
      model: 'rule-based-hi',
    };

    return { article, usage };
  },
};
