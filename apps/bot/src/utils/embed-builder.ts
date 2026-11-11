import { EmbedBuilder } from "discord.js";
import { APP_CONFIG } from "@tortuga/config";

/**
 * Standard embed color palette matching Tortuga branding.
 */
export const EMBED_COLORS = {
  primary: 0x10b981, // Emerald 500
  primaryDark: 0x059669,
  blurple: 0x5865f2,
  gold: 0xf59e0b,
  danger: 0xef4444,
  info: 0x3b82f6,
  success: 0x10b981,
  dark: 0x111827,
};

export class BotEmbed {
  public static base(): EmbedBuilder {
    return new EmbedBuilder()
      .setColor(EMBED_COLORS.primary)
      .setTimestamp();
  }

  public static success(title: string, description?: string): EmbedBuilder {
    const embed = new EmbedBuilder()
      .setColor(EMBED_COLORS.success)
      .setTitle(`✅ ${title}`)
      .setTimestamp();
    if (description) embed.setDescription(description);
    return embed;
  }

  public static error(title: string, description?: string): EmbedBuilder {
    const embed = new EmbedBuilder()
      .setColor(EMBED_COLORS.danger)
      .setTitle(`❌ ${title}`)
      .setTimestamp();
    if (description) embed.setDescription(description);
    return embed;
  }

  public static warning(title: string, description?: string): EmbedBuilder {
    const embed = new EmbedBuilder()
      .setColor(EMBED_COLORS.gold)
      .setTitle(`⚠️ ${title}`)
      .setTimestamp();
    if (description) embed.setDescription(description);
    return embed;
  }

  public static info(title: string, description?: string): EmbedBuilder {
    const embed = new EmbedBuilder()
      .setColor(EMBED_COLORS.info)
      .setTitle(`ℹ️ ${title}`)
      .setTimestamp();
    if (description) embed.setDescription(description);
    return embed;
  }

  public static carl(title: string, description?: string): EmbedBuilder {
    const embed = new EmbedBuilder()
      .setColor(EMBED_COLORS.gold)
      .setTitle(`🐢 ${title}`)
      .setFooter({ text: `${APP_CONFIG.name} v${APP_CONFIG.version}` })
      .setTimestamp();
    if (description) embed.setDescription(description);
    return embed;
  }
}
