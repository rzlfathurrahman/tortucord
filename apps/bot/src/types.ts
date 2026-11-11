import type {
  ChatInputCommandInteraction,
  ClientEvents,
  Message,
  SlashCommandBuilder,
  SlashCommandSubcommandsOnlyBuilder,
  SlashCommandOptionsOnlyBuilder,
} from "discord.js";
import type { TortugaClient } from "./client.js";

export type SlashCommandData =
  | SlashCommandBuilder
  | SlashCommandSubcommandsOnlyBuilder
  | SlashCommandOptionsOnlyBuilder
  | Omit<SlashCommandBuilder, "addSubcommand" | "addSubcommandGroup">;

export interface TortugaCommand {
  data: SlashCommandData;
  category?: string;
  cooldownSec?: number;
  execute: (interaction: ChatInputCommandInteraction, client: TortugaClient) => Promise<unknown>;
  prefixAliases?: string[];
  executePrefix?: (message: Message, args: string[], client: TortugaClient) => Promise<unknown>;
}

export interface TortugaEvent<K extends keyof ClientEvents = keyof ClientEvents> {
  name: K;
  once?: boolean;
  execute: (client: TortugaClient, ...args: ClientEvents[K]) => Promise<void>;
}
