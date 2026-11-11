import { NextRequest, NextResponse } from 'next/server';
import { getGuildDetails, getGuildChannels, getGuildRoles } from '@/lib/discord';
import { prisma, getOrCreateGuild } from '@tortuga/database';
import { checkFeatureAccess } from '@/lib/auth';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const { guildId } = await params;
  const [guild, channels, roles] = await Promise.all([
    getGuildDetails(guildId),
    getGuildChannels(guildId),
    getGuildRoles(guildId),
  ]);

  try {
    const dbGuild = await prisma.guild.findUnique({ where: { id: guildId } });
    if (dbGuild && guild) {
      guild.prefix = dbGuild.prefix;
    }
  } catch {
    // Ignore DB error
  }

  return NextResponse.json({
    success: true,
    guild,
    channels,
    roles,
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const { guildId } = await params;
  const access = await checkFeatureAccess(guildId, 'settings');
  if (!access.allowed) {
    return NextResponse.json({ success: false, error: access.error }, { status: access.status });
  }

  const body = await request.json();

  try {
    await getOrCreateGuild(guildId);
    const updated = await prisma.guild.update({
      where: { id: guildId },
      data: {
        prefix: body.prefix !== undefined ? body.prefix : undefined,
      },
    });

    return NextResponse.json({
      success: true,
      prefix: updated.prefix,
    });
  } catch (err) {
    console.error('[GuildAPI] Failed to update guild:', err);
    return NextResponse.json({ success: false, error: 'Update failed' }, { status: 500 });
  }
}
