import { NextResponse } from 'next/server';
import { prisma } from '@tortuga/database';
import { getPlatformSession, getDiscordSession, ensureInitialSuperadmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await ensureInitialSuperadmin();

    const session = await getPlatformSession();
    const discordSession = await getDiscordSession();

    if (!session) {
      return NextResponse.json({
        authenticated: false,
        user: null,
        linkedAccounts: [],
        discordSession: discordSession?.user || null,
      });
    }

    const user = await prisma.dashboardUser.findUnique({
      where: { id: session.userId },
      include: {
        linkedDiscordAccounts: {
          select: {
            id: true,
            discordId: true,
            username: true,
            globalName: true,
            avatar: true,
            connectedAt: true,
          },
          orderBy: { connectedAt: 'desc' },
        },
      },
    });

    if (!user || !user.isActive) {
      return NextResponse.json({
        authenticated: false,
        user: null,
        linkedAccounts: [],
        discordSession: discordSession?.user || null,
      });
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar: user.avatar,
        createdAt: user.createdAt,
      },
      linkedAccounts: user.linkedDiscordAccounts,
      discordSession: discordSession?.user || null,
    });
  } catch (err: any) {
    return NextResponse.json({ authenticated: false, error: err.message }, { status: 500 });
  }
}
