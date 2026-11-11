import { Collection, REST, Routes } from "discord.js";
import type { TortugaCommand } from "../types.js";
import { logger } from "../utils/logger.js";
import type { TortugaClient } from "../client.js";

// Moderation
import { warnCommand } from "./moderation/warn.js";
import { timeoutCommand } from "./moderation/timeout.js";
import { kickCommand } from "./moderation/kick.js";
import { banCommand } from "./moderation/ban.js";
import { purgeCommand } from "./moderation/purge.js";

// Reaction Roles
import { reactionRoleCommand } from "./reactionrole/reactionrole.js";

// Leveling
import { rankCommand } from "./leveling/rank.js";
import { leaderboardCommand } from "./leveling/leaderboard.js";

// Utility
import { embedCommand } from "./utility/embed.js";
import { stickyCommand } from "./utility/sticky.js";
import { suggestCommand } from "./utility/suggest.js";
import { starboardCommand } from "./utility/starboard.js";
import { helpCommand } from "./utility/help.js";
import { roleCommand } from "./utility/role.js";

export const COMMANDS: TortugaCommand[] = [
  helpCommand,
  warnCommand,
  timeoutCommand,
  kickCommand,
  banCommand,
  purgeCommand,
  reactionRoleCommand,
  rankCommand,
  leaderboardCommand,
  embedCommand,
  stickyCommand,
  suggestCommand,
  starboardCommand,
  roleCommand,
];

/**
 * Register all application slash commands with Discord REST API.
 */
export async function registerSlashCommands(client: TortugaClient): Promise<void> {
  const token = client.token || process.env.DISCORD_BOT_TOKEN;
  const clientId = client.user?.id || process.env.DISCORD_CLIENT_ID;

  if (!token || !clientId) {
    logger.warn("DISCORD_BOT_TOKEN or DISCORD_CLIENT_ID missing; skipping remote slash commands registration.");
    return;
  }

  const rest = new REST({ version: "10" }).setToken(token);
  const commandData = COMMANDS.map((cmd) => cmd.data.toJSON());

  try {
    logger.info(`Registering ${commandData.length} global slash command(s) with Discord API...`);
    await rest.put(Routes.applicationCommands(clientId), {
      body: commandData,
    });
    logger.success(`Successfully deployed ${commandData.length} global slash command(s)!`);
  } catch (err: any) {
    logger.error("Failed to register application commands with Discord API", err);
  }
}
