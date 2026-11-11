import { Message, PartialMessage } from "discord.js";
import type { TortugaEvent } from "../types.js";
import { LoggingModule } from "../modules/logging/index.js";
import { logger } from "../utils/logger.js";

export const messageUpdateEvent: TortugaEvent<"messageUpdate"> = {
  name: "messageUpdate",
  async execute(client, oldMessage: Message | PartialMessage, newMessage: Message | PartialMessage) {
    if (!newMessage.guild || newMessage.author?.bot) return;

    try {
      await LoggingModule.logMessageUpdate(oldMessage, newMessage, client);
    } catch (err) {
      logger.error("Error in messageUpdate event", err);
    }
  },
};
