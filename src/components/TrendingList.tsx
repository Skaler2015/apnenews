import Link from 'next/link';
import { getTrending } from '@/server/services/trending';

// "ट्रेंडिंग अभी" sidebar widget (spec §28).
export default async function TrendingList({ limit = 8 }: { limit?: number }) {
  const items = await getTrending(limit);
  if (items.length === 0) return null;

  return (
    <section className="card p-4">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-wide">
        <span className="text-brand">🔥</span> ट्रेंडिंग अभी
      </h3>
      <ol className="space-y-3">
        {items.map((a, i) => (
          <li key={a.id} className="flex gap-3">
            <span className="text-lg font-black text-brand/70">{i + 1}</span>
            <Link href={`/${a.category?.slug ?? 'news'}/${a.slug}`} className="text-sm font-semibold leading-snug link-hover">
              {a.title}
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
