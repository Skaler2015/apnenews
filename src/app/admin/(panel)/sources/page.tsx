import prisma from '@/lib/db';
import ActionButton from '@/components/admin/ActionButton';
import { toggleSource, deleteSource, addSource } from '../actions';
import { timeAgoHindi } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function SourcesPage() {
  const [sources, categories] = await Promise.all([
    prisma.newsSource.findMany({ orderBy: { priority: 'desc' }, include: { category: true, _count: { select: { newsItems: true } } } }),
    prisma.category.findMany({ where: { isActive: true }, orderBy: { order: 'asc' }, select: { name: true, slug: true } }),
  ]);

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-black">न्यूज़ स्रोत</h1>

      {/* Add source form (spec §41) */}
      <form action={addSource} className="card grid grid-cols-1 gap-3 p-4 md:grid-cols-3 lg:grid-cols-6">
        <input name="name" placeholder="स्रोत नाम" required className="rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm md:col-span-2" />
        <input name="feedUrl" placeholder="RSS/API URL" required className="rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm md:col-span-2" />
        <select name="type" className="rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm">
          {['RSS', 'API', 'GOV', 'PRESS', 'YOUTUBE'].map((t) => <option key={t}>{t}</option>)}
        </select>
        <select name="category" className="rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm">
          <option value="">श्रेणी</option>
          {categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
        </select>
        <input name="priority" type="number" placeholder="प्राथमिकता" defaultValue={60} className="rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm" />
        <input name="trustScore" type="number" placeholder="ट्रस्ट" defaultValue={70} className="rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm" />
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isOfficial" /> आधिकारिक</label>
        <button className="rounded bg-brand px-4 py-2 text-sm font-semibold text-white md:col-span-2">स्रोत जोड़ें</button>
      </form>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="border-b border-[var(--border)] bg-[var(--bg)] text-left text-xs uppercase text-[var(--text-soft)]">
            <tr><th className="p-3">स्रोत</th><th className="p-3">प्रकार</th><th className="p-3">श्रेणी</th><th className="p-3">प्राथ./ट्रस्ट</th><th className="p-3">आइटम</th><th className="p-3">एरर</th><th className="p-3">अंतिम फेच</th><th className="p-3 text-right">कार्रवाई</th></tr>
          </thead>
          <tbody>
            {sources.map((s) => (
              <tr key={s.id} className="border-b border-[var(--border)] last:border-0">
                <td className="p-3">
                  <div className="font-semibold">{s.name} {s.isDemo && <span className="ml-1 rounded bg-amber-100 px-1 text-[10px] font-bold text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">डेमो</span>}</div>
                  <div className="max-w-xs truncate text-xs text-[var(--text-soft)]">{s.feedUrl}</div>
                </td>
                <td className="p-3">{s.type}{s.isOfficial && ' ✓'}</td>
                <td className="p-3">{s.category?.name || '—'}</td>
                <td className="p-3">{s.priority}/{s.trustScore}</td>
                <td className="p-3">{s._count.newsItems}</td>
                <td className="p-3">{s.errorCount > 0 ? <span className="font-bold text-red-600">{s.errorCount}</span> : '0'}</td>
                <td className="p-3 text-xs text-[var(--text-soft)]">{s.lastFetchAt ? timeAgoHindi(s.lastFetchAt) : 'कभी नहीं'}</td>
                <td className="p-3">
                  <div className="flex justify-end gap-1.5">
                    <ActionButton action={toggleSource.bind(null, s.id, !s.isActive)} className={`rounded px-2 py-1 text-xs font-semibold ${s.isActive ? 'bg-green-600 text-white' : 'border border-[var(--border)]'}`}>
                      {s.isActive ? 'सक्रिय' : 'निष्क्रिय'}
                    </ActionButton>
                    <ActionButton action={deleteSource.bind(null, s.id)} confirm="स्रोत हटाएँ?" className="rounded border border-red-300 px-2 py-1 text-xs font-semibold text-red-600">हटाएँ</ActionButton>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
