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
    let starboard = await prisma.starboardConfig.findUnique({
      where: { guildId },
    });

    if (!starboard) {
      starboard = await prisma.starboardConfig.create({
        data: {
          guildId,
          enabled: true,
          threshold: 5,
          emoji: '⭐',
          selfStar: false,
        },
      });
    }

    return NextResponse.json({
      success: true,
      config: {
        suggestionsChannel: '',
        upvoteEmoji: '👍',
        downvoteEmoji: '👎',
        autoReactions: true,
        modApprovalRequired: false,
        starboardEnabled: starboard.enabled,
        starboardChannel: starboard.channelId || '',
        starThreshold: starboard.threshold,
        allowSelfStar: starboard.selfStar,
      },
    });
  } catch (err) {
    console.error('[SuggestionsAPI] Error:', err);
    return NextResponse.json({
      success: true,
      config: {
        suggestionsChannel: '',
        upvoteEmoji: '👍',
        downvoteEmoji: '👎',
        autoReactions: true,
        modApprovalRequired: false,
        starboardEnabled: true,
        starboardChannel: '',
        starThreshold: 5,
        allowSelfStar: false,
      },
    });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const { guildId } = await params;

  const access = await checkFeatureAccess(guildId, 'suggestions');
  if (!access.allowed) {
    return NextResponse.json({ success: false, error: access.error }, { status: access.status });
  }

  const body = await request.json();

  try {
    await getOrCreateGuild(guildId);
    await prisma.starboardConfig.upsert({
      where: { guildId },
      update: {
        enabled: body.starboardEnabled !== undefined ? body.starboardEnabled : undefined,
        channelId: body.starboardChannel || null,
        threshold: body.starThreshold !== undefined ? body.starThreshold : undefined,
        selfStar: body.allowSelfStar !== undefined ? body.allowSelfStar : undefined,
      },
      create: {
        guildId,
        enabled: body.starboardEnabled ?? true,
        channelId: body.starboardChannel || null,
        threshold: body.starThreshold ?? 5,
        selfStar: body.allowSelfStar ?? false,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Suggestions and starboard settings saved',
    });
  } catch (err) {
    console.error('[SuggestionsAPI] Update error:', err);
    return NextResponse.json({ success: false, error: 'Failed to save settings' }, { status: 500 });
  }
}
