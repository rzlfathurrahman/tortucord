import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const clientId = process.env.DISCORD_CLIENT_ID;

  if (!clientId) {
    return NextResponse.json(
      { error: 'DISCORD_CLIENT_ID is not configured in .env' },
      { status: 500 }
    );
  }

  // Dynamically determine caller origin from headers
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  const proto =
    request.headers.get('x-forwarded-proto') ||
    (request.url.startsWith('https') ? 'https' : 'http');
  const requestOrigin = host ? `${proto}://${host}` : (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');

  // If explicit DISCORD_REDIRECT_URI is configured, use it; otherwise use dynamic origin
  const redirectUri =
    process.env.DISCORD_REDIRECT_URI || `${requestOrigin}/api/auth/discord/callback`;

  const { searchParams } = new URL(request.url);
  const isLink = searchParams.get('link') === 'true';

  // Encode structured state so callback knows the exact redirectUri & origin to return to
  const statePayload = {
    action: isLink ? 'link' : 'login',
    origin: requestOrigin,
    redirectUri,
  };
  const state = Buffer.from(JSON.stringify(statePayload)).toString('base64url');

  const oauthUrl = `https://discord.com/oauth2/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&scope=identify%20guilds&state=${state}&prompt=consent`;

  return NextResponse.redirect(oauthUrl);
}
