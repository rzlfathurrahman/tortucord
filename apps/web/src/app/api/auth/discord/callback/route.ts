import { NextRequest, NextResponse } from 'next/server';
import { serializeSession, SessionData, getPlatformSession } from '@/lib/auth';
import { prisma } from '@tortuga/database';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const rawState = searchParams.get('state');

  // Determine request host and origin
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  const proto =
    request.headers.get('x-forwarded-proto') ||
    (request.url.startsWith('https') ? 'https' : 'http');
  const requestOrigin = host ? `${proto}://${host}` : (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');

  let stateAction = 'login';
  let targetOrigin = requestOrigin;
  let usedRedirectUri = '';

  if (rawState) {
    try {
      const parsed = JSON.parse(Buffer.from(rawState, 'base64url').toString('utf-8'));
      if (parsed && typeof parsed === 'object') {
        stateAction = parsed.action || 'login';
        if (parsed.origin) targetOrigin = parsed.origin;
        if (parsed.redirectUri) usedRedirectUri = parsed.redirectUri;
      }
    } catch {
      stateAction = rawState;
    }
  }

  if (error || !code) {
    console.warn('[DiscordOAuth] Login cancelled or failed with error:', error);
    return NextResponse.redirect(new URL(`/dashboard?error=${encodeURIComponent(error || 'oauth_cancelled')}`, targetOrigin));
  }

  const clientId = process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;

  // Discord token exchange MUST use the exact same redirect_uri that was passed to /authorize
  const redirectUri =
    usedRedirectUri ||
    process.env.DISCORD_REDIRECT_URI ||
    `${targetOrigin}/api/auth/discord/callback`;

  try {
    const tokenRes = await fetch('https://discord.com/api/v10/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId || '',
        client_secret: clientSecret || '',
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error('[DiscordOAuth] Token exchange failed:', tokenRes.status, errText, 'Used redirect_uri:', redirectUri);
      return NextResponse.redirect(new URL(`/dashboard?error=token_exchange_failed`, targetOrigin));
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;
    const expiresIn = tokenData.expires_in || 604800;

    // Fetch user profile from Discord
    const userRes = await fetch('https://discord.com/api/v10/users/@me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!userRes.ok) {
      return NextResponse.redirect(new URL('/dashboard?error=user_fetch_failed', targetOrigin));
    }

    const u = await userRes.json();
    const discordAvatar = u.avatar
      ? `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.png?size=128`
      : null;

    // Only enable secure cookies over real HTTPS connections (prevents dropping cookies on dev HTTP)
    const isHttps =
      targetOrigin.startsWith('https://') ||
      request.url.startsWith('https://') ||
      request.headers.get('x-forwarded-proto') === 'https';

    // Check if user is linking to a Platform User
    const platformUser = await getPlatformSession();

    if (platformUser || stateAction === 'link') {
      const targetUserId = platformUser?.userId;
      if (targetUserId) {
        await prisma.linkedDiscordAccount.upsert({
          where: {
            userId_discordId: {
              userId: targetUserId,
              discordId: u.id,
            },
          },
          update: {
            username: u.username,
            globalName: u.global_name || u.username,
            avatar: discordAvatar,
            accessToken,
            refreshToken,
            expiresAt: new Date(Date.now() + expiresIn * 1000),
          },
          create: {
            userId: targetUserId,
            discordId: u.id,
            username: u.username,
            globalName: u.global_name || u.username,
            avatar: discordAvatar,
            accessToken,
            refreshToken,
            expiresAt: new Date(Date.now() + expiresIn * 1000),
          },
        });

        const redirectTarget = new URL('/dashboard/accounts?linked=true', targetOrigin);
        const response = NextResponse.redirect(redirectTarget);

        const sessionData: SessionData = {
          user: {
            id: u.id,
            username: u.username,
            globalName: u.global_name || u.username,
            avatar: discordAvatar,
          },
          accessToken,
          expiresAt: Date.now() + expiresIn * 1000,
        };

        response.cookies.set('tortuga_session', serializeSession(sessionData), {
          httpOnly: true,
          secure: isHttps,
          sameSite: 'lax',
          maxAge: expiresIn,
          path: '/',
        });

        return response;
      }
    }

    // Default standalone Discord OAuth login
    const sessionData: SessionData = {
      user: {
        id: u.id,
        username: u.username,
        globalName: u.global_name || u.username,
        avatar: discordAvatar,
      },
      accessToken,
      expiresAt: Date.now() + expiresIn * 1000,
    };

    const response = NextResponse.redirect(new URL('/dashboard', targetOrigin));

    response.cookies.set('tortuga_session', serializeSession(sessionData), {
      httpOnly: true,
      secure: isHttps,
      sameSite: 'lax',
      maxAge: expiresIn,
      path: '/',
    });

    return response;
  } catch (err) {
    console.error('[DiscordOAuth] Unexpected error during callback:', err);
    return NextResponse.redirect(new URL('/dashboard?error=internal_error', targetOrigin));
  }
}
