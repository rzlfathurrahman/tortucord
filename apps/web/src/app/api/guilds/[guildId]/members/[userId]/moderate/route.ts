import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@tortuga/database';
import { checkFeatureAccess } from '@/lib/auth';
import {
  timeoutGuildMember,
  kickGuildMember,
  addMemberRole,
  removeMemberRole,
} from '@/lib/discord';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ guildId: string; userId: string }> }
) {
  try {
    const { guildId, userId } = await params;
    const access = await checkFeatureAccess(guildId, 'members');
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const body = await req.json();
    const { action, reason = 'Moderation action via Tortuga Dashboard', durationMinutes = 60, roleId } = body;

    let result: { success: boolean; error?: string } = { success: true };

    // Get next case ID
    const lastInfraction = await prisma.infraction.findFirst({
      where: { guildId },
      orderBy: { caseId: 'desc' },
    });
    const nextCaseId = (lastInfraction?.caseId || 0) + 1;

    if (action === 'TIMEOUT') {
      result = await timeoutGuildMember(guildId, userId, durationMinutes, reason);
      if (result.success) {
        await prisma.infraction.create({
          data: {
            guildId,
            caseId: nextCaseId,
            userId,
            modId: 'DASHBOARD_MOD',
            action: 'TIMEOUT',
            reason: `${reason} (${durationMinutes}m)`,
            expiresAt: new Date(Date.now() + durationMinutes * 60 * 1000),
          },
        });
      }
    } else if (action === 'REMOVE_TIMEOUT') {
      result = await timeoutGuildMember(guildId, userId, 0, 'Timeout removed via Dashboard');
    } else if (action === 'WARN') {
      await prisma.infraction.create({
        data: {
          guildId,
          caseId: nextCaseId,
          userId,
          modId: 'DASHBOARD_MOD',
          action: 'WARN',
          reason,
        },
      });
      result = { success: true, error: undefined };
    } else if (action === 'KICK') {
      result = await kickGuildMember(guildId, userId, reason);
      if (result.success) {
        await prisma.infraction.create({
          data: {
            guildId,
            caseId: nextCaseId,
            userId,
            modId: 'DASHBOARD_MOD',
            action: 'KICK',
            reason,
          },
        });
      }
    } else if (action === 'ADD_ROLE' && roleId) {
      result = await addMemberRole(guildId, userId, roleId);
    } else if (action === 'REMOVE_ROLE' && roleId) {
      result = await removeMemberRole(guildId, userId, roleId);
    } else {
      return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
    }

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true, action });
  } catch (err: any) {
    console.error('[MemberModerateAPI] Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
