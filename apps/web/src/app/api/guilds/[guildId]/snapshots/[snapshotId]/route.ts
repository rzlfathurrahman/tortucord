import { NextRequest, NextResponse } from 'next/server';
import { prisma, getOrCreateGuild } from '@tortuga/database';
import { getGuildChannels, createGuildChannel } from '@/lib/discord';
import { checkFeatureAccess } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ guildId: string; snapshotId: string }> }
) {
  const { guildId, snapshotId } = await params;

  try {
    const snapshot = await prisma.serverSnapshot.findFirst({
      where: { id: snapshotId, guildId },
    });

    if (!snapshot) {
      return NextResponse.json({ success: false, error: 'Snapshot not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, snapshot });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ guildId: string; snapshotId: string }> }
) {
  const { guildId, snapshotId } = await params;

  const access = await checkFeatureAccess(guildId, 'snapshots');
  if (!access.allowed) {
    return NextResponse.json({ success: false, error: access.error }, { status: access.status });
  }

  try {
    const snapshot = await prisma.serverSnapshot.findFirst({
      where: { id: snapshotId, guildId },
    });

    if (!snapshot) {
      return NextResponse.json({ success: false, error: 'Snapshot not found' }, { status: 404 });
    }

    const data = (snapshot.data as any) || {};
    const snapshotChannels = Array.isArray(data.channels) ? data.channels : [];

    // 1. Check existing Discord channels
    const currentChannels = await getGuildChannels(guildId);
    const existingNames = new Set(currentChannels.map((c) => c.name.toLowerCase()));

    let channelsCreated = 0;
    const categoryMap = new Map<string, string>(); // oldParentId -> newCategoryId

    // First pass: restore missing categories
    const categories = snapshotChannels.filter((c: any) => c.type === 'category' || c.type === 4);
    for (const cat of categories) {
      const existing = currentChannels.find(
        (c) => c.type === 'category' && c.name.toLowerCase() === cat.name.toLowerCase()
      );
      if (!existing) {
        const res = await createGuildChannel(guildId, {
          name: cat.name,
          type: 'category',
        });
        if (res.success && res.channel) {
          categoryMap.set(cat.id, res.channel.id);
          channelsCreated++;
        }
      } else {
        categoryMap.set(cat.id, existing.id);
      }
    }

    // Second pass: restore missing text & voice channels
    const nonCategories = snapshotChannels.filter((c: any) => c.type !== 'category' && c.type !== 4);
    for (const ch of nonCategories) {
      if (!existingNames.has(ch.name.toLowerCase())) {
        const newParentId = ch.parentId ? categoryMap.get(ch.parentId) : undefined;
        const res = await createGuildChannel(guildId, {
          name: ch.name,
          type: ch.type === 'voice' || ch.type === 2 ? 'voice' : 'text',
          parentId: newParentId,
          topic: ch.topic || undefined,
        });
        if (res.success) {
          channelsCreated++;
        }
      }
    }

    // 2. Restore DB Configurations
    await getOrCreateGuild(guildId);
    let modulesRestored = 0;

    if (data.automodConfig) {
      await prisma.automodConfig.upsert({
        where: { guildId },
        update: {
          antiSpam: Boolean(data.automodConfig.antiSpam),
          antiInvite: Boolean(data.automodConfig.antiInvite || data.automodConfig.antiInvites),
          antiLink: Boolean(data.automodConfig.antiLink || data.automodConfig.antiLinks),
          bannedWords: data.automodConfig.bannedWords || [],
        },
        create: {
          guildId,
          antiSpam: Boolean(data.automodConfig.antiSpam),
          antiInvite: Boolean(data.automodConfig.antiInvite || data.automodConfig.antiInvites),
          antiLink: Boolean(data.automodConfig.antiLink || data.automodConfig.antiLinks),
          bannedWords: data.automodConfig.bannedWords || [],
        },
      });
      modulesRestored++;
    }

    if (data.onboardingConfig) {
      await prisma.onboardingConfig.upsert({
        where: { guildId },
        update: {
          welcomeEnabled: data.onboardingConfig.welcomeEnabled,
          welcomeMessage: data.onboardingConfig.welcomeMessage,
          goodbyeEnabled: data.onboardingConfig.goodbyeEnabled,
          goodbyeMessage: data.onboardingConfig.goodbyeMessage,
        },
        create: {
          guildId,
          welcomeEnabled: data.onboardingConfig.welcomeEnabled,
          welcomeMessage: data.onboardingConfig.welcomeMessage,
          goodbyeEnabled: data.onboardingConfig.goodbyeEnabled,
          goodbyeMessage: data.onboardingConfig.goodbyeMessage,
        },
      });
      modulesRestored++;
    }

    if (data.levelingConfig) {
      await prisma.levelingConfig.upsert({
        where: { guildId },
        update: {
          enabled: Boolean(data.levelingConfig.enabled),
          xpRateMultiplier: Number(data.levelingConfig.xpRateMultiplier) || 1.0,
          levelUpMessage: data.levelingConfig.levelUpMessage,
        },
        create: {
          guildId,
          enabled: Boolean(data.levelingConfig.enabled),
          xpRateMultiplier: Number(data.levelingConfig.xpRateMultiplier) || 1.0,
          levelUpMessage: data.levelingConfig.levelUpMessage,
        },
      });
      modulesRestored++;
    }

    return NextResponse.json({
      success: true,
      message: `Snapshot "${snapshot.name}" restored successfully!`,
      restored: {
        channelsCreated,
        modulesRestored,
      },
    });
  } catch (err: any) {
    console.error('[SnapshotsAPI] Restore Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ guildId: string; snapshotId: string }> }
) {
  const { guildId, snapshotId } = await params;

  const access = await checkFeatureAccess(guildId, 'snapshots');
  if (!access.allowed) {
    return NextResponse.json({ success: false, error: access.error }, { status: access.status });
  }

  try {
    await prisma.serverSnapshot.deleteMany({
      where: { id: snapshotId, guildId },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
