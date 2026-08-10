import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCategoryBySlug, getCategoryArticles } from '@/server/queries';
import { ArticleCard } from '@/components/ArticleCard';
import TrendingList from '@/components/TrendingList';
import AdSlot from '@/components/AdSlot';

export const revalidate = 120;

type Props = { params: { category: string }; searchParams: { page?: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const cat = await getCategoryBySlug(params.category);
  if (!cat) return { title: 'श्रेणी नहीं मिली' };
  return {
    title: cat.seoTitle || `${cat.name} समाचार`,
    description: cat.metaDescription || `${cat.name} की ताज़ा खबरें, अपडेट और विश्लेषण।`,
    alternates: { canonical: `/${cat.slug}`, types: { 'application/rss+xml': `/feed/${cat.slug}` } },
  };
}

const PAGE_SIZE = 16;

export default async function CategoryPage({ params, searchParams }: Props) {
  const cat = await getCategoryBySlug(params.category);
  if (!cat || !cat.isActive) notFound();

  const page = Math.max(1, Number(searchParams.page) || 1);
  const articles = await getCategoryArticles(cat.slug, PAGE_SIZE + 1, (page - 1) * PAGE_SIZE);
  const hasNext = articles.length > PAGE_SIZE;
  const items = articles.slice(0, PAGE_SIZE);

  return (
    <div className="container-news py-5">
      <nav className="mb-3 text-xs text-[var(--text-soft)]">
        <Link href="/" className="link-hover">होम</Link> › <span className="text-[var(--text)]">{cat.name}</span>
      </nav>

      <header className="mb-5 border-b-2 pb-2" style={{ borderColor: cat.color }}>
        <h1 className="text-2xl font-black" style={{ color: cat.color }}>{cat.name}</h1>
        {cat.description && <p className="mt-1 text-sm text-[var(--text-soft)]">{cat.description}</p>}
      </header>

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div>
          {items.length === 0 ? (
            <p className="py-16 text-center text-[var(--text-soft)]">इस श्रेणी में अभी कोई खबर नहीं है।</p>
          ) : (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              {items.map((a) => (
                <ArticleCard key={a.id} a={a} />
              ))}
            </div>
          )}

          {/* Pagination (spec §29) */}
          <div className="mt-6 flex items-center justify-between">
            {page > 1 ? (
              <Link href={`/${cat.slug}?page=${page - 1}`} className="rounded-md border border-[var(--border)] px-4 py-2 text-sm font-semibold">← पिछला</Link>
            ) : <span />}
            <span className="text-sm text-[var(--text-soft)]">पृष्ठ {page}</span>
            {hasNext ? (
              <Link href={`/${cat.slug}?page=${page + 1}`} className="rounded-md border border-[var(--border)] px-4 py-2 text-sm font-semibold">अगला →</Link>
            ) : <span />}
          </div>
        </div>

        <aside className="space-y-6">
          <TrendingList />
          <AdSlot id="cat-sidebar" label="Sidebar 300×250" />
        </aside>
      </div>
    </div>
  );
}
