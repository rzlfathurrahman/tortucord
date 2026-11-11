import { ActivityType } from "discord.js";
import type { TortugaEvent } from "../types.js";
import { logger } from "../utils/logger.js";
import { registerSlashCommands } from "../commands/index.js";
import { LevelingModule } from "../modules/leveling/index.js";

export const readyEvent: TortugaEvent<"ready"> = {
  name: "ready",
  once: true,
  async execute(client) {
    logger.success(`Logged in and connected as ${client.user?.tag} (ID: ${client.user?.id})`);

    // Set rich presence status
    client.user?.setPresence({
      activities: [
        {
          name: "over your server | /help",
          type: ActivityType.Watching,
        },
      ],
      status: "online",
    });

    // Start background voice XP tracking
    LevelingModule.startVoiceXpTracking(client);

    // Register slash commands with Discord REST API
    await registerSlashCommands(client);
  },
};
