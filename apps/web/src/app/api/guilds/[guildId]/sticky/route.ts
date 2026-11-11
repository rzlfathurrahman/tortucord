import { NextRequest, NextResponse } from 'next/server';
import { prisma, getOrCreateGuild } from '@tortuga/database';
import { StickyMessage } from '@/lib/types';
import { checkFeatureAccess } from '@/lib/auth';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const { guildId } = await params;

  try {
    await getOrCreateGuild(guildId);
    const dbStickies = await prisma.stickyMessage.findMany({
      where: { guildId },
      orderBy: { createdAt: 'desc' },
    });

    const stickies: StickyMessage[] = dbStickies.map((s) => ({
      id: s.id,
      guildId: s.guildId,
      channelId: s.channelId,
      content: s.content,
      enabled: s.isActive,
      cooldownSeconds: s.cooldownSec,
      lastPostedAt: s.updatedAt.toISOString(),
    }));

    return NextResponse.json({
      success: true,
      stickyMessages: stickies,
    });
  } catch (err) {
    console.error('[StickyAPI] Database error:', err);
    return NextResponse.json({
      success: false,
      stickyMessages: [],
    });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const { guildId } = await params;

  const access = await checkFeatureAccess(guildId, 'sticky');
  if (!access.allowed) {
    return NextResponse.json({ success: false, error: access.error }, { status: access.status });
  }

  const body = await request.json();

  try {
    await getOrCreateGuild(guildId);
    const created = await prisma.stickyMessage.upsert({
      where: {
        guildId_channelId: {
          guildId,
          channelId: body.channelId || '1252146820725997628',
        },
      },
      update: {
        content: body.content || '',
        cooldownSec: body.cooldownSeconds ?? 10,
        isActive: body.enabled ?? true,
      },
      create: {
        guildId,
        channelId: body.channelId || '1252146820725997628',
        content: body.content || '',
        cooldownSec: body.cooldownSeconds ?? 10,
        isActive: body.enabled ?? true,
      },
    });

    const formatted: StickyMessage = {
      id: created.id,
      guildId: created.guildId,
      channelId: created.channelId,
      content: created.content,
      enabled: created.isActive,
      cooldownSeconds: created.cooldownSec,
      lastPostedAt: created.updatedAt.toISOString(),
    };

    return NextResponse.json({
      success: true,
      stickyMessage: formatted,
    });
  } catch (err) {
    console.error('[StickyAPI] Create error:', err);
    return NextResponse.json({
      success: false,
      error: 'Failed to create sticky message',
    }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const { guildId } = await params;

  const access = await checkFeatureAccess(guildId, 'sticky');
  if (!access.allowed) {
    return NextResponse.json({ success: false, error: access.error }, { status: access.status });
  }

  const body = await request.json();

  try {
    const updated = await prisma.stickyMessage.update({
      where: { id: body.id },
      data: {
        content: body.content !== undefined ? body.content : undefined,
        cooldownSec: body.cooldownSeconds !== undefined ? body.cooldownSeconds : undefined,
        isActive: body.enabled !== undefined ? body.enabled : undefined,
      },
    });

    return NextResponse.json({
      success: true,
      stickyMessage: {
        id: updated.id,
        guildId: updated.guildId,
        channelId: updated.channelId,
        content: updated.content,
        enabled: updated.isActive,
        cooldownSeconds: updated.cooldownSec,
        lastPostedAt: updated.updatedAt.toISOString(),
      },
    });
  } catch (err) {
    console.error('[StickyAPI] Update error:', err);
    return NextResponse.json({ success: false, error: 'Update failed' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const { guildId } = await params;

  const access = await checkFeatureAccess(guildId, 'sticky');
  if (!access.allowed) {
    return NextResponse.json({ success: false, error: access.error }, { status: access.status });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (id) {
    try {
      await prisma.stickyMessage.delete({ where: { id } }).catch(() => null);
    } catch {
      // ignore error
    }
  }

  return NextResponse.json({
    success: true,
    deletedId: id,
  });
}
