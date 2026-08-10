import type { NextRequest } from 'next/server';

// Guards /api/cron/* endpoints (spec §54). Requires either the CRON_SECRET as a
// Bearer token / ?secret= query param, or an authenticated admin (for the
// "Run now" buttons in the dashboard, checked separately by the caller).

export function isValidCronRequest(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== 'production'; // dev convenience
  const auth = req.headers.get('authorization');
  if (auth === `Bearer ${secret}`) return true;
  const q = req.nextUrl.searchParams.get('secret');
  return q === secret;
}
