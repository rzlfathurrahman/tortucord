import { NextRequest, NextResponse } from 'next/server';
import { prisma, getOrCreateGuild } from '@tortuga/database';
import { getGuildChannels, getGuildRoles } from '@/lib/discord';
import { getPlatformSession, getDiscordSession, checkFeatureAccess } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const { guildId } = await params;

  try {
    const snapshots = await prisma.serverSnapshot.findMany({
      where: { guildId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        guildId: true,
        name: true,
        description: true,
        createdAt: true,
        createdBy: true,
        data: true,
      },
    });

    // Format lightweight meta
    const items = snapshots.map((s) => {
      const d = (s.data as any) || {};
      return {
        id: s.id,
        guildId: s.guildId,
        name: s.name,
        description: s.description,
        createdAt: s.createdAt,
        createdBy: s.createdBy,
        summary: {
          channelsCount: d.channels?.length || 0,
          rolesCount: d.roles?.length || 0,
          hasAutoMod: Boolean(d.automodConfig?.enabled),
          hasLeveling: Boolean(d.levelingConfig?.enabled),
          hasOnboarding: Boolean(d.onboardingConfig?.welcomeEnabled),
          customCommandsCount: d.customCommands?.length || 0,
        },
      };
    });

    return NextResponse.json({ success: true, snapshots: items });
  } catch (err: any) {
    console.error('[SnapshotsAPI] GET Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const { guildId } = await params;

  const access = await checkFeatureAccess(guildId, 'snapshots');
  if (!access.allowed) {
    return NextResponse.json({ success: false, error: access.error }, { status: access.status });
  }

  try {
    const body = await request.json();
    const { name, description } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: 'Snapshot name is required' },
        { status: 400 }
      );
    }

    const [platformUser, discordUser] = await Promise.all([
      getPlatformSession(),
      getDiscordSession(),
    ]);

    const createdBy = platformUser?.name || discordUser?.user?.username || 'Superadmin';

    // 1. Fetch live Discord structures
    const [channels, roles] = await Promise.all([
      getGuildChannels(guildId),
      getGuildRoles(guildId),
    ]);

    // 2. Fetch full DB configurations
    await getOrCreateGuild(guildId);
    const dbGuild = await prisma.guild.findUnique({
      where: { id: guildId },
      include: {
        levelingConfig: true,
        automodConfig: true,
        starboardConfig: true,
        loggingConfig: true,
        ticketConfig: true,
        onboardingConfig: true,
        customCommands: true,
        stickyMessages: true,
      },
    });

    const snapshotData = {
      version: 1,
      createdAt: new Date().toISOString(),
      guildId,
      channels: channels.map((c) => ({
        id: c.id,
        name: c.name,
        type: c.type,
        parentId: c.parentId,
        position: c.position,
        topic: c.topic,
        permissionOverwrites: c.permissionOverwrites,
      })),
      roles: roles.map((r) => ({
        id: r.id,
        name: r.name,
        color: r.color,
        position: r.position,
        permissions: r.permissions,
        managed: r.managed,
      })),
      levelingConfig: dbGuild?.levelingConfig,
      automodConfig: dbGuild?.automodConfig,
      starboardConfig: dbGuild?.starboardConfig,
      loggingConfig: dbGuild?.loggingConfig,
      ticketConfig: dbGuild?.ticketConfig,
      onboardingConfig: dbGuild?.onboardingConfig,
      customCommands: dbGuild?.customCommands,
      stickyMessages: dbGuild?.stickyMessages,
    };

    const snapshot = await prisma.serverSnapshot.create({
      data: {
        guildId,
        name: name.trim(),
        description: description?.trim() || null,
        data: snapshotData as any,
        createdBy,
      },
    });

    return NextResponse.json({
      success: true,
      snapshot: {
        id: snapshot.id,
        name: snapshot.name,
        createdAt: snapshot.createdAt,
      },
    });
  } catch (err: any) {
    console.error('[SnapshotsAPI] POST Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
