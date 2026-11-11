import {
  Client,
  Collection,
  GatewayIntentBits,
  Partials,
} from "discord.js";
import { prisma } from "@tortuga/database";
import type { TortugaCommand } from "./types.js";
import { RedisService } from "./utils/redis-client.js";
import { DatabaseService } from "./utils/db-fallback.js";
import { logger, Logger } from "./utils/logger.js";
import { COMMANDS } from "./commands/index.js";
import { registerEvents } from "./events/index.js";

export class TortugaClient extends Client {
  public commands = new Collection<string, TortugaCommand>();
  public redis: RedisService;
  public logger: Logger = logger;
  public db = prisma;

  constructor() {
    super({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.GuildEmojisAndStickers,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
      ],
      partials: [
        Partials.Message,
        Partials.Channel,
        Partials.Reaction,
        Partials.User,
        Partials.GuildMember,
      ],
    });

    this.redis = new RedisService(process.env.REDIS_URL);
  }

  /**
   * Initialize client dependencies, collections, and event listeners.
   */
  public async init(): Promise<void> {
    this.logger.info("Initializing Tortuga Discord Client...");

    // 1. Initialize Redis connection or fallback
    await this.redis.init();

    // 2. Check Database connection or fallback
    await DatabaseService.checkConnection();

    // 3. Register Slash and Prefix Commands into Collection
    for (const cmd of COMMANDS) {
      this.commands.set(cmd.data.name, cmd);
    }
    this.logger.info(`Loaded ${this.commands.size} command(s) into memory.`);

    // 4. Register Event Listeners
    registerEvents(this);
    this.logger.info("Registered gateway event handlers.");
  }

  /**
   * Gracefully close all external connections and shut down client.
   */
  public override async destroy(): Promise<void> {
    this.logger.info("Gracefully shutting down Tortuga Client...");
    await this.redis.disconnect();
    await this.db.$disconnect().catch(() => null);
    await super.destroy();
    this.logger.success("Tortuga Client shutdown complete.");
  }
}
