import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@tortuga/database';
import {
  verifyPassword,
  createPlatformSessionToken,
  ensureInitialSuperadmin,
  PlatformSessionPayload,
} from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    await ensureInitialSuperadmin();

    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const user = await prisma.dashboardUser.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user || !user.isActive) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const isValid = verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const sessionPayload: PlatformSessionPayload = {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };

    const token = createPlatformSessionToken(sessionPayload);
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });

    response.cookies.set('tortuga_platform_session', token, {
      httpOnly: true,
      secure:
        process.env.NODE_ENV === 'production' &&
        Boolean(process.env.NEXTAUTH_URL?.startsWith('https://')),
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    });

    return response;
  } catch (err: any) {
    console.error('[PlatformLogin] Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
