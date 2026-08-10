import { createHash } from 'crypto';
import { stripHtml } from './utils';

// Lightweight, dependency-free text-similarity utilities powering the
// duplicate-detection engine (spec §5).

const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'of', 'to', 'in', 'on', 'for', 'is', 'was',
  'और', 'का', 'की', 'के', 'को', 'में', 'से', 'है', 'था', 'पर', 'ने', 'यह', 'एक',
]);

export function tokenize(text: string): string[] {
  return stripHtml(text)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

/** Jaccard similarity over unique tokens, 0..1. */
export function jaccard(a: string, b: string): number {
  const setA = new Set(tokenize(a));
  const setB = new Set(tokenize(b));
  if (setA.size === 0 || setB.size === 0) return 0;
  let inter = 0;
  for (const t of setA) if (setB.has(t)) inter++;
  const union = setA.size + setB.size - inter;
  return union === 0 ? 0 : inter / union;
}

/** Normalized Levenshtein-based title similarity (0..1). */
export function titleSimilarity(a: string, b: string): number {
  const x = a.toLowerCase().trim();
  const y = b.toLowerCase().trim();
  if (!x || !y) return 0;
  if (x === y) return 1;
  const dist = levenshtein(x, y);
  const maxLen = Math.max(x.length, y.length);
  return maxLen === 0 ? 0 : 1 - dist / maxLen;
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const prev = new Array(n + 1);
  const curr = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= n; j++) prev[j] = curr[j];
  }
  return prev[n];
}

/** 64-bit SimHash fingerprint (hex) for near-duplicate content detection. */
export function fingerprint(text: string): string {
  const tokens = tokenize(text);
  if (tokens.length === 0) return '0'.repeat(16);
  const bits = new Array(64).fill(0);
  for (const token of tokens) {
    const h = hash64(token);
    for (let i = 0; i < 64; i++) {
      const bit = (h >> BigInt(i)) & 1n;
      bits[i] += bit === 1n ? 1 : -1;
    }
  }
  let result = 0n;
  for (let i = 0; i < 64; i++) if (bits[i] > 0) result |= 1n << BigInt(i);
  return result.toString(16).padStart(16, '0');
}

function hash64(str: string): bigint {
  const hex = createHash('sha1').update(str).digest('hex').slice(0, 16);
  return BigInt('0x' + hex);
}

/** Hamming distance between two hex fingerprints -> similarity 0..1. */
export function fingerprintSimilarity(fpA: string, fpB: string): number {
  try {
    const a = BigInt('0x' + fpA);
    const b = BigInt('0x' + fpB);
    let xor = a ^ b;
    let diff = 0;
    while (xor > 0n) {
      diff += Number(xor & 1n);
      xor >>= 1n;
    }
    return 1 - diff / 64;
  } catch {
    return 0;
  }
}
