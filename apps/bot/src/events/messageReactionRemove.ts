import {
  MessageReaction,
  PartialMessageReaction,
  User,
  PartialUser,
} from "discord.js";
import type { TortugaEvent } from "../types.js";
import { ReactionRoleModule } from "../modules/reaction-roles/index.js";
import { StarboardModule } from "../modules/starboard/index.js";
import { logger } from "../utils/logger.js";

export const messageReactionRemoveEvent: TortugaEvent<"messageReactionRemove"> = {
  name: "messageReactionRemove",
  async execute(client, reaction: MessageReaction | PartialMessageReaction, user: User | PartialUser) {
    if (user.bot) return;

    let fullReaction: MessageReaction;
    if (reaction.partial) {
      try {
        fullReaction = await reaction.fetch();
      } catch (err) {
        logger.debug("Failed to fetch partial reaction", err);
        return;
      }
    } else {
      fullReaction = reaction;
    }

    let fullUser: User;
    if (user.partial) {
      try {
        fullUser = await user.fetch();
      } catch (err) {
        logger.debug("Failed to fetch partial user", err);
        return;
      }
    } else {
      fullUser = user;
    }

    try {
      // 1. Reaction Roles removal logic
      await ReactionRoleModule.handleReactionRemove(fullReaction, fullUser, client);

      // 2. Starboard recalculate
      await StarboardModule.handleReaction(fullReaction, fullUser, client);
    } catch (err) {
      logger.error("Error in messageReactionRemove event", err);
    }
  },
};
