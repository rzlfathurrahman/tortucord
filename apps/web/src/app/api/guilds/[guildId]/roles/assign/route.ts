import { NextRequest, NextResponse } from 'next/server';
import {
  getGuildMembers,
  getGuildRoles,
  getBotUser,
  addMemberRole,
  removeMemberRole,
} from '@/lib/discord';
import { checkFeatureAccess } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const { guildId } = await params;

  const access = await checkFeatureAccess(guildId, 'roles');
  if (!access.allowed) {
    return NextResponse.json({ success: false, error: access.error }, { status: access.status });
  }

  const { searchParams } = new URL(request.url);
  const roleId = searchParams.get('roleId');
  const search = (searchParams.get('search') || '').toLowerCase().trim();

  try {
    const rawMembers = await getGuildMembers(guildId, 1000);

    let members = rawMembers.map((m) => ({
      id: m.user.id,
      username: m.user.username,
      globalName: m.user.globalName || m.user.username,
      avatar: m.user.avatar,
      nickname: m.nick,
      bot: Boolean(m.user.bot),
      hasRole: roleId ? m.roles.includes(roleId) : false,
      roles: m.roles,
    }));

    if (search) {
      members = members.filter(
        (m) =>
          m.username.toLowerCase().includes(search) ||
          m.globalName.toLowerCase().includes(search) ||
          (m.nickname && m.nickname.toLowerCase().includes(search)) ||
          m.id.includes(search)
      );
    }

    return NextResponse.json({
      success: true,
      members: members.slice(0, 100),
      totalCount: members.length,
    });
  } catch (err: any) {
    console.error('[AssignRolesAPI] Error in GET:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
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
    const { userId, roleId, action } = body;

    if (!userId || !roleId || !action) {
      return NextResponse.json(
        { success: false, error: 'userId, roleId, and action (add|remove) are required' },
        { status: 400 }
      );
    }

    if (roleId === guildId) {
      return NextResponse.json(
        { success: false, error: 'Cannot manually assign or remove @everyone role' },
        { status: 400 }
      );
    }

    // Verify hierarchy
    const [rawRoles, botUser] = await Promise.all([
      getGuildRoles(guildId),
      getBotUser(),
    ]);

    const targetRole = rawRoles.find((r) => r.id === roleId);
    if (!targetRole) {
      return NextResponse.json({ success: false, error: 'Role not found' }, { status: 404 });
    }

    if (targetRole.managed) {
      return NextResponse.json(
        { success: false, error: 'Cannot assign a managed bot integration role' },
        { status: 400 }
      );
    }

    // Check bot highest position
    let botHighestPos = 0;
    const token = process.env.DISCORD_BOT_TOKEN;
    if (token && botUser) {
      try {
        const memberRes = await fetch(
          `https://discord.com/api/v10/guilds/${guildId}/members/${botUser.id}`,
          { headers: { Authorization: `Bot ${token}` } }
        );
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

    if (botHighestPos > 0 && targetRole.position >= botHighestPos) {
      return NextResponse.json(
        {
          success: false,
          error: `Bot Tortuga tidak dapat mengelola role @${targetRole.name} karena posisinya sama atau lebih tinggi dari role Tortuga di Server Settings -> Roles.`,
        },
        { status: 403 }
      );
    }

    if (action === 'add') {
      const res = await addMemberRole(guildId, userId, roleId);
      if (!res.success) {
        return NextResponse.json({ success: false, error: res.error }, { status: 500 });
      }
      return NextResponse.json({
        success: true,
        message: `Role @${targetRole.name} berhasil diberikan`,
      });
    } else if (action === 'remove') {
      const res = await removeMemberRole(guildId, userId, roleId);
      if (!res.success) {
        return NextResponse.json({ success: false, error: res.error }, { status: 500 });
      }
      return NextResponse.json({
        success: true,
        message: `Role @${targetRole.name} berhasil dicabut`,
      });
    } else {
      return NextResponse.json(
        { success: false, error: "Invalid action. Use 'add' or 'remove'." },
        { status: 400 }
      );
    }
  } catch (err: any) {
    console.error('[AssignRolesAPI] Error in POST:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
