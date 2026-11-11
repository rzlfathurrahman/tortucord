import "dotenv/config";
import { TortugaClient } from "./client.js";
import { logger } from "./utils/logger.js";
import { APP_CONFIG } from "@tortuga/config";

async function main(): Promise<void> {
  console.log(`
  ╔═══════════════════════════════════════════════════════╗
  ║   🐢 Tortuga Bot - Open-Source Carl-bot Alternative   ║
  ║   Version ${APP_CONFIG.version}                                      ║
  ║   Carl-bot alternative with full premium features     ║
  ╚═══════════════════════════════════════════════════════╝
  `);

  const client = new TortugaClient();

  // Initialize subsystems (Redis, Database, Commands, Events)
  await client.init();

  const token = process.env.DISCORD_BOT_TOKEN;

  // Handle graceful shutdown signals
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}. Initiating graceful termination...`);
    await client.destroy();
    process.exit(0);
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));

  process.on("unhandledRejection", (reason: any) => {
    logger.error("Unhandled Rejection:", reason);
  });

  process.on("uncaughtException", (error: Error) => {
    logger.error("Uncaught Exception:", error);
  });

  if (!token || token === "your_bot_token_here" || token.includes("placeholder")) {
    logger.warn(
      "DISCORD_BOT_TOKEN is not configured in .env. Bot initialized successfully in dry-run/readiness mode."
    );
    logger.info("Set a valid DISCORD_BOT_TOKEN in .env or environment variables to connect to Discord Gateway.");
    return;
  }

  try {
    logger.info("Connecting to Discord Gateway...");
    await client.login(token);
  } catch (err: any) {
    logger.error("Failed to connect to Discord Gateway:", err.message || err);
    if (err.code === "TokenInvalid") {
      logger.warn("The provided DISCORD_BOT_TOKEN is invalid. Please verify your Discord Developer Portal credentials.");
    }
  }
}

main().catch((err) => {
  logger.error("Fatal startup error:", err);
  process.exit(1);
});
