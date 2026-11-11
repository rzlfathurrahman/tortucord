import { Message, PartialMessage } from "discord.js";
import type { TortugaEvent } from "../types.js";
import { LoggingModule } from "../modules/logging/index.js";
import { logger } from "../utils/logger.js";

export const messageDeleteEvent: TortugaEvent<"messageDelete"> = {
  name: "messageDelete",
  async execute(client, message: Message | PartialMessage) {
    if (!message.guild || message.author?.bot) return;

    try {
      await LoggingModule.logMessageDelete(message, client);
    } catch (err) {
      logger.error("Error in messageDelete event", err);
    }
  },
};
