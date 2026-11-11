import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@tortuga/database';
import { WeblogEntry } from '@/lib/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const { guildId } = await params;
  const { searchParams } = new URL(request.url);
  const actionType = searchParams.get('actionType');
  const query = searchParams.get('query')?.toLowerCase();

  try {
    const dbLogs = await prisma.weblogEntry.findMany({
      where: {
        guildId,
        eventType: actionType && actionType !== 'ALL' ? actionType : undefined,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const logs: WeblogEntry[] = dbLogs.map((entry) => {
      const details = (entry.detailsJson as any) || {};
      return {
        id: entry.id,
        guildId: entry.guildId,
        actionType: (entry.eventType as any) || 'MESSAGE_DELETE',
        moderator: {
          id: entry.actorId,
          name: details.actorName || `Mod (${entry.actorId.slice(-4)})`,
          avatar: details.actorAvatar || 'https://cdn.discordapp.com/embed/avatars/1.png',
        },
        target: entry.targetId
          ? {
              id: entry.targetId,
              name: details.targetName || `User (${entry.targetId.slice(-4)})`,
              avatar: details.targetAvatar || 'https://cdn.discordapp.com/embed/avatars/0.png',
            }
          : undefined,
        channel: details.channelId
          ? {
              id: details.channelId,
              name: details.channelName || 'general',
            }
          : undefined,
        reason: details.reason || undefined,
        details,
        timestamp: entry.createdAt.toISOString(),
      };
    });

    let filtered = logs;
    if (query) {
      filtered = logs.filter(
        (log) =>
          log.moderator.name.toLowerCase().includes(query) ||
          log.target?.name.toLowerCase().includes(query) ||
          log.reason?.toLowerCase().includes(query)
      );
    }

    return NextResponse.json({
      success: true,
      logs: filtered,
      total: filtered.length,
    });
  } catch (err) {
    console.error('[WeblogsAPI] Error fetching logs from DB:', err);
    return NextResponse.json({
      success: true,
      logs: [],
      total: 0,
    });
  }
}
