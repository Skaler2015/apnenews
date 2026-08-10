import prisma from '@/lib/db';
import { normalizeUrl, sha256 } from '@/lib/utils';
import { titleSimilarity, jaccard, fingerprint, fingerprintSimilarity } from '@/lib/similarity';
import { DUPLICATE_VERDICT } from '@/lib/constants';

// Duplicate News Detection engine (spec §5). Combines URL hash, title
// similarity, text similarity and content fingerprint into a 0-100 score.
//   0-30  -> different, 31-70 -> review, 71-100 -> likely duplicate.

export interface DedupeResult {
  score: number;
  verdict: string;
  method: string;
  matchedItemId?: string;
  urlHash: string;
  fingerprint: string;
}

export function urlHashOf(url: string): string {
  return sha256(normalizeUrl(url));
}

export async function checkDuplicate(params: {
  title: string;
  url: string;
  text: string;
  publishedAt?: Date | null;
  lookbackHours?: number;
}): Promise<DedupeResult> {
  const urlHash = urlHashOf(params.url);
  const fp = fingerprint(`${params.title} ${params.text}`);
  const lookback = params.lookbackHours ?? 72;
  const since = new Date(Date.now() - lookback * 3.6e6);

  // 1) Exact URL duplicate — highest confidence.
  const exact = await prisma.newsItem.findUnique({ where: { urlHash } });
  if (exact) {
    return {
      score: 100,
      verdict: DUPLICATE_VERDICT.DUPLICATE,
      method: 'URL_HASH',
      matchedItemId: exact.id,
      urlHash,
      fingerprint: fp,
    };
  }

  // 2) Compare against recent items (title/text/fingerprint).
  const recent = await prisma.newsItem.findMany({
    where: { importedAt: { gte: since } },
    select: { id: true, title: true, fingerprint: true, excerpt: true, rawContent: true },
    orderBy: { importedAt: 'desc' },
    take: 400,
  });

  let best = 0;
  let bestId: string | undefined;
  let bestMethod = 'FINGERPRINT';

  for (const item of recent) {
    const tSim = titleSimilarity(params.title, item.title);
    const fSim = fingerprintSimilarity(fp, item.fingerprint);
    const otherText = `${item.excerpt ?? ''} ${item.rawContent ?? ''}`;
    const jSim = params.text && otherText ? jaccard(params.text, otherText) : 0;

    // Blend: title-heavy because feeds reuse headlines verbatim.
    const combined = tSim * 0.5 + fSim * 0.3 + jSim * 0.2;
    const scaled = Math.round(combined * 100);
    if (scaled > best) {
      best = scaled;
      bestId = item.id;
      bestMethod = tSim >= fSim && tSim >= jSim ? 'TITLE_SIM' : fSim >= jSim ? 'FINGERPRINT' : 'TEXT_SIM';
    }
  }

  const verdict =
    best >= 71 ? DUPLICATE_VERDICT.DUPLICATE : best >= 31 ? DUPLICATE_VERDICT.REVIEW : DUPLICATE_VERDICT.DIFFERENT;

  return { score: best, verdict, method: bestMethod, matchedItemId: bestId, urlHash, fingerprint: fp };
}

export async function recordDuplicateCheck(newsItemId: string, result: DedupeResult): Promise<void> {
  await prisma.duplicateCheck.create({
    data: {
      newsItemId,
      matchedItemId: result.matchedItemId,
      score: result.score,
      method: result.method,
      verdict: result.verdict,
    },
  });
}
