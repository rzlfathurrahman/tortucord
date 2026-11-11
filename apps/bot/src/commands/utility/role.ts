import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  EmbedBuilder,
  GuildMember,
  Role,
  ColorResolvable,
} from "discord.js";
import type { TortugaCommand } from "../../types.js";
import type { TortugaClient } from "../../client.js";
import { logger } from "../../utils/logger.js";

const NAMED_COLORS: Record<string, number> = {
  red: 0xef4444,
  blue: 0x3b82f6,
  green: 0x22c55e,
  yellow: 0xeab308,
  purple: 0xa855f7,
  cyan: 0x06b6d4,
  orange: 0xf97316,
  pink: 0xec4899,
  white: 0xffffff,
  black: 0x000000,
  gray: 0x6b7280,
};

function parseColor(input?: string | null): number | undefined {
  if (!input) return undefined;
  const clean = input.trim().toLowerCase();
  if (NAMED_COLORS[clean] !== undefined) {
    return NAMED_COLORS[clean];
  }
  const hex = clean.replace("#", "");
  if (/^[0-9a-f]{6}$/i.test(hex)) {
    return parseInt(hex, 16);
  }
  return undefined;
}

export const roleCommand: TortugaCommand = {
  data: new SlashCommandBuilder()
    .setName("role")
    .setDescription("Kelola Role Discord (CRUD: Create, Read, Update, Delete, Assign)")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    // 1. CREATE
    .addSubcommand((sub) =>
      sub
        .setName("create")
        .setDescription("Buat role baru di server")
        .addStringOption((opt) =>
          opt.setName("name").setDescription("Nama role yang ingin dibuat").setRequired(true)
        )
        .addStringOption((opt) =>
          opt
            .setName("color")
            .setDescription("Warna role (hex: #3b82f6 atau nama: blue, green, red, cyan, dll.)")
            .setRequired(false)
        )
        .addBooleanOption((opt) =>
          opt
            .setName("hoist")
            .setDescription("Tampilkan role terpisah di daftar anggota online (default: false)")
            .setRequired(false)
        )
        .addBooleanOption((opt) =>
          opt
            .setName("mentionable")
            .setDescription("Izinkan role di-mention oleh siapa saja (default: false)")
            .setRequired(false)
        )
    )
    // 2. EDIT
    .addSubcommand((sub) =>
      sub
        .setName("edit")
        .setDescription("Ubah nama, warna, atau pengaturan role yang sudah ada")
        .addRoleOption((opt) =>
          opt.setName("role").setDescription("Role yang ingin diedit").setRequired(true)
        )
        .addStringOption((opt) =>
          opt.setName("name").setDescription("Nama baru untuk role").setRequired(false)
        )
        .addStringOption((opt) =>
          opt
            .setName("color")
            .setDescription("Warna baru (hex: #3b82f6 atau nama: blue, green, red, cyan, dll.)")
            .setRequired(false)
        )
        .addBooleanOption((opt) =>
          opt
            .setName("hoist")
            .setDescription("Tampilkan terpisah di daftar anggota online")
            .setRequired(false)
        )
        .addBooleanOption((opt) =>
          opt
            .setName("mentionable")
            .setDescription("Izinkan role di-mention oleh siapa saja")
            .setRequired(false)
        )
    )
    // 3. DELETE
    .addSubcommand((sub) =>
      sub
        .setName("delete")
        .setDescription("Hapus role dari server")
        .addRoleOption((opt) =>
          opt.setName("role").setDescription("Role yang ingin dihapus").setRequired(true)
        )
        .addStringOption((opt) =>
          opt.setName("reason").setDescription("Alasan penghapusan role").setRequired(false)
        )
    )
    // 4. ADD / ASSIGN
    .addSubcommand((sub) =>
      sub
        .setName("add")
        .setDescription("Berikan role kepada member")
        .addUserOption((opt) =>
          opt.setName("member").setDescription("Member yang akan diberikan role").setRequired(true)
        )
        .addRoleOption((opt) =>
          opt.setName("role").setDescription("Role yang akan diberikan").setRequired(true)
        )
    )
    // 5. REMOVE
    .addSubcommand((sub) =>
      sub
        .setName("remove")
        .setDescription("Cabut role dari member")
        .addUserOption((opt) =>
          opt.setName("member").setDescription("Member yang rolenya akan dicabut").setRequired(true)
        )
        .addRoleOption((opt) =>
          opt.setName("role").setDescription("Role yang akan dicabut").setRequired(true)
        )
    )
    // 6. INFO
    .addSubcommand((sub) =>
      sub
        .setName("info")
        .setDescription("Lihat detail informasi sebuah role")
        .addRoleOption((opt) =>
          opt.setName("role").setDescription("Role yang ingin dilihat informasinya").setRequired(true)
        )
    )
    // 7. LIST
    .addSubcommand((sub) =>
      sub.setName("list").setDescription("Lihat daftar seluruh role di server")
    ),

  async execute(interaction: ChatInputCommandInteraction, client: TortugaClient) {
    const guild = interaction.guild;
    if (!guild) {
      await interaction.reply({ content: "Perintah hanya dapat dijalankan di dalam server.", ephemeral: true });
      return;
    }

    const member = interaction.member as GuildMember;
    if (
      !member.permissions.has(PermissionFlagsBits.ManageRoles) &&
      !member.permissions.has(PermissionFlagsBits.Administrator) &&
      guild.ownerId !== interaction.user.id
    ) {
      await interaction.reply({
        content: "Kamu tidak memiliki izin Manage Roles untuk menggunakan perintah ini.",
        ephemeral: true,
      });
      return;
    }

    const botMember = guild.members.me;
    if (!botMember || !botMember.permissions.has(PermissionFlagsBits.ManageRoles)) {
      await interaction.reply({
        content: "Bot tidak memiliki izin Manage Roles di server ini.",
        ephemeral: true,
      });
      return;
    }

    const subcommand = interaction.options.getSubcommand();

    // ==========================================
    // 1. CREATE
    // ==========================================
    if (subcommand === "create") {
      await interaction.deferReply();

      const name = interaction.options.getString("name", true);
      const rawColor = interaction.options.getString("color");
      const hoist = interaction.options.getBoolean("hoist") ?? false;
      const mentionable = interaction.options.getBoolean("mentionable") ?? false;

      const parsedColor = parseColor(rawColor);

      try {
        const createdRole = await guild.roles.create({
          name,
          color: parsedColor,
          hoist,
          mentionable,
          reason: `Dibuat oleh ${interaction.user.tag} via /role create`,
        });

        const embed = new EmbedBuilder()
          .setColor(createdRole.color || 0x10b981)
          .setTitle("Role Berhasil Dibuat")
          .addFields(
            { name: "Nama", value: `<@&${createdRole.id}> (\`${createdRole.name}\`)`, inline: true },
            { name: "ID", value: `\`${createdRole.id}\``, inline: true },
            { name: "Warna", value: createdRole.hexColor, inline: true },
            { name: "Ditampilkan Terpisah (Hoist)", value: hoist ? "Ya" : "Tidak", inline: true },
            { name: "Dapat Di-mention", value: mentionable ? "Ya" : "Tidak", inline: true },
            { name: "Posisi", value: `${createdRole.position}`, inline: true }
          )
          .setFooter({ text: `Dibuat oleh ${interaction.user.tag}` })
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
      } catch (err: any) {
        logger.error("Error in /role create", err);
        await interaction.editReply({ content: `Gagal membuat role: ${err.message}` });
      }
      return;
    }

    // ==========================================
    // 2. EDIT
    // ==========================================
    if (subcommand === "edit") {
      await interaction.deferReply();

      const targetRole = interaction.options.getRole("role", true) as Role;
      const newName = interaction.options.getString("name");
      const rawColor = interaction.options.getString("color");
      const hoist = interaction.options.getBoolean("hoist");
      const mentionable = interaction.options.getBoolean("mentionable");

      if (!newName && !rawColor && hoist === null && mentionable === null) {
        await interaction.editReply({
          content: "Tentukan minimal satu atribut yang ingin diubah (name, color, hoist, atau mentionable).",
        });
        return;
      }

      if (targetRole.managed) {
        await interaction.editReply({
          content: "Role ini dikelola oleh integrasi eksternal / bot lain dan tidak dapat diubah.",
        });
        return;
      }

      if (botMember.roles.highest.comparePositionTo(targetRole) <= 0) {
        await interaction.editReply({
          content:
            `Tidak dapat mengedit role <@&${targetRole.id}> karena posisinya sama atau lebih tinggi dari role tertinggi bot Tortuga.\n` +
            `Geser role 'Tortuga' ke atas di Server Settings -> Roles agar bot dapat mengelolanya.`,
        });
        return;
      }

      try {
        const updateData: any = {};
        if (newName) updateData.name = newName;
        if (rawColor) {
          const colorVal = parseColor(rawColor);
          if (colorVal !== undefined) updateData.color = colorVal;
        }
        if (hoist !== null) updateData.hoist = hoist;
        if (mentionable !== null) updateData.mentionable = mentionable;

        const updatedRole = await targetRole.edit(updateData);

        const embed = new EmbedBuilder()
          .setColor(updatedRole.color || 0x10b981)
          .setTitle("Role Berhasil Diperbarui")
          .addFields(
            { name: "Nama", value: `<@&${updatedRole.id}> (\`${updatedRole.name}\`)`, inline: true },
            { name: "ID", value: `\`${updatedRole.id}\``, inline: true },
            { name: "Warna", value: updatedRole.hexColor, inline: true },
            { name: "Ditampilkan Terpisah (Hoist)", value: updatedRole.hoist ? "Ya" : "Tidak", inline: true },
            { name: "Dapat Di-mention", value: updatedRole.mentionable ? "Ya" : "Tidak", inline: true },
            { name: "Jumlah Anggota", value: `${updatedRole.members.size} orang`, inline: true }
          )
          .setFooter({ text: `Diperbarui oleh ${interaction.user.tag}` })
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
      } catch (err: any) {
        logger.error("Error in /role edit", err);
        await interaction.editReply({ content: `Gagal memperbarui role: ${err.message}` });
      }
      return;
    }

    // ==========================================
    // 3. DELETE
    // ==========================================
    if (subcommand === "delete") {
      await interaction.deferReply();

      const targetRole = interaction.options.getRole("role", true) as Role;
      const reason = interaction.options.getString("reason") || `Dihapus oleh ${interaction.user.tag}`;

      if (targetRole.id === guild.id) {
        await interaction.editReply({ content: "Role @everyone tidak dapat dihapus." });
        return;
      }

      if (targetRole.managed) {
        await interaction.editReply({
          content: "Role ini dikelola oleh integrasi eksternal / bot lain dan tidak dapat dihapus.",
        });
        return;
      }

      if (botMember.roles.highest.comparePositionTo(targetRole) <= 0) {
        await interaction.editReply({
          content:
            `Tidak dapat menghapus role <@&${targetRole.id}> karena posisinya sama atau lebih tinggi dari role tertinggi bot Tortuga.\n` +
            `Geser role 'Tortuga' ke atas di Server Settings -> Roles agar bot dapat mengelolanya.`,
        });
        return;
      }

      const roleName = targetRole.name;
      const memberCount = targetRole.members.size;

      try {
        await targetRole.delete(reason);

        const embed = new EmbedBuilder()
          .setColor(0xef4444)
          .setTitle("Role Berhasil Dihapus")
          .setDescription(`Role **${roleName}** telah berhasil dihapus dari server.`)
          .addFields(
            { name: "Nama Role Dihapus", value: `\`${roleName}\``, inline: true },
            { name: "Anggota Sebelumnya", value: `${memberCount} orang`, inline: true },
            { name: "Alasan", value: reason, inline: false }
          )
          .setFooter({ text: `Dihapus oleh ${interaction.user.tag}` })
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
      } catch (err: any) {
        logger.error("Error in /role delete", err);
        await interaction.editReply({ content: `Gagal menghapus role: ${err.message}` });
      }
      return;
    }

    // ==========================================
    // 4. ADD
    // ==========================================
    if (subcommand === "add") {
      await interaction.deferReply();

      const targetUser = interaction.options.getUser("member", true);
      const targetRole = interaction.options.getRole("role", true) as Role;

      if (botMember.roles.highest.comparePositionTo(targetRole) <= 0) {
        await interaction.editReply({
          content:
            `Tidak dapat memberikan role <@&${targetRole.id}> karena posisinya sama atau lebih tinggi dari role tertinggi bot Tortuga.\n` +
            `Geser role 'Tortuga' ke atas di Server Settings -> Roles agar bot dapat mengelolanya.`,
        });
        return;
      }

      try {
        const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);
        if (!targetMember) {
          await interaction.editReply({ content: "Member tidak ditemukan di server." });
          return;
        }

        if (targetMember.roles.cache.has(targetRole.id)) {
          await interaction.editReply({ content: `<@${targetMember.id}> sudah memiliki role <@&${targetRole.id}>.` });
          return;
        }

        await targetMember.roles.add(targetRole.id, `Diberikan oleh ${interaction.user.tag}`);

        const embed = new EmbedBuilder()
          .setColor(0x10b981)
          .setTitle("Role Berhasil Diberikan")
          .setDescription(`Role <@&${targetRole.id}> berhasil ditambahkan kepada <@${targetMember.id}>.`)
          .setFooter({ text: `Diproses oleh ${interaction.user.tag}` })
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
      } catch (err: any) {
        logger.error("Error in /role add", err);
        await interaction.editReply({ content: `Gagal memberikan role: ${err.message}` });
      }
      return;
    }

    // ==========================================
    // 5. REMOVE
    // ==========================================
    if (subcommand === "remove") {
      await interaction.deferReply();

      const targetUser = interaction.options.getUser("member", true);
      const targetRole = interaction.options.getRole("role", true) as Role;

      if (botMember.roles.highest.comparePositionTo(targetRole) <= 0) {
        await interaction.editReply({
          content:
            `Tidak dapat mencabut role <@&${targetRole.id}> karena posisinya sama atau lebih tinggi dari role tertinggi bot Tortuga.\n` +
            `Geser role 'Tortuga' ke atas di Server Settings -> Roles agar bot dapat mengelolanya.`,
        });
        return;
      }

      try {
        const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);
        if (!targetMember) {
          await interaction.editReply({ content: "Member tidak ditemukan di server." });
          return;
        }

        if (!targetMember.roles.cache.has(targetRole.id)) {
          await interaction.editReply({
            content: `<@${targetMember.id}> tidak memiliki role <@&${targetRole.id}>.`,
          });
          return;
        }

        await targetMember.roles.remove(targetRole.id, `Dicabut oleh ${interaction.user.tag}`);

        const embed = new EmbedBuilder()
          .setColor(0xef4444)
          .setTitle("Role Berhasil Dicabut")
          .setDescription(`Role <@&${targetRole.id}> berhasil dicabut dari <@${targetMember.id}>.`)
          .setFooter({ text: `Diproses oleh ${interaction.user.tag}` })
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
      } catch (err: any) {
        logger.error("Error in /role remove", err);
        await interaction.editReply({ content: `Gagal mencabut role: ${err.message}` });
      }
      return;
    }

    // ==========================================
    // 6. INFO
    // ==========================================
    if (subcommand === "info") {
      const targetRole = interaction.options.getRole("role", true) as Role;

      const embed = new EmbedBuilder()
        .setColor(targetRole.color || 0x3b82f6)
        .setTitle(`Informasi Role: ${targetRole.name}`)
        .addFields(
          { name: "Nama", value: `<@&${targetRole.id}> (\`${targetRole.name}\`)`, inline: true },
          { name: "ID", value: `\`${targetRole.id}\``, inline: true },
          { name: "Warna", value: targetRole.hexColor, inline: true },
          { name: "Posisi Hierarki", value: `${targetRole.position}`, inline: true },
          { name: "Ditampilkan Terpisah (Hoist)", value: targetRole.hoist ? "Ya" : "Tidak", inline: true },
          { name: "Dapat Di-mention", value: targetRole.mentionable ? "Ya" : "Tidak", inline: true },
          { name: "Dikelola Integrasi (Managed)", value: targetRole.managed ? "Ya" : "Tidak", inline: true },
          { name: "Jumlah Anggota", value: `${targetRole.members.size} orang`, inline: true },
          { name: "Dibuat Pada", value: `<t:${Math.floor(targetRole.createdTimestamp / 1000)}:R>`, inline: true }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
      return;
    }

    // ==========================================
    // 7. LIST
    // ==========================================
    if (subcommand === "list") {
      await interaction.deferReply();

      const roles = [...guild.roles.cache.values()]
        .filter((r) => r.id !== guild.id)
        .sort((a, b) => b.position - a.position);

      const embed = new EmbedBuilder()
        .setColor(0x0ea5e9)
        .setTitle(`Daftar Role Server (${roles.length} role)`)
        .setDescription(
          roles
            .slice(0, 25)
            .map(
              (r) =>
                `\`[${r.position}]\` <@&${r.id}> • \`${r.members.size} member\` ${r.managed ? "*(managed)*" : ""}`
            )
            .join("\n")
        )
        .setFooter({ text: roles.length > 25 ? `Menampilkan 25 dari total ${roles.length} role` : "" })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
      return;
    }
  },
};
