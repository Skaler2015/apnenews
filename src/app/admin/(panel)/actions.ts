'use server';

import { revalidatePath } from 'next/cache';
import prisma from '@/lib/db';
import { requirePermission } from '@/lib/auth';
import { PERMISSIONS } from '@/lib/constants';
import { updateSettings, type Settings } from '@/lib/settings';
import { publishArticle } from '@/server/services/publisher';
import { runFullPipeline } from '@/server/services/pipeline';
import { fetchAllSources } from '@/server/services/fetcher';
import { processPending } from '@/server/services/processor';
import { ARTICLE_STATUS } from '@/lib/constants';
import { slugify, shortHash } from '@/lib/utils';

// --- Queue / article review actions (spec §24/§43) ---

export async function approveArticle(articleId: string) {
  await requirePermission(PERMISSIONS.REVIEW_ARTICLES);
  await prisma.newsArticle.update({ where: { id: articleId }, data: { status: ARTICLE_STATUS.APPROVED } });
  await prisma.newsQueue.upsert({
    where: { articleId },
    create: { articleId, publishStatus: 'QUEUED' },
    update: { publishStatus: 'QUEUED' },
  });
  revalidatePath('/admin/queue');
}

export async function rejectArticle(articleId: string) {
  await requirePermission(PERMISSIONS.REVIEW_ARTICLES);
  await prisma.newsArticle.update({ where: { id: articleId }, data: { status: ARTICLE_STATUS.REJECTED } });
  await prisma.newsQueue.updateMany({ where: { articleId }, data: { publishStatus: 'REJECTED' } });
  revalidatePath('/admin/queue');
}

export async function publishNow(articleId: string) {
  await requirePermission(PERMISSIONS.PUBLISH_ARTICLES);
  await publishArticle(articleId);
  revalidatePath('/admin/queue');
  revalidatePath('/admin/published');
}

export async function holdForReview(articleId: string) {
  await requirePermission(PERMISSIONS.REVIEW_ARTICLES);
  await prisma.newsArticle.update({ where: { id: articleId }, data: { status: ARTICLE_STATUS.NEEDS_REVIEW } });
  revalidatePath('/admin/queue');
}

// --- Automation triggers (spec §53 "Run now" buttons) ---

export async function runJob(job: 'pipeline' | 'fetch' | 'process' | 'publish') {
  await requirePermission(PERMISSIONS.RUN_AUTOMATION);
  if (job === 'fetch') await fetchAllSources();
  else if (job === 'process') await processPending(40);
  else await runFullPipeline({ fetch: job === 'pipeline', process: true, publish: true });
  revalidatePath('/admin');
  revalidatePath('/admin/queue');
}

// --- Settings (spec §42) ---

export async function saveAutomationSettings(formData: FormData) {
  await requirePermission(PERMISSIONS.MANAGE_SETTINGS);
  const bool = (k: string) => formData.get(k) === 'on';
  const num = (k: string, d: number) => Number(formData.get(k) ?? d) || d;
  const patch: Partial<Settings> = {
    automationEnabled: bool('automationEnabled'),
    autoAiProcessing: bool('autoAiProcessing'),
    autoFactValidation: bool('autoFactValidation'),
    autoImage: bool('autoImage'),
    autoSeo: bool('autoSeo'),
    autoPublishing: bool('autoPublishing'),
    breakingNewsEnabled: bool('breakingNewsEnabled'),
    duplicateProtection: bool('duplicateProtection'),
    smartPublishing: bool('smartPublishing'),
    telegramEnabled: bool('telegramEnabled'),
    socialEnabled: bool('socialEnabled'),
    fetchIntervalMinutes: num('fetchIntervalMinutes', 15),
    publishIntervalMinutes: num('publishIntervalMinutes', 15),
    dailyMin: num('dailyMin', 50),
    dailyMax: num('dailyMax', 60),
    autoPublishConfidence: num('autoPublishConfidence', 85),
    reviewConfidence: num('reviewConfidence', 65),
    publishMode: (formData.get('publishMode') as Settings['publishMode']) || 'HYBRID',
    breakingTickerText: String(formData.get('breakingTickerText') || ''),
  };
  await updateSettings(patch);
  revalidatePath('/admin/automation');
  revalidatePath('/admin');
}

// --- Sources (spec §41) ---

export async function toggleSource(id: string, active: boolean) {
  await requirePermission(PERMISSIONS.MANAGE_SOURCES);
  await prisma.newsSource.update({ where: { id }, data: { isActive: active } });
  revalidatePath('/admin/sources');
}

export async function addSource(formData: FormData) {
  await requirePermission(PERMISSIONS.MANAGE_SOURCES);
  const name = String(formData.get('name') || '').trim();
  const feedUrl = String(formData.get('feedUrl') || '').trim();
  if (!name || !feedUrl) return;
  const categorySlug = String(formData.get('category') || '');
  const cat = categorySlug ? await prisma.category.findUnique({ where: { slug: categorySlug } }) : null;
  await prisma.newsSource.create({
    data: {
      name,
      url: String(formData.get('url') || feedUrl),
      feedUrl,
      type: String(formData.get('type') || 'RSS'),
      priority: Number(formData.get('priority') || 60),
      trustScore: Number(formData.get('trustScore') || 70),
      isOfficial: formData.get('isOfficial') === 'on',
      categoryId: cat?.id,
    },
  });
  revalidatePath('/admin/sources');
}

export async function deleteSource(id: string) {
  await requirePermission(PERMISSIONS.MANAGE_SOURCES);
  await prisma.newsSource.delete({ where: { id } });
  revalidatePath('/admin/sources');
}

// --- Categories (spec §2) ---

export async function toggleCategory(id: string, active: boolean) {
  await requirePermission(PERMISSIONS.MANAGE_CATEGORIES);
  await prisma.category.update({ where: { id }, data: { isActive: active } });
  revalidatePath('/admin/categories');
}

export async function addCategory(formData: FormData) {
  await requirePermission(PERMISSIONS.MANAGE_CATEGORIES);
  const name = String(formData.get('name') || '').trim();
  const nameEn = String(formData.get('nameEn') || '').trim();
  if (!name || !nameEn) return;
  const slug = String(formData.get('slug') || slugify(nameEn) || shortHash(name, 5));
  const count = await prisma.category.count();
  await prisma.category.create({
    data: {
      name,
      nameEn,
      slug,
      order: count,
      color: String(formData.get('color') || '#c8102e'),
      seoTitle: String(formData.get('seoTitle') || `${nameEn} News`),
      metaDescription: String(formData.get('metaDescription') || ''),
    },
  });
  revalidatePath('/admin/categories');
}
