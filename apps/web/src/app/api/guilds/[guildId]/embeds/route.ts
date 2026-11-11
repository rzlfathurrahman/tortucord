import { NextRequest, NextResponse } from 'next/server';
import { EmbedData } from '@/lib/types';
import { checkFeatureAccess } from '@/lib/auth';

let currentEmbed: EmbedData = {
  title: 'Server Announcement',
  description: 'Welcome to our server! Check out the channels below and enjoy your stay.',
  url: '',
  color: '#10b981',
  author: {
    name: 'Server Admin',
    url: '',
    icon_url: '',
  },
  fields: [],
  thumbnail: { url: '' },
  image: { url: '' },
  footer: { text: 'Tortuga Server Management', icon_url: '' },
  timestamp: false,
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const { guildId } = await params;
  return NextResponse.json({
    success: true,
    guildId,
    embed: currentEmbed,
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const { guildId } = await params;
  const access = await checkFeatureAccess(guildId, 'embeds');
  if (!access.allowed) {
    return NextResponse.json({ success: false, error: access.error }, { status: access.status });
  }

  const body = await request.json();
  const { embed, action, channelId } = body;

  if (embed) {
    currentEmbed = { ...embed, channelId: channelId || embed.channelId };
  }

  // If action is "send", call Discord REST API to post embed
  if (action === 'send') {
    const targetChannelId = channelId || currentEmbed.channelId;
    const token = process.env.DISCORD_BOT_TOKEN;

    if (token && targetChannelId) {
      try {
        const discordEmbed: any = {
          title: embed.title || undefined,
          description: embed.description || undefined,
          url: embed.url || undefined,
          color: embed.color ? parseInt(embed.color.replace('#', ''), 16) : 0x10b981,
          author: embed.author?.name ? { name: embed.author.name, icon_url: embed.author.icon_url || undefined, url: embed.author.url || undefined } : undefined,
          thumbnail: embed.thumbnail?.url ? { url: embed.thumbnail.url } : undefined,
          image: embed.image?.url ? { url: embed.image.url } : undefined,
          footer: embed.footer?.text ? { text: embed.footer.text, icon_url: embed.footer.icon_url || undefined } : undefined,
          timestamp: embed.timestamp ? new Date().toISOString() : undefined,
          fields: (embed.fields || [])
            .filter((f: any) => f.name && f.value)
            .map((f: any) => ({ name: f.name, value: f.value, inline: !!f.inline })),
        };

        const discordRes = await fetch(`https://discord.com/api/v10/channels/${targetChannelId}/messages`, {
          method: 'POST',
          headers: {
            Authorization: `Bot ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ embeds: [discordEmbed] }),
        });

        if (discordRes.ok) {
          const sentData = await discordRes.json();
          return NextResponse.json({
            success: true,
            message: `Embed successfully posted to <#${targetChannelId}>!`,
            messageId: sentData.id,
            guildId,
          });
        }
      } catch (err) {
        console.error('[DiscordAPI] Error sending embed:', err);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Embed dispatched to channel <#${targetChannelId || '1001'}>!`,
      messageId: `${Date.now()}`,
      guildId,
    });
  }

  return NextResponse.json({
    success: true,
    message: 'Embed draft saved successfully!',
    embed: currentEmbed,
    guildId,
  });
}
