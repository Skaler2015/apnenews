import Link from 'next/link';
import { getNavCategories } from '@/server/queries';
import { getSettings } from '@/lib/settings';

export default async function Footer() {
  const [categories, settings] = await Promise.all([getNavCategories(), getSettings()]);
  const year = new Date().getFullYear();

  return (
    <footer className="mt-10 border-t border-[var(--border)] bg-[var(--surface)]">
      <div className="container-news grid gap-8 py-10 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded bg-brand font-black text-white">अ</span>
            <span className="font-black">{settings.siteName.split('·')[0].trim()}</span>
          </div>
          <p className="mt-3 text-sm text-[var(--text-soft)]">{settings.siteTagline}</p>
          <p className="mt-3 text-xs text-[var(--text-soft)]">
            यह एक AI-सहायता प्राप्त स्वचालित समाचार मंच है। सामग्री स्रोतों की जानकारी के आधार पर संपादकीय रूप से तैयार की जाती है।
          </p>
        </div>

        <div>
          <h4 className="mb-3 text-sm font-bold uppercase tracking-wide">श्रेणियाँ</h4>
          <ul className="grid grid-cols-2 gap-1 text-sm text-[var(--text-soft)]">
            {categories.slice(0, 12).map((c) => (
              <li key={c.slug}>
                <Link href={`/${c.slug}`} className="link-hover">
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="mb-3 text-sm font-bold uppercase tracking-wide">फ़ीड</h4>
          <ul className="space-y-1 text-sm text-[var(--text-soft)]">
            <li><Link href="/feed" className="link-hover">RSS फ़ीड</Link></li>
            <li><Link href="/sitemap.xml" className="link-hover">साइटमैप</Link></li>
            <li><Link href="/news-sitemap.xml" className="link-hover">न्यूज़ साइटमैप</Link></li>
            <li><Link href="/trending" className="link-hover">ट्रेंडिंग</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="mb-3 text-sm font-bold uppercase tracking-wide">न्यूज़लेटर</h4>
          <p className="text-sm text-[var(--text-soft)]">रोज़ाना टॉप 10 खबरें अपने इनबॉक्स में पाएं।</p>
          <form className="mt-3 flex gap-2">
            <input placeholder="ईमेल" className="min-w-0 flex-1 rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm" />
            <button className="rounded-md bg-brand px-3 py-2 text-sm font-semibold text-white">जुड़ें</button>
          </form>
        </div>
      </div>
      <div className="border-t border-[var(--border)] py-4 text-center text-xs text-[var(--text-soft)]">
        © {year} {settings.siteName.split('·')[0].trim()} · सर्वाधिकार सुरक्षित · डेमो/स्वचालित मंच
      </div>
    </footer>
  );
}
