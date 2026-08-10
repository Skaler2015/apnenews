import type { AiProvider, GenerateInput, GeneratedArticle, AiUsageInfo } from '../types';
import { wordCount, stripHtml } from '@/lib/utils';
import { mockAiProvider } from './mock';

// Optional real-LLM provider. Uses the Anthropic Messages API when AI_API_KEY
// is set. On any error it falls back to the deterministic mock provider so the
// pipeline never stalls (spec §86). The prompt strictly forbids inventing
// facts (spec §64) and requires source attribution (spec §11).

const COST_PER_1K = Number(process.env.AI_COST_PER_1K_INR || '1.2');

const SYSTEM_PROMPT = `आप एक अनुभवी हिंदी समाचार संपादक हैं। आपको स्रोत की जानकारी दी जाएगी। नियम:
- केवल दी गई जानकारी के आधार पर मौलिक हिंदी लेख लिखें।
- कोई तथ्य, आंकड़ा, उद्धरण, तारीख या नाम मनगढ़ंत न बनाएं।
- यदि जानकारी अपर्याप्त हो तो अनुमान न लगाएं।
- स्रोत का श्रेय दें, कॉपीराइट सामग्री की नकल न करें।
- प्राकृतिक, स्पष्ट और पठनीय हिंदी लिखें। क्लिकबेट से बचें।
आउटपुट केवल वैध JSON में दें।`;

function buildUserPrompt(input: GenerateInput): string {
  return `स्रोत शीर्षक: ${input.sourceTitle}
स्रोत सारांश: ${input.sourceExcerpt}
स्रोत का नाम: ${input.sourceName}
स्रोत URL: ${input.sourceUrl}
लक्षित शब्द: ${input.targetWords}
वैध श्रेणी slugs: ${input.categorySlugs.join(', ')}

निम्न JSON स्कीमा में उत्तर दें:
{
  "titleOptions": ["3 शीर्षक विकल्प"],
  "title": "सर्वश्रेष्ठ शीर्षक",
  "subtitle": "उपशीर्षक",
  "content": "HTML लेख (h2/h3/ul/table का उपयोग, अंत में स्रोत उल्लेख)",
  "summaryOneLine": "एक पंक्ति",
  "summaryShort": "~50 शब्द",
  "socialSummary": "सोशल मीडिया सारांश",
  "pushSummary": "पुश नोटिफिकेशन (<=90 अक्षर)",
  "tags": ["3-8 टैग"],
  "faq": [{"q":"","a":""}],
  "facts": {"entities":[],"people":[],"organizations":[],"locations":[],"dates":[],"numbers":[],"keyFacts":[]},
  "factConfidence": 0-100,
  "suggestedCategorySlug": "एक valid slug"
}`;
}

async function callAnthropic(input: GenerateInput): Promise<{ article: GeneratedArticle; usage: AiUsageInfo }> {
  const apiKey = process.env.AI_API_KEY!;
  const model = process.env.AI_MODEL || 'claude-sonnet-4-5';
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 4000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildUserPrompt(input) }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic API ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const text: string = data.content?.[0]?.text ?? '';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No JSON in AI response');
  const parsed = JSON.parse(jsonMatch[0]) as GeneratedArticle;
  parsed.wordCount = wordCount(parsed.content || '');

  const inputTokens = data.usage?.input_tokens ?? Math.round(stripHtml(buildUserPrompt(input)).length / 4);
  const outputTokens = data.usage?.output_tokens ?? Math.round((parsed.content?.length ?? 0) / 4);
  const usage: AiUsageInfo = {
    inputTokens,
    outputTokens,
    costInr: ((inputTokens + outputTokens) / 1000) * COST_PER_1K,
    provider: 'anthropic',
    model,
  };
  return { article: parsed, usage };
}

export const anthropicAiProvider: AiProvider = {
  name: 'anthropic',
  model: process.env.AI_MODEL,
  async generateArticle(input: GenerateInput) {
    try {
      if (!process.env.AI_API_KEY) throw new Error('AI_API_KEY missing');
      return await callAnthropic(input);
    } catch (err) {
      // Graceful degradation: keep the pipeline alive with the mock provider.
      console.warn('Anthropic provider failed, using mock fallback:', (err as Error).message);
      return mockAiProvider.generateArticle(input);
    }
  },
};
