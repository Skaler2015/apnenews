import { createHash } from 'crypto';

/** Slugify a title into a stable, lowercase, ASCII-safe URL slug.
 *  Hindi text is transliterated loosely by dropping to a hash suffix so the
 *  slug stays readable when Latin words exist and unique otherwise. */
export function slugify(input: string, maxLen = 70): string {
  const base = input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[ऀ-ॿ]+/g, ' ') // strip Devanagari (kept via suffix)
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, maxLen);
  return base || 'news';
}

/** Deterministic short hash suffix, used to guarantee slug uniqueness. */
export function shortHash(input: string, len = 6): string {
  return createHash('sha256').update(input).digest('hex').slice(0, len);
}

export function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

/** Normalize a URL for duplicate detection: strip tracking params, trailing
 *  slash, protocol/host case. */
export function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    u.hash = '';
    const stripParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid', 'gclid', 'ref'];
    stripParams.forEach((p) => u.searchParams.delete(p));
    u.protocol = u.protocol.toLowerCase();
    u.hostname = u.hostname.toLowerCase().replace(/^www\./, '');
    let path = u.pathname.replace(/\/+$/, '');
    return `${u.hostname}${path}${u.search}`;
  } catch {
    return url.trim().toLowerCase();
  }
}

/** Strip HTML tags and collapse whitespace. */
export function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#\d+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function wordCount(text: string): number {
  const clean = stripHtml(text);
  return clean ? clean.split(/\s+/).length : 0;
}

/** Reading-time helper in minutes (Hindi/English mixed ~180 wpm). */
export function readingTime(text: string): number {
  return Math.max(1, Math.round(wordCount(text) / 180));
}

export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

/** Truncate to n words with an ellipsis. */
export function truncateWords(text: string, n: number): string {
  const words = stripHtml(text).split(/\s+/);
  if (words.length <= n) return words.join(' ');
  return words.slice(0, n).join(' ') + '…';
}

export function formatDateHindi(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('hi-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export function timeAgoHindi(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seconds < 60) return 'अभी';
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins} मिनट पहले`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} घंटे पहले`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} दिन पहले`;
  return formatDateHindi(d);
}
