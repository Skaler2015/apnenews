// Provider abstraction interfaces (spec §76). Swapping a provider is a matter
// of implementing the interface and wiring it in the factory — no changes to
// pipeline code required.

export interface RawFeedItem {
  title: string;
  link: string;
  contentSnippet?: string;
  content?: string;
  isoDate?: string;
  pubDate?: string;
  enclosureUrl?: string;
  categories?: string[];
}

export interface NewsProvider {
  name: string;
  /** Fetch recent items for a given feed/source URL. */
  fetch(feedUrl: string): Promise<RawFeedItem[]>;
}

export interface ArticleFacts {
  entities: string[];
  people: string[];
  organizations: string[];
  locations: string[];
  dates: string[];
  numbers: string[];
  keyFacts: string[];
}

export interface GeneratedArticle {
  titleOptions: string[]; // multiple headline options (spec §12)
  title: string;
  subtitle: string;
  content: string; // original Hindi HTML
  summaryOneLine: string;
  summaryShort: string;
  socialSummary: string;
  pushSummary: string;
  tags: string[];
  faq: { q: string; a: string }[];
  facts: ArticleFacts;
  factConfidence: number; // 0-100
  suggestedCategorySlug?: string;
  wordCount: number;
}

export interface AiUsageInfo {
  inputTokens: number;
  outputTokens: number;
  costInr: number;
  provider: string;
  model?: string;
}

export interface GenerateInput {
  sourceTitle: string;
  sourceExcerpt: string;
  sourceContent?: string;
  sourceName: string;
  sourceUrl: string;
  categoryHint?: string;
  categorySlugs: string[]; // valid category slugs for classification
  isBreaking: boolean;
  targetWords: number;
}

export interface AiProvider {
  name: string;
  model?: string;
  /** Produce an original Hindi article + metadata from source facts. */
  generateArticle(input: GenerateInput): Promise<{ article: GeneratedArticle; usage: AiUsageInfo }>;
}

export interface ImageResult {
  url: string;
  altText: string;
  caption: string;
  credit: string;
  provider: string;
  width: number;
  height: number;
}

export interface ImageInput {
  title: string;
  categoryName: string;
  categoryColor: string;
  topic: string;
  isSensitive: boolean;
}

export interface ImageProvider {
  name: string;
  generate(input: ImageInput): Promise<ImageResult>;
}

export interface SocialResult {
  ok: boolean;
  externalId?: string;
  error?: string;
}

export interface SocialProvider {
  name: string;
  platform: 'FACEBOOK' | 'TWITTER' | 'TELEGRAM' | 'WHATSAPP';
  enabled: boolean;
  post(content: string, url: string): Promise<SocialResult>;
}
