import { NextRequest, NextResponse } from 'next/server';
import { prisma, getOrCreateGuild } from '@tortuga/database';
import { checkFeatureAccess } from '@/lib/auth';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const { guildId } = await params;

  try {
    await getOrCreateGuild(guildId);
    let cfg = await prisma.levelingConfig.findUnique({
      where: { guildId },
      include: { rewards: true },
    });

    if (!cfg) {
      cfg = await prisma.levelingConfig.create({
        data: {
          guildId,
          enabled: true,
          xpRateMultiplier: 1.0,
          cooldownSec: 60,
          levelUpMessage: 'GG {user}! You just leveled up to **Level {level}**! 🎉',
        },
        include: { rewards: true },
      });
    }

    // Fetch real top 5 chatters from DB
    const topXpUsers = await prisma.userGuildXp.findMany({
      where: { guildId },
      orderBy: { xp: 'desc' },
      take: 5,
    });

    const leaderboardPreview = topXpUsers.map((u, index) => ({
      id: u.userId,
      userId: u.userId,
      username: `User ${u.userId.slice(-4)}`,
      displayName: `User ${u.userId.slice(-4)}`,
      avatar: 'https://cdn.discordapp.com/embed/avatars/0.png',
      xp: Number(u.xp),
      level: u.level,
      messageCount: u.messagesCount,
      rank: index + 1,
    }));

    const config = {
      guildId,
      enabled: cfg.enabled,
      xpMultiplier: cfg.xpRateMultiplier,
      xpCooldownSeconds: cfg.cooldownSec,
      announcementChannelId: cfg.levelUpChannelId || '',
      levelUpMessage: cfg.levelUpMessage || 'GG {user}, you leveled up to {level}!',
      ignoredChannelIds: cfg.noXpChannels,
      roleRewards: cfg.rewards.map((r) => ({
        id: r.id,
        level: r.level,
        roleId: r.roleId,
        roleName: `@Level ${r.level}`,
        roleColor: '#10b981',
      })),
    };

    return NextResponse.json({
      success: true,
      config,
      leaderboardPreview,
    });
  } catch (err) {
    console.error('[LevelingAPI] Database error:', err);
    return NextResponse.json({
      success: false,
      config: {
        guildId,
        enabled: true,
        xpMultiplier: 1.0,
        xpCooldownSeconds: 60,
        announcementChannelId: '',
        levelUpMessage: 'GG {user}, you leveled up to {level}!',
        ignoredChannelIds: [],
        roleRewards: [],
      },
      leaderboardPreview: [],
    });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const { guildId } = await params;

  const access = await checkFeatureAccess(guildId, 'leveling');
  if (!access.allowed) {
    return NextResponse.json({ success: false, error: access.error }, { status: access.status });
  }

  const updates = await request.json();

  try {
    await getOrCreateGuild(guildId);
    await prisma.levelingConfig.upsert({
      where: { guildId },
      update: {
        enabled: updates.enabled !== undefined ? updates.enabled : undefined,
        xpRateMultiplier: updates.xpMultiplier !== undefined ? updates.xpMultiplier : undefined,
        cooldownSec: updates.xpCooldownSeconds !== undefined ? updates.xpCooldownSeconds : undefined,
        levelUpChannelId: updates.announcementChannelId || null,
        levelUpMessage: updates.levelUpMessage || undefined,
        noXpChannels: updates.ignoredChannelIds || undefined,
      },
      create: {
        guildId,
        enabled: updates.enabled ?? true,
        xpRateMultiplier: updates.xpMultiplier ?? 1.0,
        cooldownSec: updates.xpCooldownSeconds ?? 60,
        levelUpChannelId: updates.announcementChannelId || null,
        levelUpMessage: updates.levelUpMessage || undefined,
        noXpChannels: updates.ignoredChannelIds ?? [],
      },
    });

    return NextResponse.json({
      success: true,
      config: { ...updates, guildId },
    });
  } catch (err) {
    console.error('[LevelingAPI] Save error:', err);
    return NextResponse.json({
      success: true,
      config: { ...updates, guildId },
    });
  }
}
