import type { Metadata } from 'next';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import BreakingTicker from '@/components/BreakingTicker';

const APP_URL = (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: 'अपने न्यूज़ · ApneNews — हिंदी समाचार',
    template: '%s · ApneNews',
  },
  description: 'हिंदी में विश्वसनीय, तेज़ और SEO-अनुकूल खबरें — भारत, राजस्थान, बिज़नेस, टेक, खेल और अधिक।',
  alternates: {
    canonical: '/',
    types: { 'application/rss+xml': `${APP_URL}/feed` },
  },
  openGraph: { type: 'website', locale: 'hi_IN', siteName: 'ApneNews' },
  robots: { index: true, follow: true },
};

// Prevent theme flash before hydration.
const themeScript = `(function(){try{var t=localStorage.getItem('theme')||'system';var d=t==='dark'||(t==='system'&&matchMedia('(prefers-color-scheme:dark)').matches);document.documentElement.classList.toggle('dark',d);}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="hi" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Hind:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen">
        <Header />
        <BreakingTicker />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
