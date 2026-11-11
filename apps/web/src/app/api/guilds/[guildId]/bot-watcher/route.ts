import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@tortuga/database';
import { getGuildBots } from '@/lib/discord';
import { checkFeatureAccess } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const { guildId } = await params;
  try {
    const [config, bots] = await Promise.all([
      prisma.botWatcherConfig.findUnique({ where: { guildId } }),
      getGuildBots(guildId),
    ]);

    return NextResponse.json({
      success: true,
      config: config || {
        guildId,
        enabled: false,
        monitoredBotIds: [],
        alertChannelId: null,
        alertRoleIds: [],
        alertCooldownMin: 15,
        autoThreadEnabled: false,
        botChannelIds: [],
      },
      bots,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const { guildId } = await params;

  const access = await checkFeatureAccess(guildId, 'bot-watcher');
  if (!access.allowed) {
    return NextResponse.json({ success: false, error: access.error }, { status: access.status });
  }

  const body = await request.json();

  try {
    const config = await prisma.botWatcherConfig.upsert({
      where: { guildId },
      update: {
        enabled: body.enabled ?? false,
        monitoredBotIds: body.monitoredBotIds || [],
        alertChannelId: body.alertChannelId || null,
        alertRoleIds: body.alertRoleIds || [],
        alertCooldownMin: body.alertCooldownMin || 15,
        autoThreadEnabled: body.autoThreadEnabled ?? false,
        botChannelIds: body.botChannelIds || [],
      },
      create: {
        guildId,
        enabled: body.enabled ?? false,
        monitoredBotIds: body.monitoredBotIds || [],
        alertChannelId: body.alertChannelId || null,
        alertRoleIds: body.alertRoleIds || [],
        alertCooldownMin: body.alertCooldownMin || 15,
        autoThreadEnabled: body.autoThreadEnabled ?? false,
        botChannelIds: body.botChannelIds || [],
      },
    });

    return NextResponse.json({ success: true, config });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const { guildId } = await params;

  const access = await checkFeatureAccess(guildId, 'bot-watcher');
  if (!access.allowed) {
    return NextResponse.json({ success: false, error: access.error }, { status: access.status });
  }

  const body = await request.json();

  if (body.action === 'test_alert') {
    const { alertChannelId, botName } = body;
    if (!alertChannelId) {
      return NextResponse.json({ success: false, error: 'alertChannelId is required' }, { status: 400 });
    }

    const botToken = process.env.DISCORD_BOT_TOKEN;
    if (!botToken) {
      return NextResponse.json({ success: false, error: 'Bot token missing' }, { status: 500 });
    }

    const alertPayload = {
      embeds: [
        {
          title: `🚨 [ALERT] Bot Service Outage Detected!`,
          description: `**${botName || 'Hermes Agent'}** is currently **OFFLINE** or failing heartbeats.\nStaff members have been notified.`,
          color: 0xef4444, // Red
          fields: [
            { name: 'Monitored Bot', value: botName || 'Hermes Agent', inline: true },
            { name: 'Status', value: '🔴 OFFLINE', inline: true },
            { name: 'Detected At', value: new Date().toLocaleTimeString(), inline: true },
          ],
          footer: { text: 'Tortuga Bot Watcher & Incident Dispatcher' },
          timestamp: new Date().toISOString(),
        },
      ],
    };

    const res = await fetch(`https://discord.com/api/v10/channels/${alertChannelId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bot ${botToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(alertPayload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return NextResponse.json({ success: false, error: err.message || 'Discord rejected message' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
}
