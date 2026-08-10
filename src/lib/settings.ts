import prisma from './db';

// Central settings store. Values live in the Setting table (JSON-encoded) so
// everything is configurable from Admin > Automation/Settings (spec §42/§74),
// with env-var fallbacks for first boot.

export type Settings = {
  automationEnabled: boolean;
  fetchIntervalMinutes: number;
  publishIntervalMinutes: number;
  dailyMin: number;
  dailyMax: number;
  autoAiProcessing: boolean;
  autoFactValidation: boolean;
  autoImage: boolean;
  autoSeo: boolean;
  autoPublishing: boolean;
  breakingNewsEnabled: boolean;
  duplicateProtection: boolean;
  smartPublishing: boolean;
  // Confidence thresholds (spec §43 hybrid mode)
  publishMode: 'AUTO' | 'REVIEW' | 'HYBRID';
  autoPublishConfidence: number; // >= -> auto publish
  reviewConfidence: number; // >= -> review, below -> reject/hold
  duplicateBlockScore: number; // >= -> never auto-publish
  // Social/push toggles
  telegramEnabled: boolean;
  socialEnabled: boolean;
  pushEnabled: boolean;
  // Site
  siteName: string;
  siteTagline: string;
  newsSitemapWindowHours: number; // spec §35
  breakingTickerText: string;
};

const DEFAULTS: Settings = {
  automationEnabled: true,
  fetchIntervalMinutes: numEnv('FETCH_INTERVAL_MINUTES', 15),
  publishIntervalMinutes: numEnv('PUBLISH_INTERVAL_MINUTES', 15),
  dailyMin: numEnv('DAILY_MIN_ARTICLES', 50),
  dailyMax: numEnv('DAILY_MAX_ARTICLES', 60),
  autoAiProcessing: true,
  autoFactValidation: true,
  autoImage: true,
  autoSeo: true,
  autoPublishing: true,
  breakingNewsEnabled: true,
  duplicateProtection: true,
  smartPublishing: true,
  publishMode: 'HYBRID',
  autoPublishConfidence: numEnv('AUTO_PUBLISH_CONFIDENCE', 85),
  reviewConfidence: numEnv('REVIEW_CONFIDENCE', 65),
  duplicateBlockScore: 71,
  telegramEnabled: process.env.TELEGRAM_ENABLED === 'true',
  socialEnabled: false,
  pushEnabled: false,
  siteName: 'अपने न्यूज़ · ApneNews',
  siteTagline: 'हिंदी में विश्वसनीय और तेज़ खबरें',
  newsSitemapWindowHours: 48,
  breakingTickerText: '',
};

function numEnv(key: string, fallback: number): number {
  const v = process.env[key];
  const n = v ? Number(v) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

let cache: { data: Settings; at: number } | null = null;
const TTL_MS = 30_000;

export async function getSettings(): Promise<Settings> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.data;
  const rows = await prisma.setting.findMany();
  const merged: Settings = { ...DEFAULTS };
  for (const row of rows) {
    try {
      (merged as Record<string, unknown>)[row.key] = JSON.parse(row.value);
    } catch {
      /* ignore malformed */
    }
  }
  cache = { data: merged, at: Date.now() };
  return merged;
}

export async function updateSettings(patch: Partial<Settings>): Promise<Settings> {
  const entries = Object.entries(patch);
  await prisma.$transaction(
    entries.map(([key, value]) =>
      prisma.setting.upsert({
        where: { key },
        create: { key, value: JSON.stringify(value) },
        update: { value: JSON.stringify(value) },
      }),
    ),
  );
  cache = null;
  return getSettings();
}

export function invalidateSettingsCache() {
  cache = null;
}
