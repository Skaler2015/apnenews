import Link from 'next/link';
import prisma from '@/lib/db';
import { formatDateHindi } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const SCOPES = ['ALL', 'FETCH', 'AI', 'PUBLISH', 'IMAGE', 'SOCIAL', 'SITEMAP', 'SYSTEM'];

export default async function LogsPage({ searchParams }: { searchParams: { scope?: string } }) {
  const scope = searchParams.scope || 'ALL';
  const logs = await prisma.errorLog.findMany({
    where: scope === 'ALL' ? {} : { scope },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  const color = (l: string) => (l === 'ERROR' ? 'text-red-600' : l === 'WARN' ? 'text-amber-600' : 'text-[var(--text-soft)]');

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-black">सिस्टम लॉग्स</h1>
      <div className="flex flex-wrap gap-2">
        {SCOPES.map((s) => (
          <Link key={s} href={`/admin/logs?scope=${s}`} className={`rounded-md px-3 py-1.5 text-sm font-semibold ${scope === s ? 'bg-brand text-white' : 'border border-[var(--border)]'}`}>{s}</Link>
        ))}
      </div>
      <div className="card divide-y divide-[var(--border)] font-mono text-xs">
        {logs.map((l) => (
          <div key={l.id} className="flex gap-3 px-3 py-2">
            <span className="shrink-0 text-[var(--text-soft)]">{formatDateHindi(l.createdAt)}</span>
            <span className={`shrink-0 font-bold ${color(l.level)}`}>{l.level}</span>
            <span className="shrink-0 font-bold text-brand">{l.scope}</span>
            <span className="min-w-0 flex-1">{l.message}</span>
          </div>
        ))}
        {logs.length === 0 && <div className="p-8 text-center text-[var(--text-soft)]">कोई लॉग नहीं।</div>}
      </div>
    </div>
  );
}
