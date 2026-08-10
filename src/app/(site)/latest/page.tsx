import type { Metadata } from 'next';
import Link from 'next/link';
import { getLatestArticles } from '@/server/queries';
import { ArticleCard } from '@/components/ArticleCard';

export const revalidate = 60;
export const metadata: Metadata = {
  title: 'ताज़ा खबरें',
  description: 'सभी श्रेणियों की सबसे नई खबरें, कालक्रम अनुसार।',
};

const PAGE_SIZE = 24;

export default async function LatestPage({ searchParams }: { searchParams: { page?: string } }) {
  const page = Math.max(1, Number(searchParams.page) || 1);
  const articles = await getLatestArticles(PAGE_SIZE + 1, (page - 1) * PAGE_SIZE);
  const hasNext = articles.length > PAGE_SIZE;
  const items = articles.slice(0, PAGE_SIZE);

  return (
    <div className="container-news py-5">
      <h1 className="mb-4 border-b-2 border-brand pb-2 text-2xl font-black text-brand">ताज़ा खबरें</h1>
      {items.length === 0 ? (
        <p className="py-16 text-center text-[var(--text-soft)]">अभी कोई खबर नहीं।</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((a) => (
            <ArticleCard key={a.id} a={a} />
          ))}
        </div>
      )}
      <div className="mt-6 flex items-center justify-between">
        {page > 1 ? <Link href={`/latest?page=${page - 1}`} className="rounded-md border border-[var(--border)] px-4 py-2 text-sm font-semibold">← पिछला</Link> : <span />}
        <span className="text-sm text-[var(--text-soft)]">पृष्ठ {page}</span>
        {hasNext ? <Link href={`/latest?page=${page + 1}`} className="rounded-md border border-[var(--border)] px-4 py-2 text-sm font-semibold">अगला →</Link> : <span />}
      </div>
    </div>
  );
}
