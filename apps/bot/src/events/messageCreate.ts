import { Message } from "discord.js";
import type { TortugaEvent } from "../types.js";
import { AutomodModule } from "../modules/automod/index.js";
import { StickyModule } from "../modules/sticky/index.js";
import { LevelingModule } from "../modules/leveling/index.js";
import { CustomCommandsModule } from "../modules/custom-commands/index.js";
import { DatabaseService } from "../utils/db-fallback.js";
import { logger } from "../utils/logger.js";

export const messageCreateEvent: TortugaEvent<"messageCreate"> = {
  name: "messageCreate",
  async execute(client, message: Message) {
    if (!message.guild || message.author.bot) return;

    try {
      // 1. AutoMod Checks (anti-spam, anti-invite, bad words, mass mentions, media-only)
      const wasIntercepted = await AutomodModule.processMessage(message, client);
      if (wasIntercepted) {
        // If message was deleted or penalized by automod, discontinue processing
        return;
      }

      // 2. Sticky Message Handler (Debounced repost at channel bottom)
      await StickyModule.onMessage(message, client);

      // 3. Leveling XP Reward (60s cooldown per user)
      await LevelingModule.onMessage(message, client);

      // 4. Prefix & Custom Commands Execution
      const guildSettings = await DatabaseService.getGuild(message.guild.id);
      const prefix = guildSettings?.prefix || "!";

      if (message.content.startsWith(prefix)) {
        const rawContent = message.content.slice(prefix.length).trim();
        const args = rawContent.split(/\s+/);
        const cmdName = args.shift()?.toLowerCase();

        if (!cmdName) return;

        // Check built-in prefix commands
        const builtIn = client.commands.find((c) => {
          if (c.data.name === cmdName) return true;
          if (c.prefixAliases && c.prefixAliases.includes(cmdName)) return true;
          return false;
        });

        if (builtIn && builtIn.executePrefix) {
          try {
            await builtIn.executePrefix(message, args, client);
            return;
          } catch (err) {
            logger.error(`Error executing prefix command ${cmdName}`, err);
          }
        }

        // Check custom commands via TagScript
        await CustomCommandsModule.execute(message, cmdName, args, client);
      }
    } catch (err) {
      logger.error("Error in messageCreate event handler", err);
    }
  },
};
