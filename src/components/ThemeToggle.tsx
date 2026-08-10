'use client';

import { useEffect, useState } from 'react';

// Light/Dark/System theme toggle (spec §61). Persists to localStorage.
export default function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');

  useEffect(() => {
    const saved = (localStorage.getItem('theme') as typeof theme) || 'system';
    setTheme(saved);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const apply = (t: typeof theme) => {
      const dark = t === 'dark' || (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      root.classList.toggle('dark', dark);
    };
    apply(theme);
    localStorage.setItem('theme', theme);
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = () => theme === 'system' && apply('system');
    mq.addEventListener('change', listener);
    return () => mq.removeEventListener('change', listener);
  }, [theme]);

  const next = { light: 'dark', dark: 'system', system: 'light' } as const;
  const icon = { light: '☀️', dark: '🌙', system: '🖥️' };

  return (
    <button
      onClick={() => setTheme(next[theme])}
      aria-label="थीम बदलें"
      title={`थीम: ${theme}`}
      className="rounded-md border border-[var(--border)] px-2 py-1 text-sm hover:bg-[var(--bg)]"
    >
      {icon[theme]}
    </button>
  );
}
