'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logoutAction } from '@/app/admin/auth-actions';

const NAV = [
  { href: '/admin', label: 'डैशबोर्ड', icon: '📊' },
  { href: '/admin/queue', label: 'न्यूज़ क्यू', icon: '📥' },
  { href: '/admin/published', label: 'प्रकाशित', icon: '📰' },
  { href: '/admin/sources', label: 'स्रोत', icon: '🔗' },
  { href: '/admin/categories', label: 'श्रेणियाँ', icon: '🗂️' },
  { href: '/admin/automation', label: 'ऑटोमेशन', icon: '⚙️' },
  { href: '/admin/health', label: 'हेल्थ', icon: '💚' },
  { href: '/admin/analytics', label: 'एनालिटिक्स', icon: '📈' },
  { href: '/admin/logs', label: 'लॉग्स', icon: '📝' },
];

export default function Sidebar({ user }: { user: { name: string; role: string } }) {
  const pathname = usePathname();
  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--surface)]">
      <div className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-4">
        <span className="grid h-8 w-8 place-items-center rounded bg-brand font-black text-white">अ</span>
        <div>
          <div className="text-sm font-black leading-none">ApneNews</div>
          <div className="text-[10px] text-[var(--text-soft)]">एडमिन पैनल</div>
        </div>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
        {NAV.map((n) => {
          const active = n.href === '/admin' ? pathname === '/admin' : pathname.startsWith(n.href);
          return (
            <Link
              key={n.href}
              href={n.href}
              className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-semibold transition-colors ${
                active ? 'bg-brand text-white' : 'hover:bg-[var(--bg)]'
              }`}
            >
              <span>{n.icon}</span>
              {n.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-[var(--border)] p-3">
        <div className="mb-2 px-1 text-xs">
          <div className="font-semibold">{user.name}</div>
          <div className="text-[var(--text-soft)]">{user.role}</div>
        </div>
        <div className="flex gap-2">
          <Link href="/" className="flex-1 rounded-md border border-[var(--border)] px-2 py-1.5 text-center text-xs font-semibold">साइट</Link>
          <form action={logoutAction} className="flex-1">
            <button className="w-full rounded-md border border-[var(--border)] px-2 py-1.5 text-xs font-semibold text-red-600">लॉगआउट</button>
          </form>
        </div>
      </div>
    </aside>
  );
}
