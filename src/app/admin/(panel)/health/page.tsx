import prisma from '@/lib/db';
import { getSettings } from '@/lib/settings';
import { StatCard } from '@/components/admin/ui';
import ActionButton from '@/components/admin/ActionButton';
import { runJob } from '../actions';
import { timeAgoHindi } from '@/lib/utils';

export const dynamic = 'force-dynamic';

// Automation health dashboard (spec §53).
export default async function HealthPage() {
  const settings = await getSettings();
  const since1h = new Date(Date.now() - 3.6e6);
  const [lastFetch, lastPublish, lastAi, lastSitemap, errors1h, queueDepth, importedPending, notifications] = await Promise.all([
    prisma.sourceFetchLog.findFirst({ orderBy: { createdAt: 'desc' } }),
    prisma.publishLog.findFirst({ orderBy: { createdAt: 'desc' } }),
    prisma.aiUsage.findFirst({ orderBy: { createdAt: 'desc' } }),
    prisma.sitemapLog.findFirst({ orderBy: { createdAt: 'desc' } }),
    prisma.errorLog.count({ where: { level: 'ERROR', createdAt: { gte: since1h } } }),
    prisma.newsQueue.count({ where: { publishStatus: 'QUEUED' } }),
    prisma.newsItem.count({ where: { status: 'IMPORTED' } }),
    prisma.notification.findMany({ orderBy: { createdAt: 'desc' }, take: 15 }),
  ]);

  const components = [
    { name: 'न्यूज़ फेचर', at: lastFetch?.createdAt, ok: !!lastFetch },
    { name: 'AI प्रोसेसर', at: lastAi?.createdAt, ok: !!lastAi },
    { name: 'पब्लिशर', at: lastPublish?.createdAt, ok: !!lastPublish },
    { name: 'साइटमैप', at: lastSitemap?.createdAt, ok: !!lastSitemap },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black">ऑटोमेशन हेल्थ</h1>
        <div className="flex gap-2">
          <ActionButton action={runJob.bind(null, 'process')} className="rounded-md border border-[var(--border)] px-3 py-1.5 text-sm font-semibold" pendingLabel="…">आइटम प्रोसेस करें</ActionButton>
          <ActionButton action={runJob.bind(null, 'pipeline')} className="rounded-md bg-brand px-3 py-1.5 text-sm font-semibold text-white" pendingLabel="चल रही…">▶ पाइपलाइन</ActionButton>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="ऑटोमेशन" value={settings.automationEnabled ? 'चालू' : 'बंद'} tone={settings.automationEnabled ? 'green' : 'red'} />
        <StatCard label="एरर (1घं)" value={errors1h} tone={errors1h > 4 ? 'red' : 'green'} />
        <StatCard label="प्रकाशन क्यू" value={queueDepth} tone="brand" />
        <StatCard label="प्रोसेसिंग बाकी" value={importedPending} tone="amber" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="card p-4">
          <h2 className="mb-3 text-sm font-black uppercase">कंपोनेंट स्थिति</h2>
          <ul className="space-y-3">
            {components.map((c) => (
              <li key={c.name} className="flex items-center justify-between">
                <span className="flex items-center gap-2 font-semibold">
                  <span className={`h-3 w-3 rounded-full ${c.ok ? 'bg-green-500' : 'bg-slate-400'}`} />
                  {c.name}
                </span>
                <span className="text-sm text-[var(--text-soft)]">
                  {c.ok ? `स्वस्थ · अंतिम रन ${timeAgoHindi(c.at!)}` : 'अभी तक नहीं चला'}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="card p-4">
          <h2 className="mb-3 text-sm font-black uppercase">सूचनाएँ</h2>
          <ul className="space-y-2 text-sm">
            {notifications.map((n) => (
              <li key={n.id} className="border-b border-[var(--border)] pb-2 last:border-0">
                <span className={`mr-2 rounded px-1.5 py-0.5 text-[10px] font-bold ${n.severity === 'CRITICAL' ? 'bg-red-100 text-red-700' : n.severity === 'WARN' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'}`}>{n.type}</span>
                <span className="font-semibold">{n.title}</span>
                <span className="block text-xs text-[var(--text-soft)]">{n.message} · {timeAgoHindi(n.createdAt)}</span>
              </li>
            ))}
            {notifications.length === 0 && <li className="text-[var(--text-soft)]">कोई सूचना नहीं।</li>}
          </ul>
        </div>
      </div>
    </div>
  );
}
