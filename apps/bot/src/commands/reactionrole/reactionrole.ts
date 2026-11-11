import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChatInputCommandInteraction,
  TextChannel,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
import { ReactionRoleType } from "@tortuga/config";
import { DatabaseService } from "../../utils/db-fallback.js";
import { BotEmbed, EMBED_COLORS } from "../../utils/embed-builder.js";
import type { TortugaCommand } from "../../types.js";
import type { TortugaClient } from "../../client.js";

export const reactionRoleCommand: TortugaCommand = {
  data: new SlashCommandBuilder()
    .setName("reactionrole")
    .setDescription("Configure and manage reaction roles")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addSubcommand((sub) =>
      sub
        .setName("create")
        .setDescription("Create a reaction role prompt with reactions or buttons")
        .addStringOption((opt) =>
          opt
            .setName("type")
            .setDescription("The reaction role mode")
            .setRequired(true)
            .addChoices(
              { name: "Normal (Toggle on/off)", value: ReactionRoleType.NORMAL },
              { name: "Unique (Single choice)", value: ReactionRoleType.UNIQUE },
              { name: "Verify (Auto-unreact)", value: ReactionRoleType.VERIFY },
              { name: "Reverse (React to remove)", value: ReactionRoleType.REVERSE },
              { name: "Binding (Permanent grant)", value: ReactionRoleType.BINDING },
              { name: "Drop (Permanent remove)", value: ReactionRoleType.DROP },
              { name: "Limit (Max N roles)", value: ReactionRoleType.LIMIT }
            )
        )
        .addRoleOption((opt) =>
          opt.setName("role").setDescription("The role to grant").setRequired(true)
        )
        .addStringOption((opt) =>
          opt.setName("emoji").setDescription("Emoji to react with (e.g. ⭐, 🎮)").setRequired(true)
        )
        .addStringOption((opt) =>
          opt.setName("title").setDescription("Title of the reaction role embed").setRequired(false)
        )
        .addStringOption((opt) =>
          opt.setName("description").setDescription("Custom description for prompt").setRequired(false)
        )
        .addBooleanOption((opt) =>
          opt.setName("use_buttons").setDescription("Display as interactive buttons").setRequired(false)
        )
        .addIntegerOption((opt) =>
          opt.setName("max_roles").setDescription("Max roles (for Limit mode)").setRequired(false)
        )
        .addIntegerOption((opt) =>
          opt.setName("timed_hours").setDescription("Hours before role is removed (Timed RR)").setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("add")
        .setDescription("Add an emoji-role mapping to an existing message")
        .addStringOption((opt) =>
          opt.setName("message_id").setDescription("Snowflake ID of the message").setRequired(true)
        )
        .addStringOption((opt) =>
          opt.setName("emoji").setDescription("Emoji to react with").setRequired(true)
        )
        .addRoleOption((opt) =>
          opt.setName("role").setDescription("The role to assign").setRequired(true)
        )
        .addStringOption((opt) =>
          opt
            .setName("type")
            .setDescription("Reaction role mode")
            .setRequired(false)
            .addChoices(
              { name: "Normal", value: ReactionRoleType.NORMAL },
              { name: "Unique", value: ReactionRoleType.UNIQUE },
              { name: "Verify", value: ReactionRoleType.VERIFY }
            )
        )
    ),
  category: "Reaction Roles",
  async execute(interaction: ChatInputCommandInteraction, client: TortugaClient) {
    const subcommand = interaction.options.getSubcommand();
    const guild = interaction.guild!;
    const channel = interaction.channel as TextChannel;

    if (subcommand === "create") {
      const type = interaction.options.getString("type", true) as ReactionRoleType;
      const role = interaction.options.getRole("role", true);
      const emoji = interaction.options.getString("emoji", true);
      const title = interaction.options.getString("title") || "Reaction Roles";
      const description =
        interaction.options.getString("description") ||
        `React or click below to receive ${role.toString()}!`;
      const useButtons = interaction.options.getBoolean("use_buttons") ?? false;
      const maxRoles = interaction.options.getInteger("max_roles") ?? 0;
      const timedHours = interaction.options.getInteger("timed_hours") ?? 0;

      const embed = BotEmbed.base()
        .setColor(EMBED_COLORS.primary)
        .setTitle(`🎭 ${title}`)
        .setDescription(`${description}\n\n${emoji} — ${role.toString()}`)
        .setFooter({ text: `Mode: ${type}${timedHours > 0 ? ` | Timed: ${timedHours}h` : ""}` });

      if (useButtons) {
        // Send with button
        // First create record to get groupId
        const tempMsg = await channel.send({ embeds: [embed] });
        const group = await DatabaseService.createReactionRoleGroup({
          guildId: guild.id,
          channelId: channel.id,
          messageId: tempMsg.id,
          type,
          maxRoles,
          timedHours,
          items: [{ emoji, roleId: role.id, label: role.name, style: "Primary" }],
        });

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId(`rr:btn:${group.id}:${role.id}`)
            .setLabel(role.name)
            .setStyle(ButtonStyle.Primary)
            .setEmoji(emoji)
        );

        await tempMsg.edit({ components: [row] });
      } else {
        // Standard reaction emoji
        const msg = await channel.send({ embeds: [embed] });
        await msg.react(emoji).catch(() => null);

        await DatabaseService.createReactionRoleGroup({
          guildId: guild.id,
          channelId: channel.id,
          messageId: msg.id,
          type,
          maxRoles,
          timedHours,
          items: [{ emoji, roleId: role.id }],
        });
      }

      await interaction.reply({
        content: `✅ Reaction role setup complete! Mode: **${type}**`,
        ephemeral: true,
      });
    } else if (subcommand === "add") {
      const messageId = interaction.options.getString("message_id", true);
      const emoji = interaction.options.getString("emoji", true);
      const role = interaction.options.getRole("role", true);
      const type = (interaction.options.getString("type") as ReactionRoleType) || ReactionRoleType.NORMAL;

      const targetMsg = await channel.messages.fetch(messageId).catch(() => null);
      if (!targetMsg) {
        await interaction.reply({
          embeds: [BotEmbed.error("Message Not Found", "Could not locate that message in this channel.")],
          ephemeral: true,
        });
        return;
      }

      await targetMsg.react(emoji).catch(() => null);

      await DatabaseService.createReactionRoleGroup({
        guildId: guild.id,
        channelId: channel.id,
        messageId: targetMsg.id,
        type,
        items: [{ emoji, roleId: role.id }],
      });

      await interaction.reply({
        embeds: [
          BotEmbed.success(
            "Reaction Role Added",
            `Bound ${emoji} to ${role.toString()} on message \`${messageId}\`.`
          ),
        ],
        ephemeral: true,
      });
    }
  },
};
