import type { TortugaClient } from "../client.js";
import type { TortugaEvent } from "../types.js";
import { readyEvent } from "./ready.js";
import { interactionCreateEvent } from "./interactionCreate.js";
import { messageCreateEvent } from "./messageCreate.js";
import { messageReactionAddEvent } from "./messageReactionAdd.js";
import { messageReactionRemoveEvent } from "./messageReactionRemove.js";
import { voiceStateUpdateEvent } from "./voiceStateUpdate.js";
import { messageDeleteEvent } from "./messageDelete.js";
import { messageUpdateEvent } from "./messageUpdate.js";
import { guildMemberAddEvent } from "./guildMemberAdd.js";
import { guildMemberRemoveEvent } from "./guildMemberRemove.js";
import { presenceUpdateEvent } from "./presenceUpdate.js";

export const EVENTS: TortugaEvent<any>[] = [
  readyEvent,
  interactionCreateEvent,
  messageCreateEvent,
  messageReactionAddEvent,
  messageReactionRemoveEvent,
  voiceStateUpdateEvent,
  messageDeleteEvent,
  messageUpdateEvent,
  guildMemberAddEvent,
  guildMemberRemoveEvent,
  presenceUpdateEvent,
];

export function registerEvents(client: TortugaClient): void {
  for (const event of EVENTS) {
    if (event.once) {
      client.once(event.name, (...args) => event.execute(client, ...args));
    } else {
      client.on(event.name, (...args) => event.execute(client, ...args));
    }
  }
}
