import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  Message,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from "discord.js";
import type { TortugaCommand } from "../../types.js";
import { EMBED_COLORS } from "../../utils/embed-builder.js";
import { APP_CONFIG } from "@tortuga/config";
import type { TortugaClient } from "../../client.js";

export function buildHelpEmbed(category = "overview", clientUser?: any): EmbedBuilder {
  const embed = new EmbedBuilder().setTimestamp();

  if (category === "moderation") {
    embed
      .setColor(EMBED_COLORS.danger)
      .setTitle("🛡️ Moderation Commands")
      .setDescription("Robust moderation suite with full case infraction logging.")
      .addFields(
        { name: "`/warn <user> [reason]`", value: "Issue a formal infraction warning to a member.", inline: false },
        { name: "`/timeout <user> <duration> [reason]`", value: "Temporarily mute/timeout a member (e.g. `10m`, `1h`, `1d`).", inline: false },
        { name: "`/kick <user> [reason]`", value: "Kick a disruptive user from the server.", inline: false },
        { name: "`/ban <user> [days_delete] [reason]`", value: "Ban a member and optionally purge recent messages.", inline: false },
        { name: "`/purge <amount> [user] [filter]`", value: "Bulk delete up to 100 messages with optional filter criteria.", inline: false }
      );
  } else if (category === "reactionrole") {
    embed
      .setColor(EMBED_COLORS.primary)
      .setTitle("🎭 Reaction Roles")
      .setDescription("Unlimited reaction roles supporting Normal, Unique, Verify, Drop, and Buttons/SelectMenus.")
      .addFields(
        { name: "`/reactionrole create`", value: "Interactive prompt to bind emoji/button roles to any message.", inline: false },
        { name: "`/reactionrole list`", value: "View all active reaction role groups in this server.", inline: false },
        { name: "`/reactionrole delete <id>`", value: "Remove a reaction role group configuration.", inline: false },
        { name: "🌐 Visual Web Configurator", value: "Configure complex multi-role dropdowns at [Web Dashboard](http://localhost:3000).", inline: false }
      );
  } else if (category === "leveling") {
    embed
      .setColor(EMBED_COLORS.gold)
      .setTitle("🏆 Leveling & XP")
      .setDescription("100% free server-wide XP with customizable role rewards and text/voice gains.")
      .addFields(
        { name: "`/rank [user]`", value: "Show level, current XP progress bar, rank, and message count.", inline: false },
        { name: "`/leaderboard [page]`", value: "View the server top 10 most active members.", inline: false },
        { name: "🌐 Public Web Leaderboard", value: "View beautiful full leaderboard with badges at [Web Dashboard](http://localhost:3000).", inline: false }
      );
  } else if (category === "utility") {
    embed
      .setColor(EMBED_COLORS.info)
      .setTitle("📌 Utility & Automations")
      .setDescription("Essential community tools inspired by Carl-bot.")
      .addFields(
        { name: "`/sticky set <channel> <message>`", value: "Pin dynamic message that always stays at bottom of channel.", inline: false },
        { name: "`/sticky list`", value: "Show all active sticky messages in the server.", inline: false },
        { name: "`/suggest <idea>`", value: "Submit a community suggestion with voting buttons.", inline: false },
        { name: "`/starboard setup <channel> [stars]`", value: "Configure starboard channel for highlight messages.", inline: false },
        { name: "`/embed create`", value: "Dispatch formatted rich embeds directly from Discord.", inline: false }
      );
  } else {
    // Overview
    embed
      .setColor(EMBED_COLORS.primary)
      .setTitle("🐢 Tortuga Bot — Command & Feature Guide")
      .setDescription(
        "**Tortuga** is a high-performance open-source alternative to Carl-bot with **all premium features unlocked 100% free**.\n\n" +
        "Select a module from the dropdown below or use slash commands directly!"
      )
      .addFields(
        {
          name: "🛡️ Moderation",
          value: "`/warn`, `/timeout`, `/kick`, `/ban`, `/purge`\nAutoMod with spam/invite filters & Drama Watcher.",
          inline: true,
        },
        {
          name: "🎭 Reaction Roles",
          value: "`/reactionrole create`, `/reactionrole list`\nUnlimited groups, buttons, and select menus.",
          inline: true,
        },
        {
          name: "🏆 Leveling & XP",
          value: "`/rank`, `/leaderboard`\nChat + Voice XP with automatic role rewards.",
          inline: true,
        },
        {
          name: "📌 Utility & Sticky",
          value: "`/sticky set`, `/suggest`, `/starboard`, `/embed`\nPersistent sticky messages and starboard.",
          inline: true,
        },
        {
          name: "🌐 Web Dashboard",
          value: "Manage everything visually via interactive GUI:\n👉 **[http://localhost:3000](http://localhost:3000)**",
          inline: true,
        },
        {
          name: "⌨️ Custom Commands",
          value: "Build advanced dynamic commands with TagScript tags like `{user}`, `{if(cond):then|else}`.",
          inline: true,
        }
      );
  }

  embed.setFooter({
    text: `Tortuga • Prefix: ! • Type /help [module] for specific info`,
    iconURL: clientUser?.displayAvatarURL?.() || undefined,
  });

  return embed;
}

