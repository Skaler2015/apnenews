import { NextResponse, type NextRequest } from 'next/server';
import { isValidCronRequest } from '@/lib/cron-auth';
import { bootstrap } from '@/server/services/bootstrap';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// One-time production setup endpoint. Hit it once after deploy to create the
// admin user, categories, sources and a starter set of demo articles — no
// local terminal required. Secured by CRON_SECRET. Idempotent.
//
//   https://apnenews.in/api/setup?secret=YOUR_CRON_SECRET
//   optional: &rounds=2  (more demo content)  &publish=30
async function handle(req: NextRequest) {
  if (!isValidCronRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized — add ?secret=YOUR_CRON_SECRET' }, { status: 401 });
  }

  const rounds = Math.min(4, Number(req.nextUrl.searchParams.get('rounds') ?? 1) || 1);
  const publish = Math.min(60, Number(req.nextUrl.searchParams.get('publish') ?? 24) || 24);

  // Guard: warn (but allow) if already populated, so re-hits don't surprise.
  const existing = await prisma.newsArticle.count();

  const started = Date.now();
  const result = await bootstrap({ demoRounds: rounds, publishTarget: publish });

  return NextResponse.json({
    ok: true,
    message: 'Setup complete. Log in at /admin with ADMIN_EMAIL / ADMIN_PASSWORD.',
    alreadyHadArticles: existing,
    durationMs: Date.now() - started,
    result,
  });
}

export async function GET(req: NextRequest) {
  return handle(req);
}
export async function POST(req: NextRequest) {
  return handle(req);
}
