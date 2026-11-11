import {
  Message,
  GuildMember,
  TextChannel,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ButtonInteraction,
  PermissionFlagsBits,
} from "discord.js";
import { AutomodAction, InfractionAction } from "@tortuga/config";
import { DatabaseService } from "../../utils/db-fallback.js";
import { BotEmbed } from "../../utils/embed-builder.js";
import { logger } from "../../utils/logger.js";
import type { TortugaClient } from "../../client.js";

const INVITE_REGEX = /(?:https?:\/\/)?(?:www\.)?(?:discord\.(?:gg|io|me|li)|discord(?:app)?\.com\/invite)\/([a-zA-Z0-9-]{2,32})/i;
const URL_REGEX = /https?:\/\/[^\s<]+[^<.,:;"')\]\s]/i;

export interface AutomodViolation {
  type: "SPAM" | "INVITE" | "LINK" | "MENTIONS" | "BANNED_WORDS" | "MEDIA_ONLY";
  reason: string;
  action: AutomodAction;
}

export class AutomodModule {
  /**
   * Process a message for automod violations.
   * Returns true if message was deleted/handled by automod, false otherwise.
   */
  public static async processMessage(
    message: Message,
    client: TortugaClient
  ): Promise<boolean> {
    if (!message.guild || message.author.bot) return false;
    const member = message.member;
    if (!member) return false;

    // Server owners and admins bypass automod
    if (
      message.guild.ownerId === member.id ||
      member.permissions.has(PermissionFlagsBits.Administrator)
    ) {
      return false;
    }

    const config = await DatabaseService.getAutomodConfig(message.guild.id);
    if (!config) return false;

    // Check whitelist
    if (
      config.whitelistChannels.includes(message.channel.id) ||
      member.roles.cache.some((r) => config.whitelistRoles.includes(r.id))
    ) {
      return false;
    }

    let violation: AutomodViolation | null = null;

    // 1. Anti-Spam (Rate limiting messages)
    if (config.antiSpam) {
      const spamKey = `automod:spam:${message.guild.id}:${message.author.id}`;
      const msgCount = await client.redis.incr(spamKey);
      if (msgCount === 1) {
        await client.redis.setex(spamKey, 4, "1");
      } else if (msgCount > 5) {
        violation = {
          type: "SPAM",
          reason: "Rapid message spam detected (> 5 messages in 4s)",
          action: config.actionOnSpam || AutomodAction.DELETE_MESSAGE,
        };
      }
    }

    // 2. Anti-Invite
    if (!violation && config.antiInvite && INVITE_REGEX.test(message.content)) {
      violation = {
        type: "INVITE",
        reason: "Unauthorized Discord server invite link posted",
        action: config.actionOnInvite || AutomodAction.DELETE_MESSAGE,
      };
    }

    // 3. Anti-Link (Generic links)
    if (!violation && config.antiLink && URL_REGEX.test(message.content)) {
      violation = {
        type: "LINK",
        reason: "Unauthorized link posted",
        action: config.actionOnLink || AutomodAction.DELETE_MESSAGE,
      };
    }

    // 4. Mass Mentions
    if (!violation) {
      const totalMentions = message.mentions.users.size + message.mentions.roles.size;
      const maxAllowed = config.maxMentions || 5;
      if (totalMentions > maxAllowed) {
        violation = {
          type: "MENTIONS",
          reason: `Exceeded mention threshold (${totalMentions}/${maxAllowed})`,
          action: config.actionOnMentions || AutomodAction.DELETE_MESSAGE,
        };
      }
    }

    // 5. Banned Words
    if (!violation && config.bannedWords && config.bannedWords.length > 0) {
      const contentLower = message.content.toLowerCase();
      const matched = config.bannedWords.find((w: string) =>
        contentLower.includes(w.toLowerCase())
      );
      if (matched) {
        violation = {
          type: "BANNED_WORDS",
          reason: `Blacklisted word or phrase: "${matched}"`,
          action: config.actionOnBannedWords || AutomodAction.DELETE_MESSAGE,
        };
      }
    }

    // 6. Media-only channels (e.g. #art, #media, #photos)
    if (!violation) {
      const channelName = ("name" in message.channel ? (message.channel.name as string) : "").toLowerCase();
      if (
        channelName.includes("media-only") ||
        channelName.includes("art-only") ||
        channelName === "photos" ||
        channelName === "art"
      ) {
        const hasMedia = message.attachments.size > 0 || message.embeds.length > 0;
        if (!hasMedia) {
          violation = {
            type: "MEDIA_ONLY",
            reason: `Channel #${channelName} is designated for media and images only`,
            action: AutomodAction.DELETE_MESSAGE,
          };
        }
      }
    }

    if (!violation) return false;

    // Execute enforcement action
    await this.enforceViolation(violation, message, member, config, client);
    return true;
  }

  /**
   * Enforce violation punishments and alert Drama Watcher.
   */
  private static async enforceViolation(
    violation: AutomodViolation,
    message: Message,
    member: GuildMember,
    config: any,
    client: TortugaClient
  ): Promise<void> {
    // 1. Delete message
    if (message.deletable) {
      await message.delete().catch(() => null);
    }

    // 2. Execute configured punishment
    switch (violation.action) {
      case AutomodAction.WARN: {
        await DatabaseService.createInfraction({
          guildId: message.guild!.id,
          userId: member.id,
          modId: client.user!.id,
          action: InfractionAction.WARN,
          reason: `[AutoMod] ${violation.reason}`,
        });
        if ("send" in message.channel) {
          await (message.channel as TextChannel)
            .send({
              content: `⚠️ ${member.toString()}, you have been warned for: **${violation.reason}**`,
            })
            .then((m: Message) => setTimeout(() => m.delete().catch(() => null), 6000));
        }
        break;
      }
      case AutomodAction.TIMEOUT: {
        await member.timeout(10 * 60 * 1000, `[AutoMod] ${violation.reason}`).catch(() => null);
        await DatabaseService.createInfraction({
          guildId: message.guild!.id,
          userId: member.id,
          modId: client.user!.id,
          action: InfractionAction.TIMEOUT,
          reason: `[AutoMod] ${violation.reason} (10m)`,
        });
        if ("send" in message.channel) {
          await (message.channel as TextChannel)
            .send({
              content: `🔇 ${member.toString()} has been timed out for 10 minutes for: **${violation.reason}**`,
            })
            .then((m: Message) => setTimeout(() => m.delete().catch(() => null), 6000));
        }
        break;
      }
      case AutomodAction.KICK: {
        await member.kick(`[AutoMod] ${violation.reason}`).catch(() => null);
        await DatabaseService.createInfraction({
          guildId: message.guild!.id,
          userId: member.id,
          modId: client.user!.id,
          action: InfractionAction.KICK,
          reason: `[AutoMod] ${violation.reason}`,
        });
        break;
      }
      case AutomodAction.BAN: {
        await member.ban({ reason: `[AutoMod] ${violation.reason}` }).catch(() => null);
        await DatabaseService.createInfraction({
          guildId: message.guild!.id,
          userId: member.id,
          modId: client.user!.id,
          action: InfractionAction.BAN,
          reason: `[AutoMod] ${violation.reason}`,
        });
        break;
      }
      default: {
        // DELETE_MESSAGE default feedback
        if ("send" in message.channel) {
          await (message.channel as TextChannel)
            .send({
              content: `🛑 ${member.toString()}, your message was removed: **${violation.reason}**`,
            })
            .then((m: Message) => setTimeout(() => m.delete().catch(() => null), 5000));
        }
      }
    }

    // 3. Post to Drama Watcher channel if configured
    if (config.dramaChannelId) {
      await this.sendDramaWatcherAlert(config.dramaChannelId, violation, message, member, client);
    }
  }

  /**
   * Send an interactive moderation review card to Drama Watcher channel.
   */
  private static async sendDramaWatcherAlert(
    dramaChannelId: string,
    violation: AutomodViolation,
    message: Message,
    member: GuildMember,
    client: TortugaClient
  ): Promise<void> {
    try {
      const channel = client.channels.cache.get(dramaChannelId) as TextChannel | undefined;
      if (!channel || !channel.isTextBased()) return;

      const embed = BotEmbed.base()
        .setColor(0xef4444)
        .setTitle("🚨 [Drama Watcher] Moderation Queue")
        .setDescription(`An automated violation was detected and intercepted.`)
        .addFields(
          { name: "User", value: `${member.user.tag} (${member.id})`, inline: true },
          { name: "Channel", value: `<#${message.channel.id}>`, inline: true },
          { name: "Violation", value: `**${violation.type}**: ${violation.reason}`, inline: false },
          {
            name: "Captured Content",
            value: message.content ? `\`\`\`${message.content.substring(0, 1000)}\`\`\`` : "*No text content*",
            inline: false,
          }
        )
        .setThumbnail(member.user.displayAvatarURL())
        .setFooter({ text: "Use quick buttons below to take moderator action." });

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`automod:drama:warn:${member.id}`)
          .setLabel("Warn")
          .setStyle(ButtonStyle.Secondary)
          .setEmoji("⚠️"),
        new ButtonBuilder()
          .setCustomId(`automod:drama:timeout:${member.id}`)
          .setLabel("Timeout 1h")
          .setStyle(ButtonStyle.Primary)
          .setEmoji("⏳"),
        new ButtonBuilder()
          .setCustomId(`automod:drama:kick:${member.id}`)
          .setLabel("Kick")
          .setStyle(ButtonStyle.Danger)
          .setEmoji("👢"),
        new ButtonBuilder()
          .setCustomId(`automod:drama:ban:${member.id}`)
          .setLabel("Ban")
          .setStyle(ButtonStyle.Danger)
          .setEmoji("🔨"),
        new ButtonBuilder()
          .setCustomId(`automod:drama:dismiss:${member.id}`)
          .setLabel("Dismiss")
          .setStyle(ButtonStyle.Success)
          .setEmoji("✅")
      );

      await channel.send({ embeds: [embed], components: [row] });
    } catch (err) {
      logger.error("Failed to dispatch Drama Watcher alert", err);
    }
  }

  /**
   * Handle interactive button clicks on Drama Watcher queue messages.
   */
  public static async handleDramaButton(
    interaction: ButtonInteraction,
    client: TortugaClient
  ): Promise<void> {
    const parts = interaction.customId.split(":");
    if (parts.length < 4 || parts[0] !== "automod" || parts[1] !== "drama") return;

    const action = parts[2];
    const targetUserId = parts[3];
    const guild = interaction.guild;
    if (!guild) return;

    const mod = interaction.member as GuildMember;
    if (!mod.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      await interaction.reply({
        content: "You do not have permission to moderate members.",
        ephemeral: true,
      });
      return;
    }

    const targetMember = await guild.members.fetch(targetUserId).catch(() => null);

    switch (action) {
      case "warn": {
        await DatabaseService.createInfraction({
          guildId: guild.id,
          userId: targetUserId,
          modId: mod.id,
          action: InfractionAction.WARN,
          reason: `[Drama Watcher] Approved by ${mod.user.tag}`,
        });
        await interaction.reply({ content: `✅ Warned <@${targetUserId}>.` });
        break;
      }
      case "timeout": {
        if (targetMember) {
          await targetMember.timeout(3600 * 1000, `[Drama Watcher] Action by ${mod.user.tag}`);
          await DatabaseService.createInfraction({
            guildId: guild.id,
            userId: targetUserId,
            modId: mod.id,
            action: InfractionAction.TIMEOUT,
            reason: `[Drama Watcher] Timed out for 1 hour by ${mod.user.tag}`,
          });
          await interaction.reply({ content: `⏳ Timed out <@${targetUserId}> for 1 hour.` });
        } else {
          await interaction.reply({ content: "Member is no longer in this server.", ephemeral: true });
        }
        break;
      }
      case "kick": {
        if (targetMember) {
          await targetMember.kick(`[Drama Watcher] Kicked by ${mod.user.tag}`);
          await DatabaseService.createInfraction({
            guildId: guild.id,
            userId: targetUserId,
            modId: mod.id,
            action: InfractionAction.KICK,
            reason: `[Drama Watcher] Kicked by ${mod.user.tag}`,
          });
          await interaction.reply({ content: `👢 Kicked <@${targetUserId}>.` });
        } else {
          await interaction.reply({ content: "Member not found in guild.", ephemeral: true });
        }
        break;
      }
      case "ban": {
        await guild.members.ban(targetUserId, { reason: `[Drama Watcher] Banned by ${mod.user.tag}` });
        await DatabaseService.createInfraction({
          guildId: guild.id,
          userId: targetUserId,
          modId: mod.id,
          action: InfractionAction.BAN,
          reason: `[Drama Watcher] Banned by ${mod.user.tag}`,
        });
        await interaction.reply({ content: `🔨 Banned <@${targetUserId}>.` });
        break;
      }
      case "dismiss": {
        await interaction.reply({ content: `✅ Queue item dismissed by ${mod.user.tag}.` });
        break;
      }
    }

    // Disable buttons on the original message to prevent double actions
    const message = interaction.message;
    if (message.editable) {
      await message.edit({
        components: [],
        content: `*Case resolved by ${mod.user.tag} (${action.toUpperCase()})*`,
      }).catch(() => null);
    }
  }
}
