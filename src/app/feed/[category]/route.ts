import { buildRssFeed } from '@/lib/rss';

export const dynamic = 'force-dynamic';
export const revalidate = 600;

export async function GET(_req: Request, { params }: { params: { category: string } }) {
  const xml = await buildRssFeed(params.category);
  return new Response(xml, {
    headers: { 'content-type': 'application/rss+xml; charset=utf-8', 'cache-control': 'public, max-age=600' },
  });
}
