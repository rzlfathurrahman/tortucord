import { NextRequest, NextResponse } from 'next/server';
import { getBotGuilds, getGuildChannels, sendChannelMessage } from '@/lib/discord';
import { getPlatformSession, getDiscordSession, getUserAuthorizedGuilds } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [platformUser, discordSession, authGuilds] = await Promise.all([
      getPlatformSession(),
      getDiscordSession(),
      getUserAuthorizedGuilds(),
    ]);

    // 1. Authentication check
    if (!platformUser && !discordSession) {
      return NextResponse.json(
        { success: false, error: 'Authentication required. Please sign in.' },
        { status: 401 }
      );
    }

    // 2. Authorization check: must be Superadmin or Server Owner / assigned user
    if (!authGuilds.isSuperadmin && !authGuilds.canBroadcast) {
      return NextResponse.json(
        {
          success: false,
          error: 'Access denied: Cross-Server Broadcast is restricted to Superadmin and Server Owners.',
        },
        { status: 403 }
      );
    }

    const botGuilds = await getBotGuilds();

    // 3. Multi-tenant scoping: Superadmin sees all; server owners only see their authorized guilds
    const allowedGuilds = authGuilds.isSuperadmin
      ? botGuilds
      : botGuilds.filter((g) => authGuilds.broadcastGuildIds.has(g.id));

    if (allowedGuilds.length === 0) {
      return NextResponse.json({
        success: true,
        servers: [],
      });
    }

    // Gather authorized guilds and their text channels
    const serversWithChannels = await Promise.all(
      allowedGuilds.map(async (g) => {
        const channels = await getGuildChannels(g.id);
        const textOnly = channels
          .filter((c) => c.type === 'text' || c.type === 'announcement')
          .map((c) => ({
            id: c.id,
            name: c.name,
            type: c.type,
            isAnnouncement: c.type === 'announcement' || c.name.includes('announc') || c.name.includes('news'),
          }));

        return {
          id: g.id,
          name: g.name,
          icon: g.icon,
          channels: textOnly,
        };
      })
    );

    return NextResponse.json({
      success: true,
      servers: serversWithChannels,
    });
  } catch (err: any) {
    console.error('[BroadcastAPI] GET Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const [platformUser, discordSession, authGuilds] = await Promise.all([
      getPlatformSession(),
      getDiscordSession(),
      getUserAuthorizedGuilds(),
    ]);

    // 1. Authentication check
    if (!platformUser && !discordSession) {
      return NextResponse.json(
        { success: false, error: 'Authentication required. Please sign in.' },
        { status: 401 }
      );
    }

    // 2. Authorization check
    if (!authGuilds.isSuperadmin && !authGuilds.canBroadcast) {
      return NextResponse.json(
        {
          success: false,
          error: 'Access denied: Cross-Server Broadcast is restricted to Superadmin and Server Owners.',
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      targets,
      title,
      message,
      color = 0x10b981,
      mention = 'none',
      footer = 'Sent via Tortuga Broadcast Console',
    } = body;

    if (!Array.isArray(targets) || targets.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one target channel is required' },
        { status: 400 }
      );
    }

    if (!message || !message.trim()) {
      return NextResponse.json(
        { success: false, error: 'Broadcast message content is required' },
        { status: 400 }
      );
    }

    // 3. Security validation: Verify user has permission for every target guild
    if (!authGuilds.isSuperadmin) {
      for (const t of targets) {
        if (!authGuilds.broadcastGuildIds.has(t.guildId)) {
          return NextResponse.json(
            {
              success: false,
              error: `Access denied: You do not have permission to broadcast to guild ${t.guildId}. Broadcast targets are strictly limited to servers you own or manage.`,
            },
            { status: 403 }
          );
        }
      }
    }

    let mentionPrefix = '';
    if (mention === 'everyone') mentionPrefix = '@everyone\n';
    if (mention === 'here') mentionPrefix = '@here\n';

    const embedPayload: any = {
      description: message.trim(),
      color: Number(color) || 0x10b981,
      footer: { text: footer },
      timestamp: new Date().toISOString(),
    };

    if (title && title.trim()) {
      embedPayload.title = title.trim();
    }

    const results: Array<{
      guildId: string;
      channelId: string;
      success: boolean;
      messageId?: string;
      error?: string;
    }> = [];

    let sentCount = 0;
    let failCount = 0;

    for (const t of targets) {
      const sendResult = await sendChannelMessage(t.channelId, {
        content: mentionPrefix || undefined,
        embeds: [embedPayload],
      });

      if (sendResult.success) {
        sentCount++;
        results.push({
          guildId: t.guildId,
          channelId: t.channelId,
          success: true,
          messageId: sendResult.messageId,
        });
      } else {
        failCount++;
        results.push({
          guildId: t.guildId,
          channelId: t.channelId,
          success: false,
          error: sendResult.error,
        });
      }
    }

    return NextResponse.json({
      success: true,
      sentCount,
      failCount,
      results,
    });
  } catch (err: any) {
    console.error('[BroadcastAPI] POST Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
