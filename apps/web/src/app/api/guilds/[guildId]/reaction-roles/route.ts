import { NextRequest, NextResponse } from 'next/server';
import { prisma, getOrCreateGuild } from '@tortuga/database';
import { ReactionRoleGroup } from '@/lib/types';
import { checkFeatureAccess } from '@/lib/auth';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const { guildId } = await params;

  try {
    await getOrCreateGuild(guildId);
    const dbGroups = await prisma.reactionRoleGroup.findMany({
      where: { guildId },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });

    const reactionRoles: ReactionRoleGroup[] = dbGroups.map((g) => ({
      id: g.id,
      guildId: g.guildId,
      name: `Group #${g.id.slice(-4)}`,
      channelId: g.channelId,
      messageId: g.messageId,
      mode: (g.type.toLowerCase() as any) || 'normal',
      maxRoles: g.maxRoles,
      createdAt: g.createdAt.toISOString(),
      items: g.items.map((it) => ({
        id: it.id,
        emoji: it.emoji,
        roleId: it.roleId,
        label: it.label || undefined,
        style: (it.style?.toLowerCase() as any) || 'primary',
      })),
    }));

    return NextResponse.json({
      success: true,
      reactionRoles,
    });
  } catch (err) {
    console.error('[ReactionRolesAPI] Error fetching groups:', err);
    return NextResponse.json({
      success: true,
      reactionRoles: [],
    });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const { guildId } = await params;

  const access = await checkFeatureAccess(guildId, 'reaction-roles');
  if (!access.allowed) {
    return NextResponse.json({ success: false, error: access.error }, { status: access.status });
  }

  const body = await request.json();

  try {
    await getOrCreateGuild(guildId);
    
    // 1. Create DB group record
    const created = await prisma.reactionRoleGroup.create({
      data: {
        guildId,
        channelId: body.channelId || '1252146820725997628',
        messageId: body.messageId || `pending_${Date.now()}`,
        type: 'NORMAL',
        items: {
          create: (body.items || []).map((it: any) => ({
            emoji: it.emoji || '✨',
            roleId: it.roleId || '1252146683157020753',
            label: it.label || undefined,
            style: 'PRIMARY',
          })),
        },
      },
      include: { items: true },
    });

    // 2. If bot token available and channelId specified, post interactive message to Discord!
    const token = process.env.DISCORD_BOT_TOKEN;
    if (token && body.channelId) {
      try {
        const components: any[] = [];
        if (created.items.length > 0) {
          components.push({
            type: 1, // ActionRow
            components: created.items.slice(0, 5).map((it) => ({
              type: 2, // Button
              style: 1, // Primary (Blurple)
              custom_id: `rr:btn:${created.id}:${it.roleId}`,
              label: it.label || undefined,
              emoji: it.emoji ? { name: it.emoji } : undefined,
            })),
          });
        }

        const msgRes = await fetch(
          `https://discord.com/api/v10/channels/${body.channelId}/messages`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bot ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              embeds: [
                {
                  title: body.name || '🎭 Pick Your Roles',
                  description:
                    body.description ||
                    'Click the buttons below to pick or remove your roles!',
                  color: 0x10b981, // Emerald
                  footer: {
                    text: 'Tortuga • Click a button to toggle your role',
                  },
                },
              ],
              components,
            }),
          }
        );

        if (msgRes.ok) {
          const msgData = await msgRes.json();
          await prisma.reactionRoleGroup.update({
            where: { id: created.id },
            data: { messageId: msgData.id },
          });
          created.messageId = msgData.id;
        }
      } catch (postErr) {
        console.warn('[ReactionRolesAPI] Could not post Discord message:', postErr);
      }
    }

    const formatted: ReactionRoleGroup = {
      id: created.id,
      guildId: created.guildId,
      name: body.name || `Group #${created.id.slice(-4)}`,
      channelId: created.channelId,
      messageId: created.messageId,
      mode: 'normal',
      createdAt: created.createdAt.toISOString(),
      items: created.items.map((it) => ({
        id: it.id,
        emoji: it.emoji,
        roleId: it.roleId,
        label: it.label || undefined,
        style: 'primary',
      })),
    };

    return NextResponse.json({
      success: true,
      group: formatted,
    });
  } catch (err) {
    console.error('[ReactionRolesAPI] Error creating group:', err);
    return NextResponse.json({ success: false, error: 'Failed to create group' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const { guildId } = await params;

  const access = await checkFeatureAccess(guildId, 'reaction-roles');
  if (!access.allowed) {
    return NextResponse.json({ success: false, error: access.error }, { status: access.status });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (id) {
    try {
      await prisma.reactionRoleGroup.delete({ where: { id } }).catch(() => null);
    } catch {
      // ignore
    }
  }

  return NextResponse.json({
    success: true,
    deletedId: id,
  });
}
