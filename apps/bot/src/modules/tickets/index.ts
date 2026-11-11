import {
  ButtonInteraction,
  ChannelType,
  TextChannel,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from "discord.js";
import type { TortugaClient } from "../../client.js";
import { logger } from "../../utils/logger.js";

export class TicketModule {
  public static async handleOpenButton(
    interaction: ButtonInteraction,
    client: TortugaClient,
    guildId: string
  ): Promise<void> {
    try {
      const config = await client.db.ticketConfig.findUnique({
        where: { guildId },
      });

      if (!config || !config.enabled) {
        await interaction.reply({
          content: "Ticket system is currently disabled for this server.",
          ephemeral: true,
        });
        return;
      }

      const existing = await client.db.ticket.findFirst({
        where: {
          guildId,
          creatorId: interaction.user.id,
          status: "OPEN",
        },
      });

      if (existing) {
        await interaction.reply({
          content: `You already have an open ticket: <#${existing.channelId}>!`,
          ephemeral: true,
        });
        return;
      }

      const channel = interaction.channel;
      if (!channel || channel.type !== ChannelType.GuildText) {
        await interaction.reply({
          content: "Tickets can only be created inside standard text channels.",
          ephemeral: true,
        });
        return;
      }

      const threadName = `ticket-${interaction.user.username.slice(0, 15)}`;
      let thread;
      try {
        thread = await (channel as TextChannel).threads.create({
          name: threadName,
          type: ChannelType.PrivateThread,
          autoArchiveDuration: 1440,
          reason: `Support ticket by ${interaction.user.tag}`,
        });
      } catch {
        thread = await (channel as TextChannel).threads.create({
          name: threadName,
          type: ChannelType.PublicThread,
          autoArchiveDuration: 1440,
          reason: `Support ticket by ${interaction.user.tag}`,
        });
      }

      await thread.members.add(interaction.user.id).catch(() => null);

      const ticket = await client.db.ticket.create({
        data: {
          guildId,
          channelId: thread.id,
          creatorId: interaction.user.id,
          status: "OPEN",
        },
      });

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`ticket_close:${ticket.id}`)
          .setLabel("Close Ticket")
          .setStyle(ButtonStyle.Danger)
          .setEmoji("🔒")
      );

      const staffPings = (config.supportRoleIds || [])
        .map((rId: string) => `<@&${rId}>`)
        .join(" ");

      const welcomeEmbed = new EmbedBuilder()
        .setTitle("🎫 Support Ticket Opened")
        .setDescription(
          `Hello <@${interaction.user.id}>! Server staff have been notified.\nPlease explain your issue or request in detail.`
        )
        .setColor(0x10b981)
        .addFields(
          { name: "Ticket ID", value: `\`${ticket.id.slice(0, 8)}\``, inline: true },
          { name: "Creator", value: interaction.user.tag, inline: true }
        )
        .setFooter({ text: "Tortuga Support Desk" })
        .setTimestamp();

      await thread.send({
        content: staffPings ? `${staffPings} <@${interaction.user.id}>` : `<@${interaction.user.id}>`,
        embeds: [welcomeEmbed],
        components: [row],
      });

      await interaction.reply({
        content: `Your ticket has been created: <#${thread.id}>`,
        ephemeral: true,
      });
    } catch (err) {
      logger.error("Error creating ticket", err);
      if (!interaction.replied) {
        await interaction.reply({
          content: "Failed to open ticket. Please contact staff.",
          ephemeral: true,
        });
      }
    }
  }

  public static async handleCloseButton(
    interaction: ButtonInteraction,
    client: TortugaClient,
    ticketId: string
  ): Promise<void> {
    try {
      const ticket = await client.db.ticket.findUnique({
        where: { id: ticketId },
      });

      if (!ticket) {
        await interaction.reply({ content: "Ticket record not found.", ephemeral: true });
        return;
      }

      await interaction.reply({
        content: `🔒 Ticket is being closed by <@${interaction.user.id}>...`,
      });

      const thread = interaction.channel;
      if (thread && thread.isThread()) {
        let transcriptText = `--- TICKET TRANSCRIPT [${ticket.id}] ---\n`;
        const messages = await thread.messages.fetch({ limit: 100 });
        for (const msg of Array.from(messages.values()).reverse()) {
          transcriptText += `[${msg.createdAt.toISOString()}] ${msg.author.tag}: ${msg.content}\n`;
        }

        await client.db.ticket.update({
          where: { id: ticketId },
          data: {
            status: "CLOSED",
            closedBy: interaction.user.id,
            closedAt: new Date(),
            transcript: transcriptText,
          },
        });

        const config = await client.db.ticketConfig.findUnique({
          where: { guildId: ticket.guildId },
        });

        if (config?.transcriptChannelId) {
          const archiveChan = interaction.guild?.channels.cache.get(config.transcriptChannelId);
          if (archiveChan && archiveChan.isTextBased()) {
            const archiveEmbed = new EmbedBuilder()
              .setTitle(`📑 Ticket Closed: #${thread.name}`)
              .setColor(0x71717a)
              .addFields(
                { name: "Creator", value: `<@${ticket.creatorId}>`, inline: true },
                { name: "Closed By", value: `<@${interaction.user.id}>`, inline: true },
                { name: "Messages", value: `${messages.size}`, inline: true }
              )
              .setTimestamp();

            await archiveChan.send({
              embeds: [archiveEmbed],
              files: [
                {
                  attachment: Buffer.from(transcriptText, "utf-8"),
                  name: `transcript-${ticket.id.slice(0, 8)}.txt`,
                },
              ],
            }).catch(() => null);
          }
        }

        await thread.setLocked(true).catch(() => null);
        await thread.setArchived(true).catch(() => null);
      }
    } catch (err) {
      logger.error("Error closing ticket", err);
    }
  }
}
