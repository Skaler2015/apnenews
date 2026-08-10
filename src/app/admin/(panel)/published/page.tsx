import Link from 'next/link';
import prisma from '@/lib/db';
import { Badge, ScorePill } from '@/components/admin/ui';
import { timeAgoHindi } from '@/lib/utils';

export const dynamic = 'force-dynamic';
const PAGE_SIZE = 30;

export default async function PublishedPage({ searchParams }: { searchParams: { page?: string } }) {
  const page = Math.max(1, Number(searchParams.page) || 1);
  const [articles, total] = await Promise.all([
    prisma.newsArticle.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: { publishedAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { category: true },
    }),
    prisma.newsArticle.count({ where: { status: 'PUBLISHED' } }),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black">प्रकाशित लेख</h1>
        <span className="text-sm text-[var(--text-soft)]">कुल {total}</span>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[800px] text-sm">
          <thead className="border-b border-[var(--border)] bg-[var(--bg)] text-left text-xs uppercase text-[var(--text-soft)]">
            <tr><th className="p-3">शीर्षक</th><th className="p-3">श्रेणी</th><th className="p-3">गुणवत्ता</th><th className="p-3">व्यूज़</th><th className="p-3">प्रकाशित</th><th className="p-3"></th></tr>
          </thead>
          <tbody>
            {articles.map((a) => (
              <tr key={a.id} className="border-b border-[var(--border)] last:border-0">
                <td className="p-3 font-semibold">{a.title}</td>
                <td className="p-3">{a.category && <span className="cat-chip" style={{ backgroundColor: a.category.color }}>{a.category.name}</span>}</td>
                <td className="p-3"><ScorePill label="" value={a.qualityScore} /></td>
                <td className="p-3">{a.views}</td>
                <td className="p-3 text-xs text-[var(--text-soft)]">{a.publishedAt ? timeAgoHindi(a.publishedAt) : ''}</td>
                <td className="p-3 text-right"><Link href={`/${a.category?.slug}/${a.slug}`} className="text-brand">देखें →</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex justify-between">
        {page > 1 ? <Link href={`/admin/published?page=${page - 1}`} className="rounded border border-[var(--border)] px-4 py-2 text-sm font-semibold">← पिछला</Link> : <span />}
        {page * PAGE_SIZE < total ? <Link href={`/admin/published?page=${page + 1}`} className="rounded border border-[var(--border)] px-4 py-2 text-sm font-semibold">अगला →</Link> : <span />}
      </div>
    </div>
  );
}
