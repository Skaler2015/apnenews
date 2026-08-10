import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { DEFAULT_CATEGORIES, DEFAULT_DISTRICTS, ROLES } from '../src/lib/constants';
import { DEMO_SOURCES, DEMO_AUTHORS, DEMO_TEMPLATES } from './demo-data';
import { slugify, shortHash, sha256 } from '../src/lib/utils';
import { fingerprint } from '../src/lib/similarity';
import { computePriority, detectBreaking } from '../src/server/services/priority';
import { processItem } from '../src/server/services/processor';
import { publishArticle } from '../src/server/services/publisher';

const prisma = new PrismaClient();

// Deterministic pseudo-random from a string seed (no Math.random for
// reproducible seeds).
function seededInt(seed: string, max: number): number {
  return parseInt(sha256(seed).slice(0, 8), 16) % max;
}

async function main() {
  console.log('🌱 Seeding ApneNews demo data…');

  // --- Super admin ---
  const email = process.env.ADMIN_EMAIL || 'admin@apnenews.local';
  const password = process.env.ADMIN_PASSWORD || 'ChangeMe123!';
  await prisma.user.upsert({
    where: { email },
    create: { email, name: 'Super Admin', passwordHash: await bcrypt.hash(password, 10), role: ROLES.SUPER_ADMIN },
    update: {},
  });
  console.log(`✔ Super admin: ${email}`);

  // --- Categories ---
  for (let i = 0; i < DEFAULT_CATEGORIES.length; i++) {
    const c = DEFAULT_CATEGORIES[i];
    await prisma.category.upsert({
      where: { slug: c.slug },
      create: {
        name: c.name,
        nameEn: c.nameEn,
        slug: c.slug,
        order: i,
        isLocal: c.isLocal ?? false,
        color: c.color ?? '#c8102e',
        seoTitle: `${c.nameEn} News in Hindi | ${c.name} समाचार`,
        metaDescription: `${c.name} की ताज़ा खबरें, अपडेट और विश्लेषण हिंदी में।`,
      },
      update: { order: i, color: c.color ?? '#c8102e' },
    });
  }
  console.log(`✔ ${DEFAULT_CATEGORIES.length} categories`);

  // --- Districts (Rajasthan hub) ---
  const rajasthan = await prisma.category.findUnique({ where: { slug: 'rajasthan' } });
  for (const d of DEFAULT_DISTRICTS) {
    await prisma.district.upsert({
      where: { slug: d.slug },
      create: { name: d.name, nameEn: d.nameEn, slug: d.slug, categoryId: rajasthan?.id },
      update: {},
    });
  }
  console.log(`✔ ${DEFAULT_DISTRICTS.length} districts`);

  // --- Authors ---
  for (const a of DEMO_AUTHORS) {
    await prisma.author.upsert({
      where: { slug: a.slug },
      create: { name: a.name, slug: a.slug, bio: a.bio, isAiAssisted: a.aiAssisted },
      update: {},
    });
  }
  console.log(`✔ ${DEMO_AUTHORS.length} authors`);

  // --- Sources (clearly marked demo) ---
  for (const s of DEMO_SOURCES) {
    const cat = await prisma.category.findUnique({ where: { slug: s.category } });
    const existing = await prisma.newsSource.findFirst({ where: { name: s.name } });
    if (!existing) {
      await prisma.newsSource.create({
        data: {
          name: s.name,
          url: `https://demo.apnenews.local/${s.slug}`,
          feedUrl: `https://demo.apnenews.local/${s.slug}/feed`,
          type: s.type,
          trustScore: s.trust,
          priority: s.priority,
          isOfficial: s.official,
          isDemo: true,
          categoryId: cat?.id,
        },
      });
    }
  }
  console.log(`✔ ${DEMO_SOURCES.length} demo sources`);

  // --- Demo news items: expand templates into ~120 items over 3 days ---
  const categories = await prisma.category.findMany();
  const catBySlug = new Map(categories.map((c) => [c.slug, c]));
  const sources = await prisma.newsSource.findMany();
  const srcBySlug = new Map(DEMO_SOURCES.map((s) => [s.slug, sources.find((x) => x.name === s.name)!]));

  let itemCount = 0;
  const createdItemIds: string[] = [];
  for (let round = 0; round < 4; round++) {
    for (const tpl of DEMO_TEMPLATES) {
      for (let ti = 0; ti < tpl.titles.length; ti++) {
        const baseTitle = tpl.titles[ti];
        const title = round === 0 ? baseTitle : `${baseTitle} (अपडेट ${round})`;
        const source = srcBySlug.get(tpl.source);
        const cat = catBySlug.get(tpl.category);
        if (!source || !cat) continue;

        const uid = `${tpl.source}-${tpl.category}-${ti}-${round}`;
        const url = `https://demo.apnenews.local/${tpl.source}/${slugify(baseTitle)}-${shortHash(uid, 5)}`;
        const urlHash = sha256(url);
        const existing = await prisma.newsItem.findUnique({ where: { urlHash } });
        if (existing) continue;

        const hoursAgo = seededInt(uid, 70) + round * 2;
        const publishedAt = new Date(Date.now() - hoursAgo * 3.6e6);
        const isBreaking = !!tpl.breaking && round === 0 && ti === 0;
        const priority = computePriority({
          title,
          excerpt: tpl.excerpt,
          sourceTrust: source.trustScore,
          isOfficial: source.isOfficial,
          publishedAt,
          categorySlug: cat.slug,
          duplicateScore: 0,
        });

        const item = await prisma.newsItem.create({
          data: {
            sourceId: source.id,
            sourceName: source.name,
            sourceType: source.type,
            sourceUrl: url,
            urlHash,
            fingerprint: fingerprint(`${title} ${tpl.excerpt}`),
            title,
            excerpt: tpl.excerpt.slice(0, 300),
            rawContent: tpl.excerpt,
            publishedAt,
            categoryId: cat.id,
            priority: isBreaking ? Math.max(priority, 95) : priority,
            duplicateScore: 0,
            isDemo: true,
          },
        });
        createdItemIds.push(item.id);
        itemCount++;
      }
    }
  }
  console.log(`✔ ${itemCount} demo news items`);

  // --- Run the REAL pipeline: process items -> articles ---
  console.log('⚙  Processing items through AI/SEO/quality pipeline…');
  let processed = 0;
  for (const id of createdItemIds) {
    const res = await processItem(id);
    if (res?.articleId) processed++;
  }
  console.log(`✔ ${processed} articles generated`);

  // --- Publish a balanced spread (~58) to populate the site ---
  const articles = await prisma.newsArticle.findMany({
    where: { isDemo: true },
    orderBy: [{ isBreaking: 'desc' }, { priority: 'desc' }],
    select: { id: true, categoryId: true, isBreaking: true },
  });

  const perCat: Record<string, number> = {};
  let published = 0;
  const TARGET = 58;
  const MAX_PER_CAT = 8;
  for (const a of articles) {
    if (published >= TARGET) break;
    const key = a.categoryId ?? 'none';
    if (!a.isBreaking && (perCat[key] ?? 0) >= MAX_PER_CAT) continue;
    const ok = await publishArticle(a.id);
    if (ok) {
      perCat[key] = (perCat[key] ?? 0) + 1;
      published++;
    }
  }
  console.log(`✔ ${published} demo articles published across categories`);

  // Add a couple of live-update timeline entries to one breaking story (§22).
  const breaking = await prisma.newsArticle.findFirst({ where: { isBreaking: true, status: 'PUBLISHED' } });
  if (breaking) {
    await prisma.newsVersion.createMany({
      data: [
        { articleId: breaking.id, note: 'शुरुआती रिपोर्ट प्रकाशित।' },
        { articleId: breaking.id, note: 'आधिकारिक बयान जोड़ा गया।' },
      ],
    });
  }

  // Seed a couple of admin notifications + a breaking ticker text.
  await prisma.setting.upsert({
    where: { key: 'breakingTickerText' },
    create: { key: 'breakingTickerText', value: JSON.stringify('डेमो मंच · यह प्रदर्शन हेतु स्वचालित रूप से तैयार सामग्री है') },
    update: {},
  });

  console.log('✅ Seed complete.');
  console.log(`   Login at /admin/login  →  ${email} / ${password}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
