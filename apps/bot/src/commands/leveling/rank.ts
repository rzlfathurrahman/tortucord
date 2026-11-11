import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  GuildMember,
} from "discord.js";
import { LevelingModule } from "../../modules/leveling/index.js";
import type { TortugaCommand } from "../../types.js";
import type { TortugaClient } from "../../client.js";

export const rankCommand: TortugaCommand = {
  data: new SlashCommandBuilder()
    .setName("rank")
    .setDescription("View your or another member's leveling rank and stats")
    .addUserOption((opt) =>
      opt.setName("user").setDescription("The user whose rank you want to view").setRequired(false)
    ),
  category: "Leveling",
  prefixAliases: ["level", "xp"],
  async execute(interaction: ChatInputCommandInteraction, client: TortugaClient) {
    const targetUser = interaction.options.getUser("user") || interaction.user;
    const guild = interaction.guild!;
    const member = await guild.members.fetch(targetUser.id).catch(() => null);

    const embed = await LevelingModule.getRankEmbed(guild.id, targetUser, member);
    await interaction.reply({ embeds: [embed] });
  },
  async executePrefix(message, args, client) {
    const target = message.mentions.users.first() || message.author;
    const embed = await LevelingModule.getRankEmbed(message.guild!.id, target, message.member);
    if ("send" in message.channel) {
      await message.channel.send({ embeds: [embed] });
    }
  },
};
