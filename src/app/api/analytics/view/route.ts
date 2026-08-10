import { NextResponse, type NextRequest } from 'next/server';
import { recordArticleView } from '@/server/services/analytics';

export const dynamic = 'force-dynamic';

// Records an article view (called from the article page client beacon).
export async function POST(req: NextRequest) {
  try {
    const { articleId } = await req.json();
    if (!articleId || typeof articleId !== 'string') {
      return NextResponse.json({ error: 'articleId required' }, { status: 400 });
    }
    const ua = req.headers.get('user-agent') || '';
    const device = /mobile/i.test(ua) ? 'mobile' : /tablet/i.test(ua) ? 'tablet' : 'desktop';
    await recordArticleView(articleId, { referrer: req.headers.get('referer') || undefined, device });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 200 }); // never break page rendering
  }
}
