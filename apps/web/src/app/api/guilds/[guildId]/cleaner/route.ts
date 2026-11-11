import { NextRequest, NextResponse } from 'next/server';
import { getChannelMessages, bulkDeleteMessages } from '@/lib/discord';
import { checkFeatureAccess } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const { guildId } = await params;

  const access = await checkFeatureAccess(guildId, 'cleaner');
  if (!access.allowed) {
    return NextResponse.json({ success: false, error: access.error }, { status: access.status });
  }

  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'preview') {
      const {
        channelId,
        limit = 50,
        filterUser,
        keyword,
        onlyBots,
        hasAttachments,
        hasLinks,
      } = body;

      if (!channelId) {
        return NextResponse.json({ success: false, error: 'channelId is required' }, { status: 400 });
      }

      const scanLimit = Math.min(Math.max(Number(limit) || 50, 10), 100);
      const rawMessages = await getChannelMessages(channelId, scanLimit);

      // Filter in memory
      let filtered = rawMessages;

      if (filterUser && filterUser.trim()) {
        const query = filterUser.trim().toLowerCase();
        filtered = filtered.filter(
          (m) =>
            m.author.id === query ||
            m.author.username.toLowerCase().includes(query)
        );
      }

      if (keyword && keyword.trim()) {
        const kw = keyword.trim().toLowerCase();
        filtered = filtered.filter((m) => m.content.toLowerCase().includes(kw));
      }

      if (onlyBots) {
        filtered = filtered.filter((m) => m.author.bot);
      }

      if (hasAttachments) {
        filtered = filtered.filter((m) => m.attachments.length > 0);
      }

      if (hasLinks) {
        const linkRegex = /https?:\/\/[^\s]+/i;
        filtered = filtered.filter((m) => linkRegex.test(m.content));
      }

      return NextResponse.json({
        success: true,
        scannedCount: rawMessages.length,
        matchedCount: filtered.length,
        messages: filtered,
      });
    }

    if (action === 'purge') {
      const { channelId, messageIds } = body;

      if (!channelId || !Array.isArray(messageIds) || messageIds.length === 0) {
        return NextResponse.json(
          { success: false, error: 'channelId and messageIds array are required' },
          { status: 400 }
        );
      }

      const result = await bulkDeleteMessages(channelId, messageIds);
      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error || 'Failed to bulk delete messages' },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        deletedCount: result.deletedCount,
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    console.error('[CleanerAPI] Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
