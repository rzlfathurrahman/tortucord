import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete('tortuga_platform_session');
  response.cookies.delete('tortuga_session');
  return response;
}
