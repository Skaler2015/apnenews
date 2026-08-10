import { describe, it, expect } from 'vitest';
import { slugify, normalizeUrl, sha256, stripHtml, wordCount, truncateWords } from '@/lib/utils';

describe('utils', () => {
  it('slugify produces clean lowercase ascii slugs', () => {
    expect(slugify('Hello World News!')).toBe('hello-world-news');
    expect(slugify('   ')).toBe('news'); // fallback
  });

  it('normalizeUrl strips tracking params and trailing slash', () => {
    const a = normalizeUrl('https://www.Example.com/news/article/?utm_source=x&utm_medium=y');
    const b = normalizeUrl('https://example.com/news/article');
    expect(a).toBe(b);
  });

  it('normalizeUrl yields identical hash for equivalent urls', () => {
    const h1 = sha256(normalizeUrl('http://EXAMPLE.com/a/?fbclid=1'));
    const h2 = sha256(normalizeUrl('http://example.com/a'));
    expect(h1).toBe(h2);
  });

  it('stripHtml and wordCount work on markup', () => {
    const html = '<p>यह एक <b>परीक्षण</b> वाक्य है</p>';
    expect(stripHtml(html)).toBe('यह एक परीक्षण वाक्य है');
    expect(wordCount(html)).toBe(5);
  });

  it('truncateWords adds ellipsis when longer', () => {
    expect(truncateWords('one two three four five', 3)).toBe('one two three…');
    expect(truncateWords('one two', 5)).toBe('one two');
  });
});
