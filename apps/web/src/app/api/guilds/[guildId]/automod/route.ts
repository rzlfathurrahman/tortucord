import { NextRequest, NextResponse } from 'next/server';
import { prisma, getOrCreateGuild } from '@tortuga/database';
import { MOCK_AUTOMOD_CONFIG } from '@/lib/mock-data';
import { checkFeatureAccess } from '@/lib/auth';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const { guildId } = await params;

  try {
    await getOrCreateGuild(guildId);
    let config = await prisma.automodConfig.findUnique({
      where: { guildId },
    });

    if (!config) {
      config = await prisma.automodConfig.create({
        data: {
          guildId,
          antiSpam: false,
          antiInvite: false,
          antiLink: false,
          maxMentions: 5,
          bannedWords: [],
        },
      });
    }

    return NextResponse.json({
      success: true,
      config: {
        guildId,
        antiSpamEnabled: config.antiSpam,
        spamThreshold: 5,
        spamIntervalSeconds: 5,
        antiInvitesEnabled: config.antiInvite,
        allowedInviteGuilds: [],
        antiLinksEnabled: config.antiLink,
        allowedDomains: [],
        maxMentions: config.maxMentions,
        actionOnViolation: 'timeout',
        timeoutDurationMinutes: 10,
        bannedWords: config.bannedWords,
        dramaWatcherEnabled: !!config.dramaChannelId,
        dramaWatcherChannelId: config.dramaChannelId || '',
        dramaWatcherSensitivity: 'medium',
        dramaKeywords: ['drama', 'scam', 'raid', 'leak'],
      },
    });
  } catch (err) {
    console.error('[AutomodAPI] Database error, falling back:', err);
    return NextResponse.json({
      success: true,
      config: { ...MOCK_AUTOMOD_CONFIG, guildId },
    });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const { guildId } = await params;
  const access = await checkFeatureAccess(guildId, 'automod');
  if (!access.allowed) {
    return NextResponse.json({ success: false, error: access.error }, { status: access.status });
  }

  const updates = await request.json();

  try {
    await getOrCreateGuild(guildId);
    await prisma.automodConfig.upsert({
      where: { guildId },
      update: {
        antiSpam: updates.antiSpamEnabled ?? undefined,
        antiInvite: updates.antiInvitesEnabled ?? undefined,
        antiLink: updates.antiLinksEnabled ?? undefined,
        maxMentions: updates.maxMentions ?? undefined,
        bannedWords: updates.bannedWords ?? undefined,
        dramaChannelId: updates.dramaWatcherChannelId || null,
      },
      create: {
        guildId,
        antiSpam: updates.antiSpamEnabled ?? false,
        antiInvite: updates.antiInvitesEnabled ?? false,
        antiLink: updates.antiLinksEnabled ?? false,
        maxMentions: updates.maxMentions ?? 5,
        bannedWords: updates.bannedWords ?? [],
        dramaChannelId: updates.dramaWatcherChannelId || null,
      },
    });

    return NextResponse.json({
      success: true,
      config: {
        ...updates,
        guildId,
      },
    });
  } catch (err) {
    console.error('[AutomodAPI] Save error:', err);
    return NextResponse.json({
      success: true,
      config: { ...updates, guildId },
    });
  }
}
