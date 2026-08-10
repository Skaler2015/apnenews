import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import Sidebar from '@/components/admin/Sidebar';

// Guarded admin chrome. Every page in this group requires an authenticated
// user (middleware handles the cheap cookie gate; this does full validation).
export const dynamic = 'force-dynamic';

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect('/admin/login');

  return (
    <div className="flex min-h-screen bg-[var(--bg)]">
      <Sidebar user={{ name: user.name, role: user.role }} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] px-6 py-3">
          <span className="text-sm text-[var(--text-soft)]">प्रकाशन नियंत्रण कक्ष</span>
          <span className="text-xs text-[var(--text-soft)]">{new Date().toLocaleDateString('hi-IN')}</span>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
