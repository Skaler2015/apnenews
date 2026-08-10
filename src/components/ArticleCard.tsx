import Link from 'next/link';
import type { ArticleCardData } from '@/server/queries';
import { timeAgoHindi } from '@/lib/utils';

function href(a: ArticleCardData) {
  return `/${a.category?.slug ?? 'news'}/${a.slug}`;
}

// eslint-disable-next-line @next/next/no-img-element
function Thumb({ a, className }: { a: ArticleCardData; className?: string }) {
  const img = a.images[0];
  if (!img) {
    return <div className={`bg-gradient-to-br from-brand/80 to-ink ${className}`} aria-hidden />;
  }
  return (
    // Data-URI SVGs and remote images; next/image not required for SVG.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={img.url} alt={img.altText ?? a.title} loading="lazy" className={`object-cover ${className}`} />
  );
}

export function ArticleCard({ a }: { a: ArticleCardData }) {
  return (
    <article className="card group flex flex-col">
      <Link href={href(a)} className="relative block aspect-[16/9] overflow-hidden">
        <Thumb a={a} className="h-full w-full transition-transform duration-300 group-hover:scale-105" />
        {a.category && (
          <span className="cat-chip absolute left-2 top-2" style={{ backgroundColor: a.category.color }}>
            {a.category.name}
          </span>
        )}
        {a.isBreaking && <span className="cat-chip absolute right-2 top-2 bg-brand animate-pulse">ब्रेकिंग</span>}
      </Link>
      <div className="flex flex-1 flex-col p-3">
        <h3 className="text-[15px] font-bold leading-snug">
          <Link href={href(a)} className="link-hover">
            {a.title}
          </Link>
        </h3>
        {a.summaryOneLine && <p className="mt-1.5 line-clamp-2 text-sm text-[var(--text-soft)]">{a.summaryOneLine}</p>}
        <div className="mt-auto pt-2 text-xs text-[var(--text-soft)]">{a.publishedAt ? timeAgoHindi(a.publishedAt) : ''}</div>
      </div>
    </article>
  );
}

export function ArticleRow({ a }: { a: ArticleCardData }) {
  return (
    <article className="flex gap-3 border-b border-[var(--border)] py-3 last:border-0">
      <Link href={href(a)} className="relative aspect-[4/3] w-28 shrink-0 overflow-hidden rounded">
        <Thumb a={a} className="h-full w-full" />
      </Link>
      <div className="min-w-0">
        {a.category && (
          <span className="text-[11px] font-bold uppercase" style={{ color: a.category.color }}>
            {a.category.name}
          </span>
        )}
        <h3 className="text-sm font-bold leading-snug">
          <Link href={href(a)} className="link-hover">
            {a.title}
          </Link>
        </h3>
        <div className="mt-1 text-xs text-[var(--text-soft)]">{a.publishedAt ? timeAgoHindi(a.publishedAt) : ''}</div>
      </div>
    </article>
  );
}
