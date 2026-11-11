import { NextRequest, NextResponse } from 'next/server';
import { prisma, getOrCreateGuild } from '@tortuga/database';
import { getPlatformSession, DASHBOARD_FEATURES } from '@/lib/auth';
import { getBotGuilds } from '@/lib/discord';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await getPlatformSession();
  if (!session || session.role !== 'SUPERADMIN') {
    return NextResponse.json(
      { success: false, error: 'Forbidden: Superadmin required' },
      { status: 403 }
    );
  }

  const { userId } = await params;

  try {
    const [user, botGuilds] = await Promise.all([
      prisma.dashboardUser.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          guildAccesses: {
            include: {
              guild: {
                select: {
                  id: true,
                  prefix: true,
                },
              },
            },
          },
        },
      }),
      getBotGuilds(),
    ]);

    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    // Attach bot guild info (name, icon) to accesses
    const enrichedAccesses = user.guildAccesses.map((access) => {
      const botGuild = botGuilds.find((bg) => bg.id === access.guildId);
      return {
        id: access.id,
        userId: access.userId,
        guildId: access.guildId,
        features: access.features,
        canManageAll: access.canManageAll,
        createdAt: access.createdAt,
        updatedAt: access.updatedAt,
        guild: {
          id: access.guildId,
          name: botGuild?.name || `Server (${access.guildId})`,
          icon: botGuild?.icon || null,
          prefix: access.guild?.prefix || '!',
          botJoined: Boolean(botGuild),
        },
      };
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      accesses: enrichedAccesses,
      botGuilds,
      availableFeatures: DASHBOARD_FEATURES,
    });
  } catch (err: any) {
    console.error('[UserPermissionsAPI] Error in GET:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await getPlatformSession();
  if (!session || session.role !== 'SUPERADMIN') {
    return NextResponse.json(
      { success: false, error: 'Forbidden: Superadmin required' },
      { status: 403 }
    );
  }

  const { userId } = await params;

  try {
    const body = await request.json();
    const { guildId, features, canManageAll } = body;

    if (!guildId) {
      return NextResponse.json(
        { success: false, error: 'guildId is required' },
        { status: 400 }
      );
    }

    // Verify user exists
    const user = await prisma.dashboardUser.findUnique({
      where: { id: userId },
    });
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    // Ensure guild exists in database
    await getOrCreateGuild(guildId);

    const isAll = Boolean(canManageAll);
    const featureList: string[] = isAll
      ? DASHBOARD_FEATURES.map((f) => f.id)
      : Array.isArray(features)
      ? features
      : [];

    const access = await prisma.guildDashboardAccess.upsert({
      where: {
        userId_guildId: { userId, guildId },
      },
      update: {
        canManageAll: isAll,
        features: featureList,
      },
      create: {
        userId,
        guildId,
        canManageAll: isAll,
        features: featureList,
      },
      include: {
        guild: true,
      },
    });

    return NextResponse.json({
      success: true,
      access,
    });
  } catch (err: any) {
    console.error('[UserPermissionsAPI] Error in POST:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await getPlatformSession();
  if (!session || session.role !== 'SUPERADMIN') {
    return NextResponse.json(
      { success: false, error: 'Forbidden: Superadmin required' },
      { status: 403 }
    );
  }

  const { userId } = await params;
  const { searchParams } = new URL(request.url);
  const guildId = searchParams.get('guildId');
  const accessId = searchParams.get('id');

  if (!guildId && !accessId) {
    return NextResponse.json(
      { success: false, error: 'Either guildId or access id is required' },
      { status: 400 }
    );
  }

  try {
    if (accessId) {
      await prisma.guildDashboardAccess.delete({
        where: { id: accessId },
      });
    } else if (guildId) {
      await prisma.guildDashboardAccess.deleteMany({
        where: { userId, guildId },
      });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[UserPermissionsAPI] Error in DELETE:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
