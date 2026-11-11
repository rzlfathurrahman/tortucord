import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@tortuga/database';
import { checkFeatureAccess } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const DISCORD_API = 'https://discord.com/api/v10';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const { guildId } = await params;
  try {
    const [config, tickets] = await Promise.all([
      prisma.ticketConfig.findUnique({ where: { guildId } }),
      prisma.ticket.findMany({
        where: { guildId },
        orderBy: { createdAt: 'desc' },
        take: 30,
      }),
    ]);

    return NextResponse.json({
      success: true,
      config: config || {
        guildId,
        enabled: false,
        panelChannelId: null,
        panelTitle: 'Need Assistance? Open a Support Ticket',
        panelDescription:
          'Click the button below to start a private conversation with our server staff.',
        buttonLabel: 'Open Ticket',
        buttonEmoji: '📩',
        supportRoleIds: [],
        transcriptChannelId: null,
      },
      tickets,
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

  const access = await checkFeatureAccess(guildId, 'tickets');
  if (!access.allowed) {
    return NextResponse.json({ success: false, error: access.error }, { status: access.status });
  }

  const body = await request.json();

  try {
    const config = await prisma.ticketConfig.upsert({
      where: { guildId },
      update: {
        enabled: body.enabled ?? false,
        panelChannelId: body.panelChannelId || null,
        panelTitle: body.panelTitle || 'Need Assistance? Open a Support Ticket',
        panelDescription: body.panelDescription || 'Click the button below to start a private conversation.',
        buttonLabel: body.buttonLabel || 'Open Ticket',
        buttonEmoji: body.buttonEmoji || '📩',
        supportRoleIds: body.supportRoleIds || [],
        transcriptChannelId: body.transcriptChannelId || null,
      },
      create: {
        guildId,
        enabled: body.enabled ?? false,
        panelChannelId: body.panelChannelId || null,
        panelTitle: body.panelTitle || 'Need Assistance? Open a Support Ticket',
        panelDescription: body.panelDescription || 'Click the button below to start a private conversation.',
        buttonLabel: body.buttonLabel || 'Open Ticket',
        buttonEmoji: body.buttonEmoji || '📩',
        supportRoleIds: body.supportRoleIds || [],
        transcriptChannelId: body.transcriptChannelId || null,
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

  const access = await checkFeatureAccess(guildId, 'tickets');
  if (!access.allowed) {
    return NextResponse.json({ success: false, error: access.error }, { status: access.status });
  }

  const body = await request.json();
  const { action } = body;

  if (action === 'deploy_panel') {
    const { panelChannelId, panelTitle, panelDescription, buttonLabel, buttonEmoji } = body;
    if (!panelChannelId) {
      return NextResponse.json({ success: false, error: 'panelChannelId is required' }, { status: 400 });
    }

    const botToken = process.env.DISCORD_BOT_TOKEN;
    if (!botToken) {
      return NextResponse.json({ success: false, error: 'Bot token missing' }, { status: 500 });
    }

    const payload = {
      embeds: [
        {
          title: panelTitle || 'Support Portal',
          description: panelDescription || 'Click below to open a private ticket with staff.',
          color: 0x10b981,
          footer: { text: 'Tortuga ModMail & Support Desk' },
        },
      ],
      components: [
        {
          type: 1, // Action Row
          components: [
            {
              type: 2, // Button
              style: 1, // Primary (Blurple/Green)
              label: buttonLabel || 'Open Ticket',
              emoji: buttonEmoji ? { name: buttonEmoji } : undefined,
              custom_id: `ticket_open:${guildId}`,
            },
          ],
        },
      ],
    };

    const res = await fetch(`${DISCORD_API}/channels/${panelChannelId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bot ${botToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return NextResponse.json({ success: false, error: err.message || 'Discord rejected panel' }, { status: 400 });
    }

    const msg = await res.json();
    await prisma.ticketConfig.upsert({
      where: { guildId },
      update: { panelMessageId: msg.id, enabled: true },
      create: { guildId, panelChannelId, panelMessageId: msg.id, enabled: true },
    });

    return NextResponse.json({ success: true, messageId: msg.id });
  }

  return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
}
