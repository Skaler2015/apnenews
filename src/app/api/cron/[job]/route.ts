import { NextResponse, type NextRequest } from 'next/server';
import { isValidCronRequest } from '@/lib/cron-auth';
import { getCurrentUser, hasPermission } from '@/lib/auth';
import { fetchAllSources } from '@/server/services/fetcher';
import { processPending } from '@/server/services/processor';
import { runPublishTick, publishBreakingNow } from '@/server/services/publisher';
import { recalculateTrending } from '@/server/services/trending';
import { runFullPipeline, generateDailyReport } from '@/server/services/pipeline';
import { refreshSitemapLog } from '@/server/services/sitemap';
import prisma from '@/lib/db';
import { logInfo } from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Named cron jobs (spec §54/§89). Each is independently retryable and secured
// by CRON_SECRET (or an authenticated admin for dashboard "Run now" buttons).
const JOBS: Record<string, () => Promise<unknown>> = {
  'fetch-news': () => fetchAllSources(),
  'process-news': () => processPending(40),
  'publish-queue': () => runPublishTick(),
  'breaking-news': () => publishBreakingNow(),
  'update-trending': () => recalculateTrending(),
  'update-sitemap': () => refreshSitemapLog(),
  'daily-report': () => generateDailyReport(),
  'cleanup-old-data': () => cleanup(),
  pipeline: () => runFullPipeline(),
};

async function cleanup() {
  // Trim old logs/analytics to keep the DB lean (spec §77 scalability).
  const cutoff = new Date(Date.now() - 30 * 864e5);
  const [logs, events] = await Promise.all([
    prisma.errorLog.deleteMany({ where: { createdAt: { lt: cutoff }, level: 'INFO' } }),
    prisma.analyticsEvent.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 90 * 864e5) } } }),
  ]);
  return { deletedLogs: logs.count, deletedEvents: events.count };
}

export async function POST(req: NextRequest, { params }: { params: { job: string } }) {
  return handle(req, params.job);
}

export async function GET(req: NextRequest, { params }: { params: { job: string } }) {
  return handle(req, params.job);
}

async function handle(req: NextRequest, job: string) {
  // Auth: cron secret OR an admin with RUN_AUTOMATION permission.
  let authorized = isValidCronRequest(req);
  if (!authorized) {
    const user = await getCurrentUser();
    authorized = !!user && hasPermission(user, 'run_automation');
  }
  if (!authorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const runner = JOBS[job];
  if (!runner) return NextResponse.json({ error: `Unknown job: ${job}`, available: Object.keys(JOBS) }, { status: 404 });

  const started = Date.now();
  try {
    const result = await runner();
    await logInfo('SYSTEM', `Cron job "${job}" completed in ${Date.now() - started}ms`);
    return NextResponse.json({ ok: true, job, durationMs: Date.now() - started, result });
  } catch (err) {
    return NextResponse.json({ ok: false, job, error: (err as Error).message }, { status: 500 });
  }
}
