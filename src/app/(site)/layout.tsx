import Header from '@/components/Header';
import Footer from '@/components/Footer';
import BreakingTicker from '@/components/BreakingTicker';

// Public site chrome. Wraps all reader-facing pages (spec §58).
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <BreakingTicker />
      <main>{children}</main>
      <Footer />
    </>
  );
}
