import prisma from '@/lib/db';
import { getArticlesPerDay, getCategoryDistribution, getPopularSearches } from '@/server/services/analytics';
import { generateDailyReport } from '@/server/services/pipeline';
import { StatCard, BarChart, HBar } from '@/components/admin/ui';

export const dynamic = 'force-dynamic';

export default async function AnalyticsPage() {
  const [perDay, catDist, popular, report, topArticles, sourceDist] = await Promise.all([
    getArticlesPerDay(14),
    getCategoryDistribution(),
    getPopularSearches(10),
    generateDailyReport(),
    prisma.newsArticle.findMany({ where: { status: 'PUBLISHED' }, orderBy: { views: 'desc' }, take: 10, select: { title: true, views: true, category: { select: { name: true } } } }),
    prisma.newsItem.groupBy({ by: ['sourceName'], _count: { _all: true }, orderBy: { _count: { sourceName: 'desc' } }, take: 8 }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black">एनालिटिक्स</h1>

      {/* Daily automation report (spec §57) */}
      <section className="card p-4">
        <h2 className="mb-3 text-sm font-black uppercase">आज की रिपोर्ट — {report.date}</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          <StatCard label="फेच" value={report.fetched} />
          <StatCard label="यूनिक" value={report.unique} />
          <StatCard label="प्रकाशित" value={report.published} tone="green" />
          <StatCard label="अस्वीकृत" value={report.rejected} tone="amber" />
          <StatCard label="डुप्लिकेट" value={report.duplicates} />
          <StatCard label="फेल" value={report.failed} tone="red" />
          <StatCard label="औसत गुणवत्ता" value={`${report.avgQuality}%`} />
          <StatCard label="AI लागत" value={`₹${report.aiCostInr}`} />
        </div>
        <p className="mt-3 text-sm text-[var(--text-soft)]">शीर्ष श्रेणी: <b className="text-[var(--text)]">{report.topCategory}</b> · शीर्ष लेख: <b className="text-[var(--text)]">{report.topArticle}</b></p>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-4">
          <h2 className="mb-3 text-sm font-black uppercase">प्रकाशन (14 दिन)</h2>
          <BarChart data={perDay.map((d) => ({ label: d.date.slice(5), value: d.count }))} />
        </div>
        <div className="card p-4">
          <h2 className="mb-3 text-sm font-black uppercase">श्रेणी वितरण</h2>
          <HBar data={catDist.slice(0, 10).map((c) => ({ name: c.name, value: c.count, color: c.color }))} />
        </div>
        <div className="card p-4">
          <h2 className="mb-3 text-sm font-black uppercase">स्रोत अनुसार आइटम</h2>
          <HBar data={sourceDist.map((s) => ({ name: s.sourceName, value: s._count._all }))} />
        </div>
        <div className="card p-4">
          <h2 className="mb-3 text-sm font-black uppercase">शीर्ष लेख (व्यूज़)</h2>
          <ol className="space-y-2 text-sm">
            {topArticles.map((a, i) => (
              <li key={i} className="flex justify-between gap-2 border-b border-[var(--border)] pb-1 last:border-0">
                <span className="min-w-0 truncate">{i + 1}. {a.title}</span>
                <span className="shrink-0 font-bold">{a.views}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {popular.length > 0 && (
        <div className="card p-4">
          <h2 className="mb-3 text-sm font-black uppercase">लोकप्रिय खोजें</h2>
          <div className="flex flex-wrap gap-2">
            {popular.map((p) => <span key={p} className="rounded-full border border-[var(--border)] px-3 py-1 text-sm">{p}</span>)}
          </div>
        </div>
      )}
    </div>
  );
}
