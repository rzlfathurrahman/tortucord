import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  if (code) {
    // If Discord redirected to /api/auth/discord instead of /callback, forward to callback
    const url = new URL('/api/auth/discord/callback', request.url);
    url.search = request.nextUrl.search;
    return NextResponse.redirect(url);
  }

  const session = await getSession();

  if (session) {
    return NextResponse.json({
      authenticated: true,
      user: session.user,
    });
  }

  return NextResponse.json({
    authenticated: false,
    user: null,
  });
}
