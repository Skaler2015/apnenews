import Parser from 'rss-parser';
import type { NewsProvider, RawFeedItem } from '../types';

// RSS/Atom news provider. Respects source terms by only reading feed metadata
// (title/excerpt/link/image) — it never scrapes full article bodies or
// bypasses paywalls/anti-bot systems (spec §65).

const parser = new Parser({
  timeout: 15000,
  headers: { 'User-Agent': 'ApneNewsBot/1.0 (+https://apnenews.local)' },
  customFields: {
    item: [
      ['media:content', 'mediaContent', { keepArray: false }],
      ['media:thumbnail', 'mediaThumbnail', { keepArray: false }],
    ],
  },
});

function extractImage(item: Record<string, unknown>): string | undefined {
  const enclosure = item.enclosure as { url?: string; type?: string } | undefined;
  if (enclosure?.url && /image|jpg|jpeg|png|webp/i.test(enclosure.type || enclosure.url)) return enclosure.url;
  const media = item.mediaContent as { $?: { url?: string } } | undefined;
  if (media?.$?.url) return media.$.url;
  const thumb = item.mediaThumbnail as { $?: { url?: string } } | undefined;
  if (thumb?.$?.url) return thumb.$.url;
  const content = (item['content:encoded'] as string) || (item.content as string) || '';
  const m = content.match(/<img[^>]+src=["']([^"']+)["']/i);
  return m?.[1];
}

export const rssNewsProvider: NewsProvider = {
  name: 'rss',
  async fetch(feedUrl: string): Promise<RawFeedItem[]> {
    const feed = await parser.parseURL(feedUrl);
    return (feed.items || []).map((raw) => {
      const item = raw as unknown as Record<string, unknown>;
      return {
        title: String(item.title || '').trim(),
        link: String(item.link || '').trim(),
        contentSnippet: typeof item.contentSnippet === 'string' ? item.contentSnippet.trim() : undefined,
        content: (item['content:encoded'] as string) || (item.content as string) || undefined,
        isoDate: item.isoDate as string | undefined,
        pubDate: item.pubDate as string | undefined,
        enclosureUrl: extractImage(item),
        categories: item.categories as string[] | undefined,
      };
    });
  },
};
