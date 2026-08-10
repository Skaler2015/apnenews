import Link from 'next/link';
import ThemeToggle from './ThemeToggle';
import { getNavCategories } from '@/server/queries';
import { getSettings } from '@/lib/settings';

// Site header + main navigation (spec §58). Server component; horizontally
// scrollable category nav for mobile.
export default async function Header() {
  const [categories, settings] = await Promise.all([getNavCategories(), getSettings()]);
  const primary = categories.slice(0, 12);

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur">
      <div className="container-news flex items-center justify-between gap-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded bg-brand font-black text-white">अ</span>
          <span className="text-lg font-black leading-none">
            {settings.siteName.split('·')[0].trim()}
            <span className="block text-[10px] font-medium text-[var(--text-soft)]">{settings.siteTagline}</span>
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <form action="/search" className="hidden sm:block">
            <input
              name="q"
              placeholder="खबर खोजें…"
              className="w-44 rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-1.5 text-sm outline-none focus:border-brand"
            />
          </form>
          <ThemeToggle />
          <Link href="/admin" className="rounded-md bg-brand px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-dark">
            एडमिन
          </Link>
        </div>
      </div>

      <nav className="border-t border-[var(--border)] bg-[var(--surface)]">
        <div className="container-news no-scrollbar flex items-center gap-1 overflow-x-auto py-1.5 text-sm font-semibold">
          <Link href="/" className="whitespace-nowrap px-2.5 py-1 link-hover">होम</Link>
          <Link href="/latest" className="whitespace-nowrap px-2.5 py-1 link-hover">ताज़ा</Link>
          <Link href="/trending" className="whitespace-nowrap px-2.5 py-1 link-hover">ट्रेंडिंग</Link>
          {primary.map((c) => (
            <Link key={c.slug} href={`/${c.slug}`} className="whitespace-nowrap px-2.5 py-1 link-hover">
              {c.name}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
}
