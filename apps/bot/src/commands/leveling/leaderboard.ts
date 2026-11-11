import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
} from "discord.js";
import { LevelingModule } from "../../modules/leveling/index.js";
import type { TortugaCommand } from "../../types.js";
import type { TortugaClient } from "../../client.js";

export const leaderboardCommand: TortugaCommand = {
  data: new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription("Display the server's top leveling leaderboard"),
  category: "Leveling",
  prefixAliases: ["top", "lb"],
  async execute(interaction: ChatInputCommandInteraction, client: TortugaClient) {
    const guild = interaction.guild!;
    const embed = await LevelingModule.getLeaderboardEmbed(guild.id, guild.name);
    await interaction.reply({ embeds: [embed] });
  },
  async executePrefix(message, args, client) {
    const guild = message.guild!;
    const embed = await LevelingModule.getLeaderboardEmbed(guild.id, guild.name);
    if ("send" in message.channel) {
      await message.channel.send({ embeds: [embed] });
    }
  },
};
