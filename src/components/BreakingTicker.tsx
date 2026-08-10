import Link from 'next/link';
import { getBreakingTicker } from '@/server/queries';
import { getSettings } from '@/lib/settings';

// Breaking-news ticker (spec §21). Admin-configurable custom text plus live
// breaking headlines.
export default async function BreakingTicker() {
  const [items, settings] = await Promise.all([getBreakingTicker(), getSettings()]);
  const headlines = items.map((i) => ({ text: i.title, href: `/${i.category?.slug ?? 'news'}/${i.slug}` }));
  if (settings.breakingTickerText) headlines.unshift({ text: settings.breakingTickerText, href: '#' });
  if (headlines.length === 0) return null;

  const loop = [...headlines, ...headlines];

  return (
    <div className="flex items-stretch overflow-hidden border-b border-[var(--border)] bg-[var(--surface)]">
      <span className="z-10 flex items-center gap-1 bg-brand px-3 text-xs font-black uppercase text-white">
        <span className="h-2 w-2 animate-pulse rounded-full bg-white" /> ब्रेकिंग
      </span>
      <div className="relative flex-1 overflow-hidden">
        <div className="animate-ticker flex w-max gap-8 whitespace-nowrap py-2 pl-4 text-sm font-medium">
          {loop.map((h, i) => (
            <Link key={i} href={h.href} className="link-hover">
              • {h.text}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
