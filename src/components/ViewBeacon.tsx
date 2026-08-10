'use client';

import { useEffect } from 'react';

// Fires a one-time article-view beacon after mount (spec §52). Uses
// sessionStorage to avoid double-counting on client navigation.
export default function ViewBeacon({ articleId }: { articleId: string }) {
  useEffect(() => {
    const key = `viewed:${articleId}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, '1');
    const body = JSON.stringify({ articleId });
    fetch('/api/analytics/view', { method: 'POST', headers: { 'content-type': 'application/json' }, body, keepalive: true }).catch(() => {});
  }, [articleId]);
  return null;
}
