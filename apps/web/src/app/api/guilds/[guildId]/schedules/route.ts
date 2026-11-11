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
    const schedules = await prisma.scheduledMessage.findMany({
      where: { guildId },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ success: true, schedules });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const { guildId } = await params;

  const access = await checkFeatureAccess(guildId, 'schedules');
  if (!access.allowed) {
    return NextResponse.json({ success: false, error: access.error }, { status: access.status });
  }

  const body = await request.json();
  const { action } = body;

  try {
    if (action === 'create') {
      const { name, channelId, cronSchedule, content } = body;
      if (!name || !channelId || !cronSchedule || !content) {
        return NextResponse.json(
          { success: false, error: 'Name, channelId, cronSchedule, and content are required' },
          { status: 400 }
        );
      }

      const schedule = await prisma.scheduledMessage.create({
        data: {
          guildId,
          name,
          channelId,
          cronSchedule,
          content,
          enabled: true,
        },
      });

      return NextResponse.json({ success: true, schedule });
    }

    if (action === 'toggle') {
      const { id, enabled } = body;
      await prisma.scheduledMessage.update({
        where: { id },
        data: { enabled },
      });
      return NextResponse.json({ success: true });
    }

    if (action === 'test') {
      const { id } = body;
      const schedule = await prisma.scheduledMessage.findUnique({ where: { id } });
      if (!schedule) {
        return NextResponse.json({ success: false, error: 'Schedule not found' }, { status: 404 });
      }

      const botToken = process.env.DISCORD_BOT_TOKEN;
      if (!botToken) {
        return NextResponse.json({ success: false, error: 'Bot token missing' }, { status: 500 });
      }

      const res = await fetch(`${DISCORD_API}/channels/${schedule.channelId}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bot ${botToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: schedule.content,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return NextResponse.json({ success: false, error: err.message || 'Discord rejected message' }, { status: 400 });
      }

      await prisma.scheduledMessage.update({
        where: { id },
        data: { lastSentAt: new Date() },
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

  const access = await checkFeatureAccess(guildId, 'schedules');
  if (!access.allowed) {
    return NextResponse.json({ success: false, error: access.error }, { status: access.status });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ success: false, error: 'Schedule id required' }, { status: 400 });
  }

  try {
    await prisma.scheduledMessage.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
