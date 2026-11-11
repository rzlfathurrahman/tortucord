import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@tortuga/database';
import { checkFeatureAccess, getSession, getPlatformSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.trim() || '';
  const guildId = searchParams.get('guildId')?.trim() || '';

  // Return empty if query is too short
  if (!q || q.length < 2) {
    return NextResponse.json({ success: true, results: [] });
  }

  const [session, platformUser] = await Promise.all([
    getSession(),
    getPlatformSession(),
  ]);

  // Reject unauthenticated requests
  if (!session && !platformUser) {
    return NextResponse.json(
      { success: false, error: 'Authentication required' },
      { status: 401 }
    );
  }

  // If guildId is provided, verify access
  if (guildId) {
    const access = await checkFeatureAccess(guildId, 'settings');
    if (!access.allowed) {
      return NextResponse.json({ success: false, error: access.error }, { status: access.status });
    }
  }

  try {
    const results: Array<{
      id: string;
      title: string;
      subtitle: string;
      type: 'command' | 'knowledge' | 'ticket' | 'schedule' | 'workflow' | 'webhook';
      url: string;
      badge?: string;
    }> = [];

    if (guildId) {
      const [commands, knowledgeDocs, tickets, schedules, workflows, webhooks] =
        await Promise.all([
          prisma.customCommand.findMany({
            where: {
              guildId,
              OR: [
                { name: { contains: q, mode: 'insensitive' } },
                { description: { contains: q, mode: 'insensitive' } },
              ],
            },
            take: 5,
            select: { id: true, name: true, description: true, isSlash: true },
          }),
          prisma.knowledgeDoc.findMany({
            where: {
              guildId,
              OR: [
                { title: { contains: q, mode: 'insensitive' } },
                { content: { contains: q, mode: 'insensitive' } },
              ],
            },
            take: 5,
            select: { id: true, title: true, category: true },
          }),
          prisma.ticket.findMany({
            where: {
              guildId,
              OR: [
                { summary: { contains: q, mode: 'insensitive' } },
                { channelId: { contains: q, mode: 'insensitive' } },
                { status: { contains: q, mode: 'insensitive' } },
              ],
            },
            take: 5,
            select: { id: true, status: true, summary: true, channelId: true },
          }),
          prisma.scheduledMessage.findMany({
            where: {
              guildId,
              OR: [
                { name: { contains: q, mode: 'insensitive' } },
                { content: { contains: q, mode: 'insensitive' } },
              ],
            },
            take: 5,
            select: { id: true, name: true, cronSchedule: true },
          }),
          prisma.actionWorkflow.findMany({
            where: {
              guildId,
              OR: [
                { name: { contains: q, mode: 'insensitive' } },
                { description: { contains: q, mode: 'insensitive' } },
              ],
            },
            take: 5,
            select: { id: true, name: true, isActive: true },
          }),
          prisma.inboundWebhook.findMany({
            where: {
              guildId,
              name: { contains: q, mode: 'insensitive' },
            },
            take: 5,
            select: { id: true, name: true, provider: true },
          }),
        ]);

      // Map commands
      commands.forEach((cmd) => {
        results.push({
          id: `cmd-${cmd.id}`,
          title: cmd.isSlash ? `/${cmd.name}` : `!${cmd.name}`,
          subtitle: cmd.description || 'Custom command',
          type: 'command',
          url: `/dashboard/${guildId}/commands`,
          badge: cmd.isSlash ? 'Slash' : 'Prefix',
        });
      });

      // Map knowledge docs
      knowledgeDocs.forEach((doc) => {
        results.push({
          id: `doc-${doc.id}`,
          title: doc.title,
          subtitle: `Hermes AI Knowledge Base • ${doc.category}`,
          type: 'knowledge',
          url: `/dashboard/${guildId}/knowledge`,
          badge: doc.category,
        });
      });

      // Map tickets
      tickets.forEach((t) => {
        results.push({
          id: `ticket-${t.id}`,
          title: t.summary || `Ticket #${t.id.slice(-4)}`,
          subtitle: `Status: ${t.status} • Channel ID: ${t.channelId}`,
          type: 'ticket',
          url: `/dashboard/${guildId}/tickets`,
          badge: t.status,
        });
      });

      // Map schedules
      schedules.forEach((s) => {
        results.push({
          id: `sch-${s.id}`,
          title: s.name,
          subtitle: `Cron: ${s.cronSchedule}`,
          type: 'schedule',
          url: `/dashboard/${guildId}/schedules`,
          badge: 'Scheduled',
        });
      });

      // Map workflows
      workflows.forEach((w) => {
        results.push({
          id: `wf-${w.id}`,
          title: w.name,
          subtitle: w.isActive ? 'Active automation flow' : 'Disabled automation flow',
          type: 'workflow',
          url: `/dashboard/${guildId}/workflows`,
          badge: w.isActive ? 'Active' : 'Disabled',
        });
      });

      // Map webhooks
      webhooks.forEach((wh) => {
        results.push({
          id: `wh-${wh.id}`,
          title: wh.name,
          subtitle: `Inbound Webhook Gateway (${wh.provider})`,
          type: 'webhook',
          url: `/dashboard/${guildId}/webhooks`,
          badge: wh.provider,
        });
      });
    }

    return NextResponse.json({ success: true, results });
  } catch (err: any) {
    console.error('[SearchAPI] Error searching entities:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
