import type { Metadata } from 'next';
import Link from 'next/link';
import { getTrending } from '@/server/services/trending';
import { timeAgoHindi } from '@/lib/utils';

export const revalidate = 300;
export const metadata: Metadata = { title: 'ट्रेंडिंग न्यूज़', description: 'अभी सबसे ज़्यादा पढ़ी जा रही खबरें।' };

export default async function TrendingPage() {
  const items = await getTrending(20);
  return (
    <div className="container-news py-5">
      <h1 className="mb-4 border-b-2 border-brand pb-2 text-2xl font-black text-brand">🔥 ट्रेंडिंग न्यूज़</h1>
      {items.length === 0 ? (
        <p className="py-16 text-center text-[var(--text-soft)]">अभी कोई ट्रेंडिंग खबर नहीं।</p>
      ) : (
        <ol className="space-y-3">
          {items.map((a, i) => (
            <li key={a.id} className="card flex items-center gap-4 p-3">
              <span className="text-2xl font-black text-brand/60">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <Link href={`/${a.category?.slug ?? 'news'}/${a.slug}`} className="font-bold leading-snug link-hover">
                  {a.title}
                </Link>
                <div className="mt-1 text-xs text-[var(--text-soft)]">
                  {a.category?.name} · {a.publishedAt ? timeAgoHindi(a.publishedAt) : ''} · {a.views} व्यूज़
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
