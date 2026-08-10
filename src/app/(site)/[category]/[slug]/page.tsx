import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getArticleBySlug } from '@/server/queries';
import { getRelated } from '@/server/services/internal-linking';
import { ArticleRow } from '@/components/ArticleCard';
import TrendingList from '@/components/TrendingList';
import AdSlot from '@/components/AdSlot';
import ViewBeacon from '@/components/ViewBeacon';
import { formatDateHindi, timeAgoHindi } from '@/lib/utils';
import { siteUrl, articleUrl } from '@/server/services/sitemap';

export const revalidate = 300;

type Props = { params: { category: string; slug: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const article = await getArticleBySlug(params.slug);
  if (!article) return { title: 'खबर नहीं मिली' };
  const seo = article.seo;
  const canonical = articleUrl(article.category?.slug, article.slug);
  const image = article.images.find((i) => i.role === 'FEATURED')?.url;
  const ogImages = image && !image.startsWith('data:') ? [image] : undefined;
  return {
    title: seo?.seoTitle || article.title,
    description: seo?.metaDescription || article.summaryShort || undefined,
    alternates: { canonical },
    openGraph: {
      title: seo?.ogTitle || article.title,
      description: seo?.ogDescription || article.summaryShort || undefined,
      type: 'article',
      publishedTime: article.publishedAt?.toISOString(),
      modifiedTime: article.updatedAt.toISOString(),
      url: canonical,
      images: ogImages,
    },
    twitter: {
      card: 'summary_large_image',
      title: seo?.twitterTitle || article.title,
      description: seo?.twitterDescription || undefined,
    },
  };
}

function JsonLd({ data }: { data: object }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}

export default async function ArticlePage({ params }: Props) {
  const article = await getArticleBySlug(params.slug);
  if (!article) notFound();

  const featured = article.images.find((i) => i.role === 'FEATURED');
  const related = await getRelated(article.id, article.categoryId, 6);
  const tags = article.tags.map((t) => t.tag);
  const faq = safeJson<{ q: string; a: string }[]>(article.faq, []);
  const canonical = articleUrl(article.category?.slug, article.slug);
  const base = siteUrl();

  // Schema.org: NewsArticle + Breadcrumb + FAQ (spec §13)
  const newsSchema = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: article.title,
    description: article.summaryShort,
    datePublished: article.publishedAt?.toISOString(),
    dateModified: article.updatedAt.toISOString(),
    author: { '@type': 'Organization', name: article.author?.name || 'ApneNews Editorial Desk' },
    publisher: { '@type': 'Organization', name: 'ApneNews' },
    mainEntityOfPage: canonical,
    articleSection: article.category?.name,
    ...(featured && !featured.url.startsWith('data:') ? { image: [featured.url] } : {}),
  };
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'होम', item: base },
      { '@type': 'ListItem', position: 2, name: article.category?.name, item: `${base}/${article.category?.slug}` },
      { '@type': 'ListItem', position: 3, name: article.title, item: canonical },
    ],
  };
  const faqSchema = faq.length
    ? {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
      }
    : null;

  return (
    <div className="container-news py-5">
      <JsonLd data={newsSchema} />
      <JsonLd data={breadcrumbSchema} />
      {faqSchema && <JsonLd data={faqSchema} />}
      <ViewBeacon articleId={article.id} />

      {/* Breadcrumb */}
      <nav className="mb-3 text-xs text-[var(--text-soft)]" aria-label="breadcrumb">
        <Link href="/" className="link-hover">होम</Link>
        {' › '}
        <Link href={`/${article.category?.slug}`} className="link-hover">{article.category?.name}</Link>
        {' › '}
        <span className="text-[var(--text)]">{article.title.slice(0, 40)}…</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <article className="min-w-0">
          {article.category && (
            <span className="cat-chip" style={{ backgroundColor: article.category.color }}>
              {article.isBreaking ? 'ब्रेकिंग न्यूज़' : article.category.name}
            </span>
          )}
          <h1 className="mt-3 text-3xl font-black leading-tight sm:text-4xl">{article.title}</h1>
          {article.subtitle && <p className="mt-3 text-lg text-[var(--text-soft)]">{article.subtitle}</p>}

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 border-y border-[var(--border)] py-3 text-sm text-[var(--text-soft)]">
            <span className="font-semibold text-[var(--text)]">{article.author?.name || 'ApneNews संपादकीय डेस्क'}</span>
            {article.publishedAt && <span>प्रकाशित: {formatDateHindi(article.publishedAt)}</span>}
            <span>अपडेट: {timeAgoHindi(article.updatedAt)}</span>
            <span className="ml-auto flex items-center gap-3">
              <ShareLinks url={canonical} title={article.title} />
            </span>
          </div>

          {featured && (
            <figure className="mt-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={featured.url} alt={featured.altText ?? article.title} className="w-full rounded-lg" width={featured.width ?? 1200} height={featured.height ?? 675} />
              {featured.caption && (
                <figcaption className="mt-1.5 text-xs text-[var(--text-soft)]">
                  {featured.caption} {featured.credit ? `· ${featured.credit}` : ''}
                </figcaption>
              )}
            </figure>
          )}

          <AdSlot id="below-hero" label="In-Article 728×90" className="my-5" />

          {/* Live updates timeline (spec §22) */}
          {article.versions.length > 0 && (
            <div className="my-4 rounded-lg border-l-4 border-brand bg-brand/5 p-4">
              <h3 className="mb-2 text-sm font-black uppercase">लाइव अपडेट</h3>
              <ol className="space-y-2">
                {article.versions.map((v) => (
                  <li key={v.id} className="text-sm">
                    <span className="font-bold text-brand">{formatDateHindi(v.createdAt)}</span> — {v.note}
                  </li>
                ))}
              </ol>
            </div>
          )}

          <div className="prose-news mt-5" dangerouslySetInnerHTML={{ __html: article.content }} />

          {/* Source attribution (spec §11) */}
          {article.sourceUrl && (
            <div className="mt-6 rounded-lg bg-[var(--surface)] p-4 text-sm">
              <span className="font-bold">स्रोत: </span>
              <a href={article.sourceUrl} target="_blank" rel="nofollow noopener" className="text-brand underline">
                {article.sourceName}
              </a>
              {article.sourcePublishedAt && <span className="text-[var(--text-soft)]"> · {formatDateHindi(article.sourcePublishedAt)}</span>}
              <p className="mt-1 text-xs text-[var(--text-soft)]">
                यह रिपोर्ट AI-सहायता से स्रोत जानकारी के आधार पर तैयार की गई है। यह मूल स्रोत की मौलिक रिपोर्टिंग का दावा नहीं करती।
              </p>
            </div>
          )}

          {/* Tags */}
          {tags.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {tags.map((t) => (
                <span key={t.id} className="rounded-full border border-[var(--border)] px-3 py-1 text-xs">
                  #{t.name}
                </span>
              ))}
            </div>
          )}

          {/* FAQ */}
          {faq.length > 0 && (
            <section className="mt-6">
              <h2 className="mb-2 text-xl font-black">अक्सर पूछे जाने वाले सवाल</h2>
              {faq.map((f, i) => (
                <details key={i} className="border-b border-[var(--border)] py-3">
                  <summary className="cursor-pointer font-semibold">{f.q}</summary>
                  <p className="mt-2 text-[var(--text-soft)]">{f.a}</p>
                </details>
              ))}
            </section>
          )}

          <AdSlot id="after-article" label="After Article 728×90" className="my-6" />

          {/* Related */}
          {related.length > 0 && (
            <section className="mt-6">
              <h2 className="mb-3 border-b-2 border-brand pb-1 text-lg font-black">संबंधित खबरें</h2>
              <div className="grid gap-x-6 sm:grid-cols-2">
                {related.map((r: any) => (
                  <ArticleRow
                    key={r.id}
                    a={{ ...r, subtitle: null, summaryOneLine: null, isBreaking: false, views: 0 }}
                  />
                ))}
              </div>
            </section>
          )}
        </article>

        <aside className="space-y-6">
          <div className="card bg-brand/5 p-4 text-center">
            <p className="text-sm font-semibold">विज्ञापन स्थान</p>
            <p className="text-xs text-[var(--text-soft)]">Sidebar 300×600</p>
          </div>
          <TrendingList />
        </aside>
      </div>
    </div>
  );
}

function ShareLinks({ url, title }: { url: string; title: string }) {
  const enc = encodeURIComponent;
  return (
    <>
      <a href={`https://api.whatsapp.com/send?text=${enc(title + ' ' + url)}`} target="_blank" rel="noopener" className="link-hover" aria-label="WhatsApp">WhatsApp</a>
      <a href={`https://twitter.com/intent/tweet?url=${enc(url)}&text=${enc(title)}`} target="_blank" rel="noopener" className="link-hover" aria-label="X">X</a>
      <a href={`https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`} target="_blank" rel="noopener" className="link-hover" aria-label="Facebook">Facebook</a>
    </>
  );
}

function safeJson<T>(s: string | null, fallback: T): T {
  if (!s) return fallback;
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}
