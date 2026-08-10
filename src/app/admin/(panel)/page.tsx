import Link from 'next/link';
import { getDashboardStats, getArticlesPerDay, getCategoryDistribution } from '@/server/services/analytics';
import { getSettings } from '@/lib/settings';
import { publishedTodayCount } from '@/server/services/publisher';
import prisma from '@/lib/db';
import { StatCard, BarChart, HBar, Badge } from '@/components/admin/ui';
import ActionButton from '@/components/admin/ActionButton';
import { runJob } from './actions';
import { timeAgoHindi } from '@/lib/utils';

export const dynamic = 'force-dynamic';

async function AutomationHealth() {
  // Derive component health from recent activity (spec §53).
  const since = new Date(Date.now() - 3.6e6);
  const [lastFetch, lastPublish, lastAi, errors] = await Promise.all([
    prisma.sourceFetchLog.findFirst({ orderBy: { createdAt: 'desc' } }),
    prisma.publishLog.findFirst({ orderBy: { createdAt: 'desc' } }),
    prisma.aiUsage.findFirst({ orderBy: { createdAt: 'desc' } }),
    prisma.errorLog.count({ where: { level: 'ERROR', createdAt: { gte: since } } }),
  ]);
  const health = [
    { name: 'न्यूज़ फेचर', ok: !!lastFetch, at: lastFetch?.createdAt },
    { name: 'AI प्रोसेसर', ok: !!lastAi, at: lastAi?.createdAt },
    { name: 'पब्लिशर', ok: !!lastPublish, at: lastPublish?.createdAt },
    { name: 'एरर रेट (1घं)', ok: errors < 5, at: null, note: `${errors} errors` },
  ];
  return (
    <div className="card p-4">
      <h3 className="mb-3 text-sm font-black uppercase">ऑटोमेशन हेल्थ</h3>
      <ul className="space-y-2 text-sm">
        {health.map((h) => (
          <li key={h.name} className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${h.ok ? 'bg-green-500' : 'bg-amber-500'}`} />
              {h.name}
            </span>
            <span className="text-xs text-[var(--text-soft)]">{h.note || (h.at ? timeAgoHindi(h.at) : 'निष्क्रिय')}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default async function DashboardPage() {
  const [stats, perDay, catDist, settings, publishedToday, recentLogs] = await Promise.all([
    getDashboardStats(),
    getArticlesPerDay(14),
    getCategoryDistribution(),
    getSettings(),
    publishedTodayCount(),
    prisma.errorLog.findMany({ orderBy: { createdAt: 'desc' }, take: 12 }),
  ]);

  const targetPct = Math.min(100, Math.round((publishedToday / settings.dailyMax) * 100));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-black">डैशबोर्ड</h1>
        <div className="flex gap-2">
          <ActionButton action={runJob.bind(null, 'fetch')} className="rounded-md border border-[var(--border)] px-3 py-1.5 text-sm font-semibold" pendingLabel="फेच हो रहा…">
            स्रोत फेच करें
          </ActionButton>
          <ActionButton action={runJob.bind(null, 'pipeline')} className="rounded-md bg-brand px-3 py-1.5 text-sm font-semibold text-white" pendingLabel="पाइपलाइन चल रही…">
            ▶ पूरी पाइपलाइन चलाएँ
          </ActionButton>
        </div>
      </div>

      {/* Daily target progress (spec §19) */}
      <div className="card p-4">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-semibold">आज का लक्ष्य</span>
          <span className="text-[var(--text-soft)]">{publishedToday} / {settings.dailyMax} (न्यूनतम {settings.dailyMin})</span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-[var(--bg)]">
          <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${targetPct}%` }} />
        </div>
      </div>

      {/* Stat cards (spec §23) */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <StatCard label="आज प्रकाशित" value={stats.publishedToday} tone="green" href="/admin/published" />
        <StatCard label="समीक्षा में" value={stats.pendingReview} tone="amber" href="/admin/queue" />
        <StatCard label="क्यू में" value={stats.queued} tone="brand" href="/admin/queue" />
        <StatCard label="ब्रेकिंग आज" value={stats.breakingToday} tone="red" />
        <StatCard label="फेल" value={stats.failed} tone="red" href="/admin/logs" />
        <StatCard label="आज फेच" value={stats.fetchedToday} />
        <StatCard label="कुल लेख" value={stats.totalArticles} />
        <StatCard label="सक्रिय स्रोत" value={`${stats.activeSources}/${stats.totalSources}`} href="/admin/sources" />
        <StatCard label="AI कॉल आज" value={stats.aiCallsToday} />
        <StatCard label="AI टोकन आज" value={stats.aiTokensToday.toLocaleString('en-IN')} />
        <StatCard label="AI लागत आज" value={`₹${stats.aiCostToday.toFixed(2)}`} sub="अनुमानित" />
        <StatCard label="व्यूज़ आज" value={stats.viewsToday} tone="brand" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card p-4 lg:col-span-2">
          <h3 className="mb-3 text-sm font-black uppercase">पिछले 14 दिन — प्रकाशित लेख</h3>
          <BarChart data={perDay.map((d) => ({ label: d.date.slice(5), value: d.count }))} />
        </div>
        <AutomationHealth />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-4">
          <h3 className="mb-3 text-sm font-black uppercase">श्रेणी अनुसार वितरण</h3>
          <HBar data={catDist.slice(0, 10).map((c) => ({ name: c.name, value: c.count, color: c.color }))} />
        </div>

        {/* Activity timeline (spec §79/§83) */}
        <div className="card p-4">
          <h3 className="mb-3 text-sm font-black uppercase">हाल की गतिविधि</h3>
          <ul className="space-y-2 text-sm">
            {recentLogs.map((l) => (
              <li key={l.id} className="flex gap-2 border-b border-[var(--border)] pb-2 last:border-0">
                <Badge status={l.level === 'ERROR' ? 'FAILED' : 'PROCESSED'} />
                <span className="min-w-0 flex-1 truncate" title={l.message}>{l.message}</span>
                <span className="shrink-0 text-xs text-[var(--text-soft)]">{timeAgoHindi(l.createdAt)}</span>
              </li>
            ))}
            {recentLogs.length === 0 && <li className="text-[var(--text-soft)]">कोई गतिविधि नहीं। पाइपलाइन चलाएँ।</li>}
          </ul>
          <Link href="/admin/logs" className="mt-3 inline-block text-sm font-semibold text-brand">सभी लॉग्स →</Link>
        </div>
      </div>
    </div>
  );
}
