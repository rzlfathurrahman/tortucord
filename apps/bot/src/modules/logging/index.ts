import {
  Guild,
  TextChannel,
  EmbedBuilder,
  User,
  GuildMember,
  Message,
  PartialMessage,
} from "discord.js";
import { LogEventType } from "@tortuga/config";
import { DatabaseService } from "../../utils/db-fallback.js";
import { EMBED_COLORS } from "../../utils/embed-builder.js";
import { logger } from "../../utils/logger.js";
import type { TortugaClient } from "../../client.js";

export class LoggingModule {
  /**
   * Log an event both to configured Discord audit channel and database weblogs.
   */
  public static async logEvent(
    guild: Guild,
    eventType: LogEventType,
    options: {
      actorId: string;
      targetId?: string;
      title: string;
      description?: string;
      fields?: Array<{ name: string; value: string; inline?: boolean }>;
      color?: number;
      detailsJson?: any;
    },
    client: TortugaClient
  ): Promise<void> {
    // 1. Save to Database Weblogs (persistent Carl-bot style weblogs)
    await DatabaseService.saveWeblog({
      guildId: guild.id,
      eventType,
      actorId: options.actorId,
      targetId: options.targetId,
      detailsJson: options.detailsJson ?? { description: options.description },
    });

    // 2. Fetch Guild Logging Configuration
    const config = await DatabaseService.getLoggingConfig(guild.id);
    if (!config) return;

    // Determine target channel based on event category
    let channelId: string | null = null;

    if (eventType.startsWith("MOD_")) {
      channelId = config.modLogChannelId;
    } else if (eventType.startsWith("MESSAGE_")) {
      channelId = config.messageLogChannelId;
    } else if (eventType.startsWith("MEMBER_")) {
      channelId = config.memberLogChannelId;
    } else if (eventType.startsWith("VOICE_")) {
      channelId = config.voiceLogChannelId;
    } else {
      channelId = config.serverLogChannelId;
    }

    if (!channelId) return;

    const channel = client.channels.cache.get(channelId) as TextChannel | undefined;
    if (!channel || !channel.isTextBased()) return;

    const embed = new EmbedBuilder()
      .setColor(options.color ?? EMBED_COLORS.primaryDark)
      .setTitle(`📋 ${options.title}`)
      .setTimestamp();

    if (options.description) embed.setDescription(options.description);
    if (options.fields && options.fields.length > 0) {
      embed.addFields(options.fields);
    }

    embed.setFooter({ text: `Event: ${eventType}` });

    await channel.send({ embeds: [embed] }).catch((err) =>
      logger.debug(`Failed to send log embed to channel ${channelId}`, err)
    );
  }

  /**
   * Log message deletion.
   */
  public static async logMessageDelete(
    message: Message | PartialMessage,
    client: TortugaClient
  ): Promise<void> {
    if (!message.guild || message.author?.bot) return;

    await this.logEvent(
      message.guild,
      LogEventType.MESSAGE_DELETE,
      {
        actorId: message.author?.id ?? "unknown",
        targetId: message.id,
        title: "Message Deleted",
        description: `A message was deleted in <#${message.channel.id}>.`,
        fields: [
          { name: "Author", value: message.author ? `${message.author.tag} (${message.author.id})` : "Unknown", inline: true },
          { name: "Channel", value: `<#${message.channel.id}>`, inline: true },
          {
            name: "Content",
            value: message.content ? `\`\`\`${message.content.substring(0, 1000)}\`\`\`` : "*No text content*",
            inline: false,
          },
        ],
        color: EMBED_COLORS.danger,
        detailsJson: {
          content: message.content,
          channelId: message.channel.id,
          authorId: message.author?.id,
        },
      },
      client
    );
  }

  /**
   * Log message edit.
   */
  public static async logMessageUpdate(
    oldMessage: Message | PartialMessage,
    newMessage: Message | PartialMessage,
    client: TortugaClient
  ): Promise<void> {
    if (!newMessage.guild || newMessage.author?.bot) return;
    if (oldMessage.content === newMessage.content) return;

    await this.logEvent(
      newMessage.guild,
      LogEventType.MESSAGE_EDIT,
      {
        actorId: newMessage.author?.id ?? "unknown",
        targetId: newMessage.id,
        title: "Message Edited",
        description: `A message was modified in <#${newMessage.channel.id}>. [Jump to message](${newMessage.url})`,
        fields: [
          { name: "Author", value: newMessage.author ? `${newMessage.author.tag} (${newMessage.author.id})` : "Unknown", inline: true },
          { name: "Channel", value: `<#${newMessage.channel.id}>`, inline: true },
          {
            name: "Before",
            value: oldMessage.content ? `\`\`\`${oldMessage.content.substring(0, 500)}\`\`\`` : "*None*",
            inline: false,
          },
          {
            name: "After",
            value: newMessage.content ? `\`\`\`${newMessage.content.substring(0, 500)}\`\`\`` : "*None*",
            inline: false,
          },
        ],
        color: EMBED_COLORS.gold,
        detailsJson: {
          before: oldMessage.content,
          after: newMessage.content,
          channelId: newMessage.channel.id,
          authorId: newMessage.author?.id,
        },
      },
      client
    );
  }

  /**
   * Log member join.
   */
  public static async logMemberJoin(
    member: GuildMember,
    client: TortugaClient
  ): Promise<void> {
    await this.logEvent(
      member.guild,
      LogEventType.MEMBER_JOIN,
      {
        actorId: member.id,
        targetId: member.id,
        title: "Member Joined",
        description: `${member.toString()} joined the server.`,
        fields: [
          { name: "Account Created", value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true },
          { name: "Total Members", value: `${member.guild.memberCount}`, inline: true },
        ],
        color: EMBED_COLORS.success,
      },
      client
    );
  }

  /**
   * Log member leave.
   */
  public static async logMemberLeave(
    member: GuildMember,
    client: TortugaClient
  ): Promise<void> {
    await this.logEvent(
      member.guild,
      LogEventType.MEMBER_LEAVE,
      {
        actorId: member.id,
        targetId: member.id,
        title: "Member Left",
        description: `${member.user.tag} (${member.id}) left the server.`,
        fields: [
          { name: "Total Members", value: `${member.guild.memberCount}`, inline: true },
        ],
        color: EMBED_COLORS.danger,
      },
      client
    );
  }
}
