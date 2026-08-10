import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Edge middleware: cheap cookie-presence gate for /admin. Full session
// validation (DB + signature) happens in the admin layout — middleware cannot
// use Prisma. Unauthenticated users are redirected to the login page.

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    const hasSession = req.cookies.has('apnenews_session');
    if (!hasSession) {
      const url = req.nextUrl.clone();
      url.pathname = '/admin/login';
      url.searchParams.set('from', pathname);
      return NextResponse.redirect(url);
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
