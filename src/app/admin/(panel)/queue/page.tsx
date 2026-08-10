import Link from 'next/link';
import prisma from '@/lib/db';
import { Badge, ScorePill } from '@/components/admin/ui';
import ActionButton from '@/components/admin/ActionButton';
import { approveArticle, rejectArticle, publishNow } from '../actions';
import { timeAgoHindi } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const STATUS_FILTERS = ['NEEDS_REVIEW', 'APPROVED', 'PROCESSED', 'REJECTED', 'ALL'];

export default async function QueuePage({ searchParams }: { searchParams: { status?: string } }) {
  const status = searchParams.status || 'NEEDS_REVIEW';
  const where = status === 'ALL' ? { status: { not: 'PUBLISHED' } } : { status };

  const articles = await prisma.newsArticle.findMany({
    where,
    orderBy: [{ isBreaking: 'desc' }, { priority: 'desc' }, { createdAt: 'desc' }],
    take: 60,
    include: { category: true, factCheck: true, quality: true, images: { where: { role: 'FEATURED' }, take: 1 } },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black">न्यूज़ क्यू</h1>
        <span className="text-sm text-[var(--text-soft)]">{articles.length} आइटम</span>
      </div>

      {/* Filters (spec §78) */}
      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((s) => (
          <Link
            key={s}
            href={`/admin/queue?status=${s}`}
            className={`rounded-md px-3 py-1.5 text-sm font-semibold ${status === s ? 'bg-brand text-white' : 'border border-[var(--border)]'}`}
          >
            {s}
          </Link>
        ))}
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="border-b border-[var(--border)] bg-[var(--bg)] text-left text-xs uppercase text-[var(--text-soft)]">
            <tr>
              <th className="p-3">शीर्षक</th>
              <th className="p-3">श्रेणी</th>
              <th className="p-3">स्कोर</th>
              <th className="p-3">डुप्लिकेट</th>
              <th className="p-3">स्थिति</th>
              <th className="p-3 text-right">कार्रवाई</th>
            </tr>
          </thead>
          <tbody>
            {articles.map((a) => (
              <tr key={a.id} className="border-b border-[var(--border)] align-top last:border-0">
                <td className="p-3">
                  <div className="flex items-start gap-2">
                    {a.isBreaking && <span className="mt-0.5 rounded bg-brand px-1.5 py-0.5 text-[10px] font-bold text-white">ब्रेकिंग</span>}
                    <div className="min-w-0">
                      <div className="font-semibold leading-snug">{a.title}</div>
                      <div className="mt-0.5 text-xs text-[var(--text-soft)]">{a.sourceName} · {timeAgoHindi(a.createdAt)}</div>
                    </div>
                  </div>
                </td>
                <td className="p-3">
                  {a.category && <span className="cat-chip" style={{ backgroundColor: a.category.color }}>{a.category.name}</span>}
                </td>
                <td className="p-3">
                  <div className="flex flex-col gap-0.5">
                    <ScorePill label="तथ्य" value={a.factConfidence} />
                    <ScorePill label="गुणवत्ता" value={a.qualityScore} />
                    <ScorePill label="प्राथमिकता" value={a.priority} />
                  </div>
                </td>
                <td className="p-3">
                  <span className={`font-bold ${a.duplicateScore >= 71 ? 'text-red-600' : a.duplicateScore >= 31 ? 'text-amber-600' : 'text-green-600'}`}>
                    {a.duplicateScore}
                  </span>
                </td>
                <td className="p-3"><Badge status={a.status} /></td>
                <td className="p-3">
                  <div className="flex flex-wrap justify-end gap-1.5">
                    {a.status === 'PUBLISHED' ? (
                      <Link href={`/${a.category?.slug}/${a.slug}`} className="rounded border border-[var(--border)] px-2 py-1 text-xs font-semibold">देखें</Link>
                    ) : (
                      <>
                        {a.status !== 'APPROVED' && (
                          <ActionButton action={approveArticle.bind(null, a.id)} className="rounded bg-emerald-600 px-2 py-1 text-xs font-semibold text-white">स्वीकृत</ActionButton>
                        )}
                        <ActionButton action={publishNow.bind(null, a.id)} className="rounded bg-brand px-2 py-1 text-xs font-semibold text-white">प्रकाशित</ActionButton>
                        {a.status !== 'REJECTED' && (
                          <ActionButton action={rejectArticle.bind(null, a.id)} confirm="इस लेख को अस्वीकार करें?" className="rounded border border-red-300 px-2 py-1 text-xs font-semibold text-red-600">अस्वीकार</ActionButton>
                        )}
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {articles.length === 0 && (
              <tr><td colSpan={6} className="p-8 text-center text-[var(--text-soft)]">इस फ़िल्टर में कोई लेख नहीं।</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