export function buildHelpComponents(): [ActionRowBuilder<StringSelectMenuBuilder>, ActionRowBuilder<ButtonBuilder>] {
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId("help:category")
    .setPlaceholder("📂 Select a module to view commands...")
    .addOptions([
      {
        label: "Overview & Features",
        description: "General introduction and overview",
        value: "overview",
        emoji: "🐢",
      },
      {
        label: "Moderation",
        description: "Ban, Kick, Timeout, Warn, Purge",
        value: "moderation",
        emoji: "🛡️",
      },
      {
        label: "Reaction Roles",
        description: "Self-assignable roles and menus",
        value: "reactionrole",
        emoji: "🎭",
      },
      {
        label: "Leveling & XP",
        description: "XP ranks, role rewards, leaderboards",
        value: "leveling",
        emoji: "🏆",
      },
      {
        label: "Utility & Sticky",
        description: "Sticky messages, suggestions, starboard",
        value: "utility",
        emoji: "📌",
      },
    ]);

  const selectRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

  const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setLabel("Open Web Dashboard")
      .setStyle(ButtonStyle.Link)
      .setURL("http://localhost:3000/dashboard")
      .setEmoji("🌐"),
    new ButtonBuilder()
      .setLabel("GitHub Repository")
      .setStyle(ButtonStyle.Link)
      .setURL("https://github.com")
      .setEmoji("⭐")
  );

  return [selectRow, buttonRow];
}

export const helpCommand: TortugaCommand = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Display Tortuga commands, modules, and web dashboard guide")
    .addStringOption((opt) =>
      opt
        .setName("module")
        .setDescription("Specific module to get help for")
        .setRequired(false)
        .addChoices(
          { name: "🛡️ Moderation", value: "moderation" },
          { name: "🎭 Reaction Roles", value: "reactionrole" },
          { name: "🏆 Leveling", value: "leveling" },
          { name: "📌 Utility", value: "utility" }
        )
    ),
  category: "utility",
  prefixAliases: ["commands", "cmds"],

  async execute(interaction: ChatInputCommandInteraction, client: TortugaClient) {
    const selectedModule = interaction.options.getString("module") || "overview";
    const embed = buildHelpEmbed(selectedModule, client.user);
    const [selectRow, buttonRow] = buildHelpComponents();

    await interaction.reply({
      embeds: [embed],
      components: [selectRow, buttonRow],
    });
  },

  async executePrefix(message: Message, args: string[], client: TortugaClient) {
    const moduleArg = args[0]?.toLowerCase();
    let category = "overview";
    if (moduleArg && ["mod", "moderation"].includes(moduleArg)) category = "moderation";
    if (moduleArg && ["rr", "roles", "reactionrole"].includes(moduleArg)) category = "reactionrole";
    if (moduleArg && ["level", "xp", "leveling"].includes(moduleArg)) category = "leveling";
    if (moduleArg && ["util", "utility", "sticky"].includes(moduleArg)) category = "utility";

    const embed = buildHelpEmbed(category, client.user);
    const [selectRow, buttonRow] = buildHelpComponents();

    await message.reply({
      embeds: [embed],
      components: [selectRow, buttonRow],
    });
  },
};
