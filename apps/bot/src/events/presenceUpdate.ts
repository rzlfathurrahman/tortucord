import { EmbedBuilder } from "discord.js";
import type { TortugaEvent } from "../types.js";
import { logger } from "../utils/logger.js";

export const presenceUpdateEvent: TortugaEvent<"presenceUpdate"> = {
  name: "presenceUpdate",
  async execute(client, oldPresence, newPresence) {
    if (!newPresence?.guild || !newPresence.member?.user.bot) return;

    const guildId = newPresence.guild.id;
    const botId = newPresence.userId;

    const wasOnline = oldPresence && oldPresence.status !== "offline";
    const isOffline = newPresence.status === "offline";

    if (wasOnline && isOffline) {
      try {
        const config = await client.db.botWatcherConfig.findUnique({
          where: { guildId },
        });

        if (!config || !config.enabled || !config.alertChannelId) return;
        if (!config.monitoredBotIds.includes(botId)) return;

        // Check cooldown
        const now = new Date();
        if (config.lastAlertAt) {
          const diffMin = (now.getTime() - new Date(config.lastAlertAt).getTime()) / (1000 * 60);
          if (diffMin < config.alertCooldownMin) return;
        }

        await client.db.botWatcherConfig.update({
          where: { guildId },
          data: { lastAlertAt: now },
        });

        const alertChan = newPresence.guild.channels.cache.get(config.alertChannelId);
        if (alertChan && alertChan.isTextBased()) {
          const pingText = (config.alertRoleIds || []).map((rId: string) => `<@&${rId}>`).join(" ");
          const embed = new EmbedBuilder()
            .setTitle("🚨 [INCIDENT] Bot Outage Detected!")
            .setDescription(`**<@${botId}>** has gone **OFFLINE**.\nPlease check your server or hosting container.`)
            .setColor(0xef4444)
            .addFields(
              { name: "Bot Name", value: newPresence.member.user.tag, inline: true },
              { name: "Status", value: "🔴 Offline", inline: true },
              { name: "Time", value: new Date().toLocaleTimeString(), inline: true }
            )
            .setFooter({ text: "Tortuga Sentinel Bot Watcher" })
            .setTimestamp();

          await alertChan.send({
            content: pingText || undefined,
            embeds: [embed],
          });
        }
      } catch (err) {
        logger.error("Error in presenceUpdate Bot Watcher", err);
      }
    }
  },
};
