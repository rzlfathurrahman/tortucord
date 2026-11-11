import { NextRequest, NextResponse } from 'next/server';
import { prisma, getOrCreateGuild } from '@tortuga/database';
import { getGuildDetails } from '@/lib/discord';
import { LeaderboardMember } from '@/lib/types';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const { guildId } = await params;
  const guild = await getGuildDetails(guildId);

  try {
    await getOrCreateGuild(guildId);
    const dbXp = await prisma.userGuildXp.findMany({
      where: { guildId },
      orderBy: { xp: 'desc' },
      take: 100,
    });

    if (dbXp.length > 0) {
      const members: LeaderboardMember[] = await Promise.all(
        dbXp.map(async (u, idx) => {
          let username = `User ${u.userId.slice(-4)}`;
          let avatar = 'https://cdn.discordapp.com/embed/avatars/0.png';

          const token = process.env.DISCORD_BOT_TOKEN;
          if (token) {
            try {
              const uRes = await fetch(`https://discord.com/api/v10/users/${u.userId}`, {
                headers: { Authorization: `Bot ${token}` },
                next: { revalidate: 300 },
              });
              if (uRes.ok) {
                const uData = await uRes.json();
                username = uData.global_name || uData.username;
                avatar = uData.avatar
                  ? `https://cdn.discordapp.com/avatars/${uData.id}/${uData.avatar}.png?size=128`
                  : avatar;
              }
            } catch {
              // ignore
            }
          }

          const currentXp = Number(u.xp);
          const level = u.level;
          const currentLevelXp = Math.floor(Math.pow(level / 0.1, 2));
          const nextLevelXp = Math.floor(Math.pow((level + 1) / 0.1, 2));

          return {
            rank: idx + 1,
            id: u.userId,
            username,
            displayName: username,
            avatar,
            level,
            xp: currentXp,
            currentLevelXp,
            nextLevelXp,
            messageCount: u.messagesCount,
            lastActive: u.lastMessageAt ? u.lastMessageAt.toISOString() : 'Recently',
          };
        })
      );

      return NextResponse.json({
        success: true,
        guild,
        members,
        totalTracked: members.length,
      });
    }
  } catch (err) {
    console.error('[LeaderboardAPI] Error fetching XP from DB:', err);
  }

  return NextResponse.json({
    success: true,
    guild,
    members: [],
    totalTracked: 0,
  });
}
