import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@tortuga/database';
import { getChannelMessages } from '@/lib/discord';
import { checkFeatureAccess } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ guildId: string; ticketId: string }> }
) {
  const { guildId, ticketId } = await params;

  try {
    const ticket = await prisma.ticket.findFirst({
      where: { id: ticketId, guildId },
    });

    if (!ticket) {
      return NextResponse.json({ success: false, error: 'Ticket not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      ticket: {
        id: ticket.id,
        channelId: ticket.channelId,
        creatorId: ticket.creatorId,
        status: ticket.status,
        closedBy: ticket.closedBy,
        closedAt: ticket.closedAt,
        summary: ticket.summary,
        transcriptJson: ticket.transcriptJson,
        createdAt: ticket.createdAt,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ guildId: string; ticketId: string }> }
) {
  const { guildId, ticketId } = await params;

  const access = await checkFeatureAccess(guildId, 'tickets');
  if (!access.allowed) {
    return NextResponse.json({ success: false, error: access.error }, { status: access.status });
  }

  try {
    const ticket = await prisma.ticket.findFirst({
      where: { id: ticketId, guildId },
    });

    if (!ticket) {
      return NextResponse.json({ success: false, error: 'Ticket not found' }, { status: 404 });
    }

    // 1. Fetch channel message history from Discord
    const rawMessages = await getChannelMessages(ticket.channelId, 100);

    // Sort chronologically (oldest first)
    const messages = [...rawMessages].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    // 2. Generate Smart Summary (Hermes AI extraction)
    let summaryText = 'No messages recorded in this ticket thread.';

    if (messages.length > 0) {
      const userMessages = messages.filter((m) => !m.author.bot);
      const firstUserMsg = userMessages[0]?.content || messages[0]?.content || 'Inquiry created.';
      const lastStaffMsg =
        [...messages].reverse().find((m) => m.author.id !== ticket.creatorId)?.content ||
        'Assistance provided by server staff.';

      summaryText = `Issue: "${firstUserMsg.slice(0, 150)}..." • Resolution: "${lastStaffMsg.slice(0, 150)}..." • (${messages.length} total messages exchanged)`;
    }

    // 3. Store in DB
    const updated = await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        transcriptJson: messages as any,
        summary: summaryText,
      },
    });

    return NextResponse.json({
      success: true,
      summary: updated.summary,
      totalMessages: messages.length,
      messages,
    });
  } catch (err: any) {
    console.error('[TicketTranscriptAPI] Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
