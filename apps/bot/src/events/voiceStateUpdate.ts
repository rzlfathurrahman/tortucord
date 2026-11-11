import { VoiceState } from "discord.js";
import { LogEventType } from "@tortuga/config";
import type { TortugaEvent } from "../types.js";
import { LoggingModule } from "../modules/logging/index.js";
import { logger } from "../utils/logger.js";

export const voiceStateUpdateEvent: TortugaEvent<"voiceStateUpdate"> = {
  name: "voiceStateUpdate",
  async execute(client, oldState: VoiceState, newState: VoiceState) {
    const member = newState.member || oldState.member;
    if (!member || member.user.bot) return;

    const guild = newState.guild;

    try {
      // 1. Voice Join
      if (!oldState.channelId && newState.channelId) {
        await LoggingModule.logEvent(
          guild,
          LogEventType.VOICE_JOIN,
          {
            actorId: member.id,
            targetId: newState.channelId,
            title: "Voice Channel Joined",
            description: `${member.toString()} joined voice channel <#${newState.channelId}>.`,
            fields: [
              { name: "User", value: `${member.user.tag} (${member.id})`, inline: true },
              { name: "Channel", value: `<#${newState.channelId}>`, inline: true },
            ],
          },
          client
        );
      }
      // 2. Voice Leave
      else if (oldState.channelId && !newState.channelId) {
        await LoggingModule.logEvent(
          guild,
          LogEventType.VOICE_LEAVE,
          {
            actorId: member.id,
            targetId: oldState.channelId,
            title: "Voice Channel Left",
            description: `${member.toString()} left voice channel <#${oldState.channelId}>.`,
            fields: [
              { name: "User", value: `${member.user.tag} (${member.id})`, inline: true },
              { name: "Channel", value: `<#${oldState.channelId}>`, inline: true },
            ],
          },
          client
        );
      }
      // 3. Voice Move
      else if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
        await LoggingModule.logEvent(
          guild,
          LogEventType.VOICE_MOVE,
          {
            actorId: member.id,
            targetId: newState.channelId,
            title: "Voice Channel Switched",
            description: `${member.toString()} moved from <#${oldState.channelId}> to <#${newState.channelId}>.`,
            fields: [
              { name: "User", value: `${member.user.tag} (${member.id})`, inline: true },
              { name: "From", value: `<#${oldState.channelId}>`, inline: true },
              { name: "To", value: `<#${newState.channelId}>`, inline: true },
            ],
          },
          client
        );
      }
    } catch (err) {
      logger.error("Error in voiceStateUpdate event", err);
    }
  },
};
