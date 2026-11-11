import { GuildMember, TextChannel, EmbedBuilder } from "discord.js";
import type { TortugaEvent } from "../types.js";
import { DatabaseService } from "../utils/db-fallback.js";
import { LoggingModule } from "../modules/logging/index.js";
import { logger } from "../utils/logger.js";

export const guildMemberAddEvent: TortugaEvent<"guildMemberAdd"> = {
  name: "guildMemberAdd",
  async execute(client, member: GuildMember) {
    const guild = member.guild;

    try {
      // 1. Fetch Onboarding & Guild Configurations
      const [onboardingCfg, guildSettings] = await Promise.all([
        DatabaseService.getOnboardingConfig(guild.id),
        DatabaseService.getGuild(guild.id),
      ]);

      // 2. Auto-Role Assignment (Human or Bot)
      const autoRoles = member.user.bot
        ? onboardingCfg?.botAutoroleIds || guildSettings?.botAutoroleIds || []
        : onboardingCfg?.autoroleIds || guildSettings?.autoroleIds || [];

      for (const roleId of autoRoles) {
        try {
          const role = guild.roles.cache.get(roleId);
          if (role) {
            await member.roles.add(role);
          }
        } catch (roleErr) {
          logger.debug(`Failed to assign autorole ${roleId} to ${member.id}`, roleErr);
        }
      }

      // 3. Welcome Message in Channel
      if (onboardingCfg && onboardingCfg.welcomeEnabled && onboardingCfg.welcomeChannelId) {
        try {
          const channel = guild.channels.cache.get(onboardingCfg.welcomeChannelId) as TextChannel;
          if (channel && channel.isTextBased()) {
            const rawMsg =
              onboardingCfg.welcomeMessage ||
              "Hey {user.mention}, welcome to **{server.name}**! 🎉 Member #{memberCount}!";

            const formattedMsg = rawMsg
              .replace(/\{user\.mention\}/g, `<@${member.id}>`)
              .replace(/\{user\.name\}/g, member.user.username)
              .replace(/\{server\.name\}/g, guild.name)
              .replace(/\{memberCount\}/g, `${guild.memberCount}`);

            const welcomeEmbed = new EmbedBuilder()
              .setColor(0x10b981) // Emerald
              .setAuthor({
                name: `${member.user.username} joined!`,
                iconURL: member.user.displayAvatarURL(),
              })
              .setDescription(formattedMsg)
              .setFooter({
                text: `${guild.name} • Member #${guild.memberCount}`,
                iconURL: guild.iconURL() || undefined,
              })
              .setTimestamp();

            await channel.send({
              content: `<@${member.id}>`,
              embeds: [welcomeEmbed],
            });
          }
        } catch (welcomeErr) {
          logger.warn(`Failed to send welcome message in guild ${guild.id}`, welcomeErr);
        }
      }

      // 4. Send Direct Message (DM) to User
      if (onboardingCfg && onboardingCfg.sendDmWelcome && onboardingCfg.dmWelcomeMessage) {
        try {
          const dmText = onboardingCfg.dmWelcomeMessage
            .replace(/\{user\.mention\}/g, `<@${member.id}>`)
            .replace(/\{user\.name\}/g, member.user.username)
            .replace(/\{server\.name\}/g, guild.name)
            .replace(/\{memberCount\}/g, `${guild.memberCount}`);

          await member.send(dmText).catch(() => null);
        } catch {
          // Ignored if user has DMs closed
        }
      }

      // 5. Audit Logging
      await LoggingModule.logMemberJoin(member, client);
    } catch (err) {
      logger.error("Error in guildMemberAdd event", err);
    }
  },
};
