import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@tortuga/database';
import { checkFeatureAccess } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const { guildId } = await params;
  try {
    const webhooks = await prisma.inboundWebhook.findMany({
      where: { guildId },
      include: {
        logs: {
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, webhooks });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const { guildId } = await params;

  const access = await checkFeatureAccess(guildId, 'webhooks');
  if (!access.allowed) {
    return NextResponse.json({ success: false, error: access.error }, { status: access.status });
  }

  const body = await request.json();
  const { action } = body;

  try {
    if (action === 'create') {
      const { name, targetChannelId, provider } = body;
      if (!name || !targetChannelId) {
        return NextResponse.json(
          { success: false, error: 'Name and targetChannelId are required' },
          { status: 400 }
        );
      }

      const webhook = await prisma.inboundWebhook.create({
        data: {
          guildId,
          name,
          targetChannelId,
          provider: provider || 'generic',
        },
      });

      return NextResponse.json({ success: true, webhook });
    }

    if (action === 'toggle') {
      const { id, isActive } = body;
      await prisma.inboundWebhook.update({
        where: { id },
        data: { isActive },
      });
      return NextResponse.json({ success: true });
    }

    if (action === 'test') {
      const { id } = body;
      const webhook = await prisma.inboundWebhook.findUnique({ where: { id } });
      if (!webhook) {
        return NextResponse.json({ success: false, error: 'Webhook not found' }, { status: 404 });
      }

      const botToken = process.env.DISCORD_BOT_TOKEN;
      if (!botToken) {
        return NextResponse.json({ success: false, error: 'Bot token missing' }, { status: 500 });
      }

      const testPayload = {
        embeds: [
          {
            title: `🧪 Webhook Test: ${webhook.name}`,
            description: `Successfully verified connection from Tortuga Webhook Hub! Provider: **${webhook.provider.toUpperCase()}**`,
            color: 0x10b981,
            fields: [
              { name: 'Channel ID', value: webhook.targetChannelId, inline: true },
              { name: 'Timestamp', value: new Date().toLocaleTimeString(), inline: true },
            ],
            footer: { text: 'Tortuga Central Webhook Gateway' },
            timestamp: new Date().toISOString(),
          },
        ],
      };

      const res = await fetch(`https://discord.com/api/v10/channels/${webhook.targetChannelId}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bot ${botToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testPayload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return NextResponse.json({ success: false, error: err.message || 'Discord rejected message' }, { status: 400 });
      }

      await prisma.webhookLog.create({
        data: {
          webhookId: webhook.id,
          status: 200,
          payloadJson: { type: 'test_dispatch', triggeredAt: new Date().toISOString() },
        },
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const { guildId } = await params;

  const access = await checkFeatureAccess(guildId, 'webhooks');
  if (!access.allowed) {
    return NextResponse.json({ success: false, error: access.error }, { status: access.status });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ success: false, error: 'Webhook id required' }, { status: 400 });
  }

  try {
    await prisma.inboundWebhook.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
