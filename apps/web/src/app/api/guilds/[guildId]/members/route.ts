import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@tortuga/database';
import { checkFeatureAccess } from '@/lib/auth';
import { getGuildMembers } from '@/lib/discord';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  try {
    const { guildId } = await params;
    const access = await checkFeatureAccess(guildId, 'members');
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const { searchParams } = new URL(req.url);
    const search = (searchParams.get('search') || '').toLowerCase().trim();
    const filter = searchParams.get('filter') || 'all'; // all | ghost | staff | timeout | infractions

    // 1. Fetch Discord members
    const discordMembers = await getGuildMembers(guildId, 1000);

    // 2. Fetch database enrichment (XP/Activity, Infractions, Tickets)
    const [xpRecords, infractions, tickets] = await Promise.all([
      prisma.userGuildXp.findMany({
        where: { guildId },
      }),
      prisma.infraction.findMany({
        where: { guildId },
      }),
      prisma.ticket.findMany({
        where: { guildId },
      }),
    ]);

    const xpMap = new Map<string, any>();
    xpRecords.forEach((x) => xpMap.set(x.userId, x));

    const infractionCountMap = new Map<string, number>();
    infractions.forEach((inf) => {
      infractionCountMap.set(inf.userId, (infractionCountMap.get(inf.userId) || 0) + 1);
    });

    const ticketCountMap = new Map<string, number>();
    tickets.forEach((t) => {
      ticketCountMap.set(t.creatorId, (ticketCountMap.get(t.creatorId) || 0) + 1);
    });

    const now = Date.now();
    const fourteenDaysAgo = now - 14 * 24 * 60 * 60 * 1000;
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

    let activeCount = 0;
    let ghostCount = 0;
    let flaggedCount = 0;

    // 3. Map & Enrich
    const enrichedMembers = discordMembers.map((m) => {
      const xpData = xpMap.get(m.user.id);
      const infractionCount = infractionCountMap.get(m.user.id) || 0;
      const ticketCount = ticketCountMap.get(m.user.id) || 0;

      const joinedTime = new Date(m.joinedAt).getTime();
      const lastMsgTime = xpData?.lastMessageAt ? new Date(xpData.lastMessageAt).getTime() : 0;
      const messagesCount = xpData?.messagesCount || 0;

      const isTimedOut = Boolean(
        m.communicationDisabledUntil && new Date(m.communicationDisabledUntil).getTime() > now
      );

      // Ghost Member: Joined more than 14 days ago and has sent 0 messages
      const isGhost = joinedTime < fourteenDaysAgo && messagesCount === 0;

      // Active 30d
      const isActive = lastMsgTime > thirtyDaysAgo || (joinedTime > thirtyDaysAgo && messagesCount > 0);

      if (isActive) activeCount++;
      if (isGhost) ghostCount++;
      if (infractionCount > 0 || isTimedOut) flaggedCount++;

      return {
        id: m.user.id,
        username: m.user.username,
        globalName: m.user.globalName,
        avatar: m.user.avatar,
        bot: m.user.bot,
        nick: m.nick,
        roles: m.roles,
        joinedAt: m.joinedAt,
        level: xpData?.level || 0,
        xp: xpData ? Number(xpData.xp) : 0,
        messagesCount,
        lastMessageAt: xpData?.lastMessageAt || null,
        infractionCount,
        ticketCount,
        isTimedOut,
        communicationDisabledUntil: m.communicationDisabledUntil,
        isGhost,
      };
    });

    // 4. Apply Filters
    let filtered = enrichedMembers;

    if (search) {
      filtered = filtered.filter(
        (m) =>
          m.username.toLowerCase().includes(search) ||
          (m.globalName && m.globalName.toLowerCase().includes(search)) ||
          (m.nick && m.nick.toLowerCase().includes(search)) ||
          m.id.includes(search)
      );
    }

    if (filter === 'ghost') {
      filtered = filtered.filter((m) => m.isGhost && !m.bot);
    } else if (filter === 'timeout') {
      filtered = filtered.filter((m) => m.isTimedOut);
    } else if (filter === 'infractions') {
      filtered = filtered.filter((m) => m.infractionCount > 0);
    } else if (filter === 'staff') {
      filtered = filtered.filter((m) => m.roles.length > 0 && !m.bot);
    }

    return NextResponse.json({
      success: true,
      members: filtered.slice(0, 100), // Return top 100 for fast responsiveness
      totalCount: filtered.length,
      metrics: {
        totalMembers: discordMembers.length,
        active30d: activeCount,
        ghostMembers: ghostCount,
        flaggedMembers: flaggedCount,
      },
    });
  } catch (err: any) {
    console.error('[MembersAPI] Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
