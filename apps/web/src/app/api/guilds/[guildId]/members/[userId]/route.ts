import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@tortuga/database';
import { checkFeatureAccess } from '@/lib/auth';
import { getGuildMembers } from '@/lib/discord';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ guildId: string; userId: string }> }
) {
  try {
    const { guildId, userId } = await params;
    const access = await checkFeatureAccess(guildId, 'members');
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    // 1. Fetch Discord Member
    const allMembers = await getGuildMembers(guildId, 1000);
    const member = allMembers.find((m) => m.user.id === userId);

    // 2. Fetch DB profile data in parallel
    const [xpData, infractions, tickets, notes] = await Promise.all([
      prisma.userGuildXp.findUnique({
        where: { guildId_userId: { guildId, userId } },
      }),
      prisma.infraction.findMany({
        where: { guildId, userId },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.ticket.findMany({
        where: { guildId, creatorId: userId },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.memberNote.findMany({
        where: { guildId, userId },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return NextResponse.json({
      success: true,
      member: member || {
        user: { id: userId, username: 'Unknown User', avatar: null },
        roles: [],
        joinedAt: new Date().toISOString(),
        nick: null,
        communicationDisabledUntil: null,
      },
      activity: {
        level: xpData?.level || 0,
        xp: xpData ? Number(xpData.xp) : 0,
        messagesCount: xpData?.messagesCount || 0,
        voiceMinutes: xpData?.voiceMinutes || 0,
        lastMessageAt: xpData?.lastMessageAt || null,
      },
      infractions,
      tickets,
      notes,
    });
  } catch (err: any) {
    console.error('[Member360API] Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
