import { Message, TextChannel, EmbedBuilder } from "discord.js";
import { executeTagScript, TagScriptContext } from "@tortuga/tagscript";
import { DatabaseService } from "../../utils/db-fallback.js";
import { logger } from "../../utils/logger.js";
import type { TortugaClient } from "../../client.js";

export class CustomCommandsModule {
  /**
   * Check and execute custom command for a message.
   * Returns true if a custom command was matched and executed.
   */
  public static async execute(
    message: Message,
    cmdName: string,
    args: string[],
    client: TortugaClient
  ): Promise<boolean> {
    if (!message.guild) return false;

    const guildId = message.guild.id;
    const commands = await DatabaseService.getCustomCommands(guildId);
    if (!commands || commands.length === 0) return false;

    const cmd = commands.find(
      (c: any) =>
        c.name.toLowerCase() === cmdName.toLowerCase() ||
        (c.aliases && c.aliases.map((a: string) => a.toLowerCase()).includes(cmdName.toLowerCase()))
    );

    if (!cmd) return false;

    const member = message.member;
    // Check channel and role permissions
    if (cmd.deniedChannels && cmd.deniedChannels.includes(message.channel.id)) return false;
    if (cmd.allowedChannels && cmd.allowedChannels.length > 0 && !cmd.allowedChannels.includes(message.channel.id)) {
      return false;
    }
    if (member && cmd.deniedRoles && member.roles.cache.some((r) => cmd.deniedRoles.includes(r.id))) {
      return false;
    }
    if (
      member &&
      cmd.allowedRoles &&
      cmd.allowedRoles.length > 0 &&
      !member.roles.cache.some((r) => cmd.allowedRoles.includes(r.id))
    ) {
      return false;
    }

    try {
      const context: TagScriptContext = {
        user: {
          id: message.author.id,
          name: message.author.username,
          tag: message.author.tag,
          mention: message.author.toString(),
          avatar: message.author.displayAvatarURL(),
        },
        guild: {
          id: message.guild.id,
          name: message.guild.name,
          members: message.guild.memberCount,
          memberCount: message.guild.memberCount,
        },
        channel: {
          id: message.channel.id,
          name: "name" in message.channel ? (message.channel.name as string) : "channel",
          mention: message.channel.toString(),
        },
        args,
        variables: {},
      };

      const result = await executeTagScript(cmd.response, context);

      if (result.actions?.deleteMessage && message.deletable) {
        await message.delete().catch(() => null);
      }

      const responsePayload: any = {};
      if (result.content && result.content.trim()) {
        responsePayload.content = result.content;
      }

      if (result.embed) {
        const embed = new EmbedBuilder();
        if (result.embed.title) embed.setTitle(result.embed.title);
        if (result.embed.description) embed.setDescription(result.embed.description);
        if (result.embed.color) embed.setColor(result.embed.color as any);
        if (result.embed.image?.url) embed.setImage(result.embed.image.url);
        if (result.embed.thumbnail?.url) embed.setThumbnail(result.embed.thumbnail.url);
        if (result.embed.footer?.text) {
          embed.setFooter({
            text: result.embed.footer.text,
            iconURL: result.embed.footer.icon_url,
          });
        }
        if (result.embed.fields && result.embed.fields.length > 0) {
          embed.addFields(result.embed.fields);
        }
        responsePayload.embeds = [embed];
      }

      if ((responsePayload.content || responsePayload.embeds) && "send" in message.channel) {
        await (message.channel as TextChannel).send(responsePayload);
      }

      return true;
    } catch (err) {
      logger.error(`Failed to execute custom command ${cmd.name}`, err);
      return false;
    }
  }
}
