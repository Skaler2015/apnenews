'use client';

import { useTransition } from 'react';

// Wraps a (bound) server action in a button with pending state + optional
// confirm. Server actions are passed as props from server components.
export default function ActionButton({
  action,
  children,
  className = '',
  confirm,
  pendingLabel = '…',
}: {
  action: () => Promise<void>;
  children: React.ReactNode;
  className?: string;
  confirm?: string;
  pendingLabel?: string;
}) {
  const [pending, start] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() => {
        if (confirm && !window.confirm(confirm)) return;
        start(() => action());
      }}
      className={`disabled:opacity-50 ${className}`}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
