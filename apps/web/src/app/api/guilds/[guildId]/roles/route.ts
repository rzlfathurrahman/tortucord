import { NextRequest, NextResponse } from 'next/server';
import {
  getGuildRoles,
  getBotUser,
  createGuildRole,
  updateGuildRole,
  deleteGuildRole,
} from '@/lib/discord';
import { prisma, getOrCreateGuild } from '@tortuga/database';
import { checkFeatureAccess } from '@/lib/auth';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const { guildId } = await params;

  try {
    await getOrCreateGuild(guildId);
    const [rawRoles, botUser, onboardingCfg] = await Promise.all([
      getGuildRoles(guildId),
      getBotUser(),
      prisma.onboardingConfig.findUnique({ where: { guildId } }),
    ]);

    // Find bot member in guild to determine bot's highest role
    let botHighestPos = 0;
    const token = process.env.DISCORD_BOT_TOKEN;
    if (token && botUser) {
      try {
        const memberRes = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${botUser.id}`, {
          headers: { Authorization: `Bot ${token}` },
          next: { revalidate: 60 },
        });
        if (memberRes.ok) {
          const memberData = await memberRes.json();
          const botRoleIds: string[] = memberData.roles || [];
          for (const rid of botRoleIds) {
            const r = rawRoles.find((role) => role.id === rid);
            if (r && r.position > botHighestPos) {
              botHighestPos = r.position;
            }
          }
        }
      } catch {
        // ignore
      }
    }

    const autoRoleIds = onboardingCfg?.autoroleIds || [];

    // Format and enrich roles
    const enrichedRoles = rawRoles
      .sort((a, b) => b.position - a.position)
      .map((role) => {
        const permBig = BigInt(role.permissions || '0');
        const isAdmin = (permBig & BigInt(0x8)) !== BigInt(0);
        const canManageRoles = (permBig & BigInt(0x10000000)) !== BigInt(0);
        const canKickBan = (permBig & BigInt(0x2)) !== BigInt(0) || (permBig & BigInt(0x4)) !== BigInt(0);

        return {
          id: role.id,
          name: role.name,
          color: role.color || '#94a3b8',
          position: role.position,
          managed: role.managed,
          hoist: Boolean(role.hoist),
          mentionable: Boolean(role.mentionable),
          isAdmin,
          canManageRoles,
          canKickBan,
          isHigherThanBot: role.position >= botHighestPos && botHighestPos > 0,
          isAutoRole: autoRoleIds.includes(role.id),
        };
      });

    return NextResponse.json({
      success: true,
      roles: enrichedRoles,
      botHighestPosition: botHighestPos,
    });
  } catch (err) {
    console.error('[RolesAPI] Error fetching roles:', err);
    return NextResponse.json({ success: false, error: 'Failed to fetch roles' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const { guildId } = await params;

  const access = await checkFeatureAccess(guildId, 'roles');
  if (!access.allowed) {
    return NextResponse.json({ success: false, error: access.error }, { status: access.status });
  }

  try {
    const body = await request.json();

    // 1. Check if this is a Create Role action
    if (body.action === 'create') {
      const { name, color, hoist, mentionable } = body;
      if (!name || typeof name !== 'string' || !name.trim()) {
        return NextResponse.json({ success: false, error: 'Role name is required' }, { status: 400 });
      }

      const createRes = await createGuildRole(guildId, {
        name: name.trim(),
        color,
        hoist: Boolean(hoist),
        mentionable: Boolean(mentionable),
        reason: 'Created via Tortuga Dashboard',
      });

      if (!createRes.success) {
        return NextResponse.json({ success: false, error: createRes.error }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        role: createRes.role,
      });
    }

    // 2. Default: Toggle autorole
    const { roleId, isAutoRole } = body;
    if (!roleId) {
      return NextResponse.json({ success: false, error: 'roleId is required' }, { status: 400 });
    }

    await getOrCreateGuild(guildId);
    let cfg = await prisma.onboardingConfig.findUnique({ where: { guildId } });
    let autoroleIds = cfg?.autoroleIds || [];

    if (isAutoRole && !autoroleIds.includes(roleId)) {
      autoroleIds.push(roleId);
    } else if (!isAutoRole) {
      autoroleIds = autoroleIds.filter((id) => id !== roleId);
    }

    await prisma.onboardingConfig.upsert({
      where: { guildId },
      update: { autoroleIds },
      create: { guildId, autoroleIds },
    });

    await prisma.guild.update({
      where: { id: guildId },
      data: { autoroleIds },
    }).catch(() => null);

    return NextResponse.json({
      success: true,
      autoroleIds,
    });
  } catch (err) {
    console.error('[RolesAPI] Error in POST /roles:', err);
    return NextResponse.json({ success: false, error: 'Failed to process request' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const { guildId } = await params;

  const access = await checkFeatureAccess(guildId, 'roles');
  if (!access.allowed) {
    return NextResponse.json({ success: false, error: access.error }, { status: access.status });
  }

  try {
    const body = await request.json();
    const { roleId, name, color, hoist, mentionable, permissions } = body;

    if (!roleId) {
      return NextResponse.json({ success: false, error: 'roleId is required' }, { status: 400 });
    }

    if (roleId === guildId) {
      return NextResponse.json({ success: false, error: 'Cannot modify @everyone role properties via this action' }, { status: 400 });
    }

    const updateRes = await updateGuildRole(guildId, roleId, {
      name: name?.trim(),
      color,
      hoist,
      mentionable,
      permissions,
      reason: 'Updated via Tortuga Dashboard',
    });

    if (!updateRes.success) {
      return NextResponse.json({ success: false, error: updateRes.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      role: updateRes.role,
    });
  } catch (err) {
    console.error('[RolesAPI] Error updating role:', err);
    return NextResponse.json({ success: false, error: 'Failed to update role' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const { guildId } = await params;

  const access = await checkFeatureAccess(guildId, 'roles');
  if (!access.allowed) {
    return NextResponse.json({ success: false, error: access.error }, { status: access.status });
  }

  try {
    const { searchParams } = new URL(request.url);
    let roleId = searchParams.get('roleId');
    let reason = searchParams.get('reason') || 'Deleted via Tortuga Dashboard';

    if (!roleId) {
      const body = await request.json().catch(() => ({}));
      roleId = body.roleId;
      if (body.reason) reason = body.reason;
    }

    if (!roleId) {
      return NextResponse.json({ success: false, error: 'roleId is required' }, { status: 400 });
    }

    if (roleId === guildId) {
      return NextResponse.json({ success: false, error: 'Cannot delete @everyone role' }, { status: 400 });
    }

    const delRes = await deleteGuildRole(guildId, roleId, reason);
    if (!delRes.success) {
      return NextResponse.json({ success: false, error: delRes.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Role deleted successfully',
    });
  } catch (err) {
    console.error('[RolesAPI] Error deleting role:', err);
    return NextResponse.json({ success: false, error: 'Failed to delete role' }, { status: 500 });
  }
}
