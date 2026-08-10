import Link from 'next/link';
import { getHeroArticles, getLatestArticles, getHomepageSections, type ArticleCardData } from '@/server/queries';
import { ArticleCard, ArticleRow } from '@/components/ArticleCard';
import TrendingList from '@/components/TrendingList';
import { timeAgoHindi } from '@/lib/utils';

export const revalidate = 120;

function EmptyState() {
  return (
    <div className="container-news py-20 text-center">
      <h1 className="text-2xl font-black">अभी कोई प्रकाशित खबर नहीं है</h1>
      <p className="mt-3 text-[var(--text-soft)]">
        डेमो डेटा लोड करने के लिए <code className="rounded bg-[var(--surface)] px-1">npm run db:seed</code> चलाएँ, फिर
        ऑटोमेशन पाइपलाइन चलाएँ:
        <code className="ml-1 rounded bg-[var(--surface)] px-1">curl -X POST localhost:3000/api/cron/pipeline?secret=…</code>
      </p>
      <Link href="/admin" className="mt-6 inline-block rounded-md bg-brand px-5 py-2.5 font-semibold text-white">
        एडमिन पैनल खोलें
      </Link>
    </div>
  );
}

function HeroBlock({ hero }: { hero: ArticleCardData[] }) {
  const [lead, ...rest] = hero;
  const img = lead.images[0];
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <article className="card group relative col-span-2 overflow-hidden">
        <Link href={`/${lead.category?.slug ?? 'news'}/${lead.slug}`} className="block">
          <div className="relative aspect-[16/9] overflow-hidden">
            {img ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={img.url} alt={img.altText ?? lead.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
            ) : (
              <div className="h-full w-full bg-gradient-to-br from-brand to-ink" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
            <div className="absolute bottom-0 p-5 text-white">
              {lead.category && (
                <span className="cat-chip mb-2" style={{ backgroundColor: lead.category.color }}>
                  {lead.isBreaking ? 'ब्रेकिंग' : lead.category.name}
                </span>
              )}
              <h2 className="max-w-2xl text-2xl font-black leading-tight sm:text-3xl">{lead.title}</h2>
              {lead.summaryOneLine && <p className="mt-2 line-clamp-2 max-w-xl text-sm text-white/85">{lead.summaryOneLine}</p>}
              <span className="mt-2 block text-xs text-white/70">{lead.publishedAt ? timeAgoHindi(lead.publishedAt) : ''}</span>
            </div>
          </div>
        </Link>
      </article>

      <div className="card p-3">
        <h3 className="mb-2 border-b border-[var(--border)] pb-2 text-sm font-black uppercase tracking-wide text-brand">टॉप स्टोरीज़</h3>
        {rest.slice(0, 4).map((a) => (
          <ArticleRow key={a.id} a={a} />
        ))}
      </div>
    </div>
  );
}

function CategorySection({ title, slug, color, articles }: { title: string; slug: string; color: string; articles: ArticleCardData[] }) {
  return (
    <section className="mt-8">
      <div className="mb-3 flex items-center justify-between border-b-2 pb-1" style={{ borderColor: color }}>
        <h2 className="text-lg font-black">
          <span style={{ color }}>{title}</span>
        </h2>
        <Link href={`/${slug}`} className="text-sm font-semibold text-[var(--text-soft)] link-hover">
          और देखें →
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {articles.map((a) => (
          <ArticleCard key={a.id} a={a} />
        ))}
      </div>
    </section>
  );
}

export default async function HomePage() {
  const [hero, latest, sections] = await Promise.all([
    getHeroArticles(5),
    getLatestArticles(8),
    getHomepageSections(),
  ]);

  if (hero.length === 0) return <EmptyState />;

  return (
    <div className="container-news py-5">
      <HeroBlock hero={hero} />

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div>
          <section>
            <div className="mb-3 flex items-center justify-between border-b-2 border-brand pb-1">
              <h2 className="text-lg font-black text-brand">ताज़ा खबरें</h2>
              <Link href="/latest" className="text-sm font-semibold text-[var(--text-soft)] link-hover">और देखें →</Link>
            </div>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {latest.map((a) => (
                <ArticleCard key={a.id} a={a} />
              ))}
            </div>
          </section>

          {sections.map((s) => (
            <CategorySection key={s.category.slug} title={s.category.name} slug={s.category.slug} color={s.category.color} articles={s.articles} />
          ))}
        </div>

        <aside className="space-y-6">
          <TrendingList />
          <div className="card bg-brand/5 p-4 text-center">
            <p className="text-sm font-semibold">विज्ञापन स्थान</p>
            <p className="text-xs text-[var(--text-soft)]">Sidebar Ad · 300×250</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
