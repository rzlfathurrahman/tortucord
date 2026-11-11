import { GuildMember, PartialGuildMember, TextChannel } from "discord.js";
import type { TortugaEvent } from "../types.js";
import { DatabaseService } from "../utils/db-fallback.js";
import { LoggingModule } from "../modules/logging/index.js";
import { logger } from "../utils/logger.js";

export const guildMemberRemoveEvent: TortugaEvent<"guildMemberRemove"> = {
  name: "guildMemberRemove",
  async execute(client, member: GuildMember | PartialGuildMember) {
    const guild = member.guild;

    try {
      if ("user" in member && member.user) {
        // 1. Goodbye / Member Departure Message
        const onboardingCfg = await DatabaseService.getOnboardingConfig(guild.id);
        if (onboardingCfg && onboardingCfg.goodbyeEnabled && onboardingCfg.goodbyeChannelId) {
          try {
            const channel = guild.channels.cache.get(onboardingCfg.goodbyeChannelId) as TextChannel;
            if (channel && channel.isTextBased()) {
              const rawMsg =
                onboardingCfg.goodbyeMessage ||
                "**{user.name}** has left the server. Farewell! ⛵";

              const formattedMsg = rawMsg
                .replace(/\{user\.name\}/g, member.user.username)
                .replace(/\{server\.name\}/g, guild.name)
                .replace(/\{memberCount\}/g, `${guild.memberCount}`);

              await channel.send({ content: formattedMsg });
            }
          } catch (goodbyeErr) {
            logger.warn(`Failed to send goodbye message in guild ${guild.id}`, goodbyeErr);
          }
        }

        // 2. Audit Logging
        await LoggingModule.logMemberLeave(member as GuildMember, client);
      }
    } catch (err) {
      logger.error("Error in guildMemberRemove event", err);
    }
  },
};
