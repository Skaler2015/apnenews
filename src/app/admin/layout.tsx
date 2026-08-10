// Admin root: passthrough only. The login page lives directly under /admin and
// renders without chrome; the guarded dashboard chrome is in (panel)/layout.
export const dynamic = 'force-dynamic';

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
