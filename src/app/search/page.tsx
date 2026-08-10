import type { Metadata } from 'next';
import Link from 'next/link';
import { searchArticles } from '@/server/queries';
import { recordSearch, getPopularSearches } from '@/server/services/analytics';
import { ArticleCard } from '@/components/ArticleCard';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'खोज', robots: { index: false, follow: true } };

export default async function SearchPage({ searchParams }: { searchParams: { q?: string } }) {
  const q = (searchParams.q || '').trim();
  const [results, popular] = await Promise.all([q ? searchArticles(q) : Promise.resolve([]), getPopularSearches()]);
  if (q) recordSearch(q).catch(() => {});

  return (
    <div className="container-news py-5">
      <form action="/search" className="mb-5 flex gap-2">
        <input
          name="q"
          defaultValue={q}
          autoFocus
          placeholder="खबर, विषय या टैग खोजें…"
          className="flex-1 rounded-md border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 outline-none focus:border-brand"
        />
        <button className="rounded-md bg-brand px-5 py-2.5 font-semibold text-white">खोजें</button>
      </form>

      {!q && popular.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-2 text-sm font-bold uppercase text-[var(--text-soft)]">लोकप्रिय खोजें</h2>
          <div className="flex flex-wrap gap-2">
            {popular.map((p) => (
              <Link key={p} href={`/search?q=${encodeURIComponent(p)}`} className="rounded-full border border-[var(--border)] px-3 py-1 text-sm link-hover">
                {p}
              </Link>
            ))}
          </div>
        </div>
      )}

      {q && (
        <>
          <p className="mb-4 text-sm text-[var(--text-soft)]">
            “<span className="font-semibold text-[var(--text)]">{q}</span>” के लिए {results.length} परिणाम
          </p>
          {results.length === 0 ? (
            <p className="py-12 text-center text-[var(--text-soft)]">कोई परिणाम नहीं मिला।</p>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {results.map((a) => (
                <ArticleCard key={a.id} a={a} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
