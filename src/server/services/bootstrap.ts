import prisma from '@/lib/db';
import bcrypt from 'bcryptjs';
import { DEFAULT_CATEGORIES, DEFAULT_DISTRICTS, ROLES } from '@/lib/constants';
import { DEMO_SOURCES, DEMO_AUTHORS, DEMO_TEMPLATES } from '../../../prisma/demo-data';
import { slugify, shortHash, sha256 } from '@/lib/utils';
import { fingerprint } from '@/lib/similarity';
import { computePriority } from './priority';
import { processItem } from './processor';
import { publishArticle } from './publisher';

// Reusable bootstrap used by the `/api/setup` endpoint (and the CLI seed) to
// initialize a fresh production database from the browser — no local terminal
// needed. Idempotent: safe to re-run; it upserts and skips existing rows.

function seededInt(seed: string, max: number): number {
  return parseInt(sha256(seed).slice(0, 8), 16) % max;
}

export interface BootstrapResult {
  admin: string;
  categories: number;
  districts: number;
  authors: number;
  sources: number;
  itemsCreated: number;
  articlesGenerated: number;
  articlesPublished: number;
}

/**
 * @param demoRounds How many rounds of demo items to create (0 = no demo
 *   content, just admin + taxonomy + sources). Kept small so it fits inside
 *   serverless time limits. `full` seed uses 4 rounds (~130 items).
 */
export async function bootstrap(opts: { demoRounds?: number; publishTarget?: number } = {}): Promise<BootstrapResult> {
  const demoRounds = opts.demoRounds ?? 1;
  const publishTarget = opts.publishTarget ?? 24;

  // --- Admin ---
  const email = (process.env.ADMIN_EMAIL || 'admin@apnenews.in').toLowerCase();
  const password = process.env.ADMIN_PASSWORD || 'ChangeMe123!';
  await prisma.user.upsert({
    where: { email },
    create: { email, name: 'Super Admin', passwordHash: await bcrypt.hash(password, 10), role: ROLES.SUPER_ADMIN },
    update: {},
  });

  // --- Categories ---
  for (let i = 0; i < DEFAULT_CATEGORIES.length; i++) {
    const c = DEFAULT_CATEGORIES[i];
    await prisma.category.upsert({
      where: { slug: c.slug },
      create: {
        name: c.name, nameEn: c.nameEn, slug: c.slug, order: i,
        isLocal: c.isLocal ?? false, color: c.color ?? '#c8102e',
        seoTitle: `${c.nameEn} News in Hindi | ${c.name} समाचार`,
        metaDescription: `${c.name} की ताज़ा खबरें, अपडेट और विश्लेषण हिंदी में।`,
      },
      update: { order: i, color: c.color ?? '#c8102e' },
    });
  }

  // --- Districts ---
  const rajasthan = await prisma.category.findUnique({ where: { slug: 'rajasthan' } });
  for (const d of DEFAULT_DISTRICTS) {
    await prisma.district.upsert({
      where: { slug: d.slug },
      create: { name: d.name, nameEn: d.nameEn, slug: d.slug, categoryId: rajasthan?.id },
      update: {},
    });
  }

  // --- Authors ---
  for (const a of DEMO_AUTHORS) {
    await prisma.author.upsert({
      where: { slug: a.slug },
      create: { name: a.name, slug: a.slug, bio: a.bio, isAiAssisted: a.aiAssisted },
      update: {},
    });
  }

  // --- Demo sources ---
  for (const s of DEMO_SOURCES) {
    const cat = await prisma.category.findUnique({ where: { slug: s.category } });
    const existing = await prisma.newsSource.findFirst({ where: { name: s.name } });
    if (!existing) {
      await prisma.newsSource.create({
        data: {
          name: s.name, url: `https://demo.apnenews.local/${s.slug}`,
          feedUrl: `https://demo.apnenews.local/${s.slug}/feed`, type: s.type,
          trustScore: s.trust, priority: s.priority, isOfficial: s.official, isDemo: true, categoryId: cat?.id,
        },
      });
    }
  }

  const summary: BootstrapResult = {
    admin: email,
    categories: DEFAULT_CATEGORIES.length,
    districts: DEFAULT_DISTRICTS.length,
    authors: DEMO_AUTHORS.length,
    sources: DEMO_SOURCES.length,
    itemsCreated: 0,
    articlesGenerated: 0,
    articlesPublished: 0,
  };

  if (demoRounds <= 0) return summary;

  // --- Demo items through the real pipeline ---
  const categories = await prisma.category.findMany();
  const catBySlug = new Map(categories.map((c) => [c.slug, c]));
  const sources = await prisma.newsSource.findMany();
  const srcByName = new Map(DEMO_SOURCES.map((s) => [s.slug, sources.find((x) => x.name === s.name)!]));

  const createdItemIds: string[] = [];
  for (let round = 0; round < demoRounds; round++) {
    for (const tpl of DEMO_TEMPLATES) {
      for (let ti = 0; ti < tpl.titles.length; ti++) {
        const baseTitle = tpl.titles[ti];
        const title = round === 0 ? baseTitle : `${baseTitle} (अपडेट ${round})`;
        const source = srcByName.get(tpl.source);
        const cat = catBySlug.get(tpl.category);
        if (!source || !cat) continue;
        const uid = `${tpl.source}-${tpl.category}-${ti}-${round}`;
        const url = `https://demo.apnenews.local/${tpl.source}/${slugify(baseTitle)}-${shortHash(uid, 5)}`;
        const urlHash = sha256(url);
        if (await prisma.newsItem.findUnique({ where: { urlHash }, select: { id: true } })) continue;

        const hoursAgo = seededInt(uid, 70) + round * 2;
        const publishedAt = new Date(Date.now() - hoursAgo * 3.6e6);
        const isBreaking = !!tpl.breaking && round === 0 && ti === 0;
        const priority = computePriority({
          title, excerpt: tpl.excerpt, sourceTrust: source.trustScore, isOfficial: source.isOfficial,
          publishedAt, categorySlug: cat.slug, duplicateScore: 0,
        });
        const item = await prisma.newsItem.create({
          data: {
            sourceId: source.id, sourceName: source.name, sourceType: source.type, sourceUrl: url, urlHash,
            fingerprint: fingerprint(`${title} ${tpl.excerpt}`), title, excerpt: tpl.excerpt.slice(0, 300),
            rawContent: tpl.excerpt, publishedAt, categoryId: cat.id,
            priority: isBreaking ? Math.max(priority, 95) : priority, isDemo: true,
          },
        });
        createdItemIds.push(item.id);
      }
    }
  }
  summary.itemsCreated = createdItemIds.length;

  for (const id of createdItemIds) {
    const res = await processItem(id);
    if (res?.articleId) summary.articlesGenerated++;
  }

  // --- Publish a balanced spread ---
  const articles = await prisma.newsArticle.findMany({
    where: { isDemo: true, status: { in: ['APPROVED', 'NEEDS_REVIEW', 'PROCESSED'] } },
    orderBy: [{ isBreaking: 'desc' }, { priority: 'desc' }],
    select: { id: true, categoryId: true, isBreaking: true },
  });
  const perCat: Record<string, number> = {};
  const MAX_PER_CAT = 6;
  for (const a of articles) {
    if (summary.articlesPublished >= publishTarget) break;
    const key = a.categoryId ?? 'none';
    if (!a.isBreaking && (perCat[key] ?? 0) >= MAX_PER_CAT) continue;
    if (await publishArticle(a.id)) {
      perCat[key] = (perCat[key] ?? 0) + 1;
      summary.articlesPublished++;
    }
  }

  return summary;
}
