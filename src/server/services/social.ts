import prisma from '@/lib/db';
import { getSettings } from '@/lib/settings';
import { getSocialProviders } from '../providers';
import { logInfo } from '@/lib/logger';

// Social content generation + queue (spec §37/§38). Generates platform posts;
// only dispatches to platforms with configured credentials.

function siteUrl(): string {
  return (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');
}

export async function generateSocialContent(articleId: string): Promise<void> {
  const settings = await getSettings();
  const article = await prisma.newsArticle.findUnique({
    where: { id: articleId },
    select: { title: true, slug: true, socialSummary: true, pushSummary: true, category: { select: { slug: true } }, isBreaking: true },
  });
  if (!article) return;

  const url = `${siteUrl()}/${article.category?.slug ?? 'news'}/${article.slug}`;
  const prefix = article.isBreaking ? '🔴 ब्रेकिंग: ' : '';
  const base = article.socialSummary || article.title;

  const posts: { platform: string; content: string; enabled: boolean }[] = [
    { platform: 'FACEBOOK', content: `${prefix}${base}`, enabled: settings.socialEnabled },
    { platform: 'TWITTER', content: `${prefix}${article.title}`.slice(0, 260), enabled: settings.socialEnabled },
    { platform: 'TELEGRAM', content: `${prefix}${article.title}\n\n${article.socialSummary ?? ''}`, enabled: settings.telegramEnabled },
    { platform: 'WHATSAPP', content: `${prefix}${article.title}\n${article.pushSummary ?? ''}`, enabled: settings.socialEnabled },
  ];

  for (const p of posts) {
    await prisma.socialPost.create({
      data: {
        articleId,
        platform: p.platform,
        content: p.content,
        status: p.enabled ? 'QUEUED' : 'DISABLED',
      },
    });
  }

  // Dispatch to configured providers immediately (best-effort).
  const providers = getSocialProviders();
  for (const provider of providers) {
    const post = await prisma.socialPost.findFirst({
      where: { articleId, platform: provider.platform, status: 'QUEUED' },
    });
    if (!post) continue;
    const res = await provider.post(post.content, url);
    await prisma.socialPost.update({
      where: { id: post.id },
      data: res.ok
        ? { status: 'SENT', externalId: res.externalId, sentAt: new Date() }
        : { status: 'FAILED', error: res.error },
    });
    if (res.ok) await logInfo('SOCIAL', `Posted to ${provider.platform}: ${article.title.slice(0, 40)}`);
  }
}
