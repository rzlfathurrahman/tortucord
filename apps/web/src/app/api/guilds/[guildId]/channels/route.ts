import { NextRequest, NextResponse } from 'next/server';
import {
  getGuildChannels,
  createGuildChannel,
  deleteGuildChannel,
  updateChannelPermissions,
} from '@/lib/discord';
import { checkFeatureAccess } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const { guildId } = await params;
  try {
    const channels = await getGuildChannels(guildId);
    return NextResponse.json({ success: true, channels });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const { guildId } = await params;

  const access = await checkFeatureAccess(guildId, 'channels');
  if (!access.allowed) {
    return NextResponse.json({ success: false, error: access.error }, { status: access.status });
  }

  const body = await request.json();
  const { action } = body;

  try {
    if (action === 'create') {
      const { name, type, parentId, topic, isPrivate, allowedRoleIds, isReadOnly } = body;
      if (!name || !type) {
        return NextResponse.json(
          { success: false, error: 'Channel name and type are required' },
          { status: 400 }
        );
      }

      const result = await createGuildChannel(guildId, {
        name,
        type,
        parentId,
        topic,
        isPrivate,
        allowedRoleIds,
        isReadOnly,
      });

      if (!result.success) {
        return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      }

      return NextResponse.json({ success: true, channel: result.channel });
    }

    if (action === 'permissions') {
      const { channelId, isPrivate, allowedRoleIds, isReadOnly } = body;
      if (!channelId) {
        return NextResponse.json(
          { success: false, error: 'channelId is required' },
          { status: 400 }
        );
      }

      const result = await updateChannelPermissions(
        guildId,
        channelId,
        isPrivate,
        allowedRoleIds || [],
        isReadOnly
      );

      if (!result.success) {
        return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      }

      return NextResponse.json({ success: true });
    }

    if (action === 'template') {
      const { templateId, staffRoleIds } = body;

      if (templateId === 'community') {
        // 1. Category Information
        const infoCat = await createGuildChannel(guildId, {
          name: '📢 INFORMATION',
          type: 'category',
        });
        const infoId = infoCat.channel?.id;

        await createGuildChannel(guildId, {
          name: 'welcome-and-rules',
          type: 'text',
          parentId: infoId,
          topic: 'Server guidelines and welcome portal',
          isReadOnly: true,
          allowedRoleIds: staffRoleIds || [],
        });

        await createGuildChannel(guildId, {
          name: 'announcements',
          type: 'announcement',
          parentId: infoId,
          topic: 'Official server broadcasts and news',
          isReadOnly: true,
          allowedRoleIds: staffRoleIds || [],
        });

        // 2. Category Community
        const commCat = await createGuildChannel(guildId, {
          name: '💬 COMMUNITY',
          type: 'category',
        });
        const commId = commCat.channel?.id;

        await createGuildChannel(guildId, {
          name: 'general-chat',
          type: 'text',
          parentId: commId,
          topic: 'Main hub for casual chat and hangout',
        });

        await createGuildChannel(guildId, {
          name: 'bot-commands',
          type: 'text',
          parentId: commId,
          topic: 'Execute Tortuga and bot utility commands here',
        });

        await createGuildChannel(guildId, {
          name: 'media-share',
          type: 'text',
          parentId: commId,
          topic: 'Post your photos, clips, and cool links',
        });

        // 3. Category Voice
        const voiceCat = await createGuildChannel(guildId, {
          name: '🔊 VOICE LOUNGES',
          type: 'category',
        });
        const voiceId = voiceCat.channel?.id;

        await createGuildChannel(guildId, {
          name: 'General Voice 1',
          type: 'voice',
          parentId: voiceId,
        });

        await createGuildChannel(guildId, {
          name: 'Gaming Lounge',
          type: 'voice',
          parentId: voiceId,
        });

        return NextResponse.json({ success: true, message: 'Community template created!' });
      }

      if (templateId === 'staff') {
        const staffCat = await createGuildChannel(guildId, {
          name: '🔒 STAFF HEADQUARTERS',
          type: 'category',
          isPrivate: true,
          allowedRoleIds: staffRoleIds || [],
        });
        const catId = staffCat.channel?.id;

        await createGuildChannel(guildId, {
          name: 'mod-chat',
          type: 'text',
          parentId: catId,
          topic: 'Private discussion for server moderation staff',
          isPrivate: true,
          allowedRoleIds: staffRoleIds || [],
        });

        await createGuildChannel(guildId, {
          name: 'incident-logs',
          type: 'text',
          parentId: catId,
          topic: 'Audit and infraction case tracking',
          isPrivate: true,
          allowedRoleIds: staffRoleIds || [],
        });

        await createGuildChannel(guildId, {
          name: 'Staff Briefing Room',
          type: 'voice',
          parentId: catId,
          isPrivate: true,
          allowedRoleIds: staffRoleIds || [],
        });

        return NextResponse.json({ success: true, message: 'Staff template created!' });
      }

      if (templateId === 'gaming') {
        const gameCat = await createGuildChannel(guildId, {
          name: '🎮 GAMING HUBS',
          type: 'category',
        });
        const catId = gameCat.channel?.id;

        await createGuildChannel(guildId, {
          name: 'looking-for-group',
          type: 'text',
          parentId: catId,
          topic: 'Find teammates and squad partners',
        });

        await createGuildChannel(guildId, {
          name: 'Duo Room 1',
          type: 'voice',
          parentId: catId,
        });

        await createGuildChannel(guildId, {
          name: 'Squad Room (4p)',
          type: 'voice',
          parentId: catId,
        });

        await createGuildChannel(guildId, {
          name: 'AFK Sleep Room',
          type: 'voice',
          parentId: catId,
        });

        return NextResponse.json({ success: true, message: 'Gaming template created!' });
      }

      return NextResponse.json({ success: false, error: 'Unknown templateId' }, { status: 400 });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    console.error('[ChannelsAPI] Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const { guildId } = await params;

  const access = await checkFeatureAccess(guildId, 'channels');
  if (!access.allowed) {
    return NextResponse.json({ success: false, error: access.error }, { status: access.status });
  }

  const { searchParams } = new URL(request.url);
  const channelId = searchParams.get('channelId');

  if (!channelId) {
    return NextResponse.json(
      { success: false, error: 'channelId is required' },
      { status: 400 }
    );
  }

  try {
    const result = await deleteGuildChannel(guildId, channelId);
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
