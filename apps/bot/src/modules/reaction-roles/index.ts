import {
  MessageReaction,
  User,
  GuildMember,
  ButtonInteraction,
  StringSelectMenuInteraction,
} from "discord.js";
import { ReactionRoleType } from "@tortuga/config";
import { DatabaseService } from "../../utils/db-fallback.js";
import { logger } from "../../utils/logger.js";
import type { TortugaClient } from "../../client.js";

export class ReactionRoleModule {
  /**
   * Handle reaction addition on a message.
   */
  public static async handleReactionAdd(
    reaction: MessageReaction,
    user: User,
    client: TortugaClient
  ): Promise<void> {
    if (user.bot || !reaction.message.guild) return;

    const guild = reaction.message.guild;
    const member = await guild.members.fetch(user.id).catch(() => null);
    if (!member) return;

    // Fetch RR groups matching this message
    const groups = await DatabaseService.getReactionRoleGroups(guild.id, reaction.message.id);
    if (!groups || groups.length === 0) return;

    const emojiIdentifier = reaction.emoji.id ?? reaction.emoji.name;
    if (!emojiIdentifier) return;

    for (const group of groups) {
      const targetItem = group.items.find(
        (it: any) => it.emoji === emojiIdentifier || it.emoji === reaction.emoji.name
      );
      if (!targetItem) continue;

      const role = guild.roles.cache.get(targetItem.roleId);
      if (!role) continue;

      await this.applyRoleAddLogic(group, targetItem, member, reaction, client);
    }
  }

  /**
   * Handle reaction removal from a message.
   */
  public static async handleReactionRemove(
    reaction: MessageReaction,
    user: User,
    client: TortugaClient
  ): Promise<void> {
    if (user.bot || !reaction.message.guild) return;

    const guild = reaction.message.guild;
    const member = await guild.members.fetch(user.id).catch(() => null);
    if (!member) return;

    const groups = await DatabaseService.getReactionRoleGroups(guild.id, reaction.message.id);
    if (!groups || groups.length === 0) return;

    const emojiIdentifier = reaction.emoji.id ?? reaction.emoji.name;
    if (!emojiIdentifier) return;

    for (const group of groups) {
      const targetItem = group.items.find(
        (it: any) => it.emoji === emojiIdentifier || it.emoji === reaction.emoji.name
      );
      if (!targetItem) continue;

      await this.applyRoleRemoveLogic(group, targetItem, member, reaction, client);
    }
  }

  /**
   * Handle Button interaction for reaction roles.
   * Format: rr:btn:<groupId>:<roleId>
   */
  public static async handleButton(
    interaction: ButtonInteraction,
    client: TortugaClient
  ): Promise<void> {
    const parts = interaction.customId.split(":");
    if (parts.length < 4 || parts[0] !== "rr" || parts[1] !== "btn") return;

    const groupId = parts[2];
    const roleId = parts[3];

    const guild = interaction.guild;
    if (!guild || !interaction.member) return;
    const member = interaction.member as GuildMember;

    const groups = await DatabaseService.getReactionRoleGroups(guild.id);
    const group = groups.find((g: any) => g.id === groupId);
    if (!group) {
      await interaction.reply({ content: "Reaction role group no longer exists.", ephemeral: true });
      return;
    }

    const item = group.items.find((it: any) => it.roleId === roleId);
    if (!item) {
      await interaction.reply({ content: "Role option not found.", ephemeral: true });
      return;
    }

    const hasRole = member.roles.cache.has(roleId);
    let replyMsg = "";

    switch (group.type) {
      case ReactionRoleType.NORMAL: {
        if (hasRole) {
          await member.roles.remove(roleId).catch(() => null);
          replyMsg = `Removed <@&${roleId}>`;
        } else {
          await member.roles.add(roleId).catch(() => null);
          replyMsg = `Added <@&${roleId}>`;
        }
        break;
      }
      case ReactionRoleType.UNIQUE: {
        for (const it of group.items) {
          if (it.roleId !== roleId && member.roles.cache.has(it.roleId)) {
            await member.roles.remove(it.roleId).catch(() => null);
          }
        }
        await member.roles.add(roleId).catch(() => null);
        replyMsg = `Set your role to <@&${roleId}>`;
        break;
      }
      case ReactionRoleType.VERIFY: {
        await member.roles.add(roleId).catch(() => null);
        replyMsg = `Verified! Granted <@&${roleId}>`;
        break;
      }
      case ReactionRoleType.REVERSE: {
        if (hasRole) {
          await member.roles.remove(roleId).catch(() => null);
          replyMsg = `Removed <@&${roleId}>`;
        } else {
          await member.roles.add(roleId).catch(() => null);
          replyMsg = `Restored <@&${roleId}>`;
        }
        break;
      }
      case ReactionRoleType.BINDING: {
        if (!hasRole) {
          await member.roles.add(roleId).catch(() => null);
          replyMsg = `Permanently bound <@&${roleId}>`;
        } else {
          replyMsg = `This role is bound and cannot be removed.`;
        }
        break;
      }
      case ReactionRoleType.DROP: {
        if (hasRole) {
          await member.roles.remove(roleId).catch(() => null);
          replyMsg = `Dropped <@&${roleId}>`;
        } else {
          replyMsg = `You do not have this role to drop.`;
        }
        break;
      }
      case ReactionRoleType.LIMIT: {
        const groupRoleIds = group.items.map((i: any) => i.roleId);
        const currentCount = member.roles.cache.filter((r) => groupRoleIds.includes(r.id)).size;
        if (hasRole) {
          await member.roles.remove(roleId).catch(() => null);
          replyMsg = `Removed <@&${roleId}>`;
        } else if (group.maxRoles > 0 && currentCount >= group.maxRoles) {
          replyMsg = `You can only have up to ${group.maxRoles} roles in this group.`;
        } else {
          await member.roles.add(roleId).catch(() => null);
          replyMsg = `Added <@&${roleId}>`;
        }
        break;
      }
      default: {
        if (hasRole) {
          await member.roles.remove(roleId).catch(() => null);
          replyMsg = `Removed <@&${roleId}>`;
        } else {
          await member.roles.add(roleId).catch(() => null);
          replyMsg = `Added <@&${roleId}>`;
        }
      }
    }

    await interaction.reply({ content: replyMsg, ephemeral: true }).catch(() => null);
  }

  /**
   * Handle String Select Menu interaction for reaction roles.
   * Format: rr:select:<groupId>
   */
  public static async handleSelectMenu(
    interaction: StringSelectMenuInteraction,
    client: TortugaClient
  ): Promise<void> {
    const parts = interaction.customId.split(":");
    if (parts.length < 3 || parts[0] !== "rr" || parts[1] !== "select") return;

    const groupId = parts[2];
    const guild = interaction.guild;
    if (!guild || !interaction.member) return;
    const member = interaction.member as GuildMember;

    const groups = await DatabaseService.getReactionRoleGroups(guild.id);
    const group = groups.find((g: any) => g.id === groupId);
    if (!group) {
      await interaction.reply({ content: "Reaction role menu expired.", ephemeral: true });
      return;
    }

    const selectedRoleIds = interaction.values;
    const groupRoleIds = group.items.map((it: any) => it.roleId);

    if (group.type === ReactionRoleType.UNIQUE) {
      // Remove all roles from group, add the single chosen role
      const chosenRoleId = selectedRoleIds[0];
      for (const rId of groupRoleIds) {
        if (rId !== chosenRoleId && member.roles.cache.has(rId)) {
          await member.roles.remove(rId).catch(() => null);
        }
      }
      if (chosenRoleId) {
        await member.roles.add(chosenRoleId).catch(() => null);
      }
      await interaction.reply({
        content: `Your role has been updated to <@&${chosenRoleId}>.`,
        ephemeral: true,
      });
      return;
    }

    // For other modes, sync selected roles with member roles
    for (const rId of groupRoleIds) {
      const shouldHave = selectedRoleIds.includes(rId);
      const currentlyHas = member.roles.cache.has(rId);

      if (shouldHave && !currentlyHas) {
        await member.roles.add(rId).catch(() => null);
      } else if (!shouldHave && currentlyHas && group.type !== ReactionRoleType.BINDING) {
        await member.roles.remove(rId).catch(() => null);
      }
    }

    await interaction.reply({
      content: "Your roles have been updated!",
      ephemeral: true,
    });
  }

  private static async applyRoleAddLogic(
    group: any,
    item: any,
    member: GuildMember,
    reaction: MessageReaction,
    client: TortugaClient
  ): Promise<void> {
    const roleId = item.roleId;

    switch (group.type) {
      case ReactionRoleType.NORMAL: {
        await member.roles.add(roleId).catch((err) => logger.error("Failed to add role", err));
        break;
      }
      case ReactionRoleType.UNIQUE: {
        // Remove all other roles in group
        for (const it of group.items) {
          if (it.roleId !== roleId && member.roles.cache.has(it.roleId)) {
            await member.roles.remove(it.roleId).catch(() => null);
          }
        }
        await member.roles.add(roleId).catch(() => null);
        break;
      }
      case ReactionRoleType.VERIFY: {
        await member.roles.add(roleId).catch(() => null);
        // Clean user's reaction to keep verify box clean
        await reaction.users.remove(member.id).catch(() => null);
        break;
      }
      case ReactionRoleType.REVERSE: {
        // Reverse mode: reacting removes role
        await member.roles.remove(roleId).catch(() => null);
        break;
      }
      case ReactionRoleType.BINDING: {
        // Binding mode: grant role, user cannot unreact to remove
        await member.roles.add(roleId).catch(() => null);
        break;
      }
      case ReactionRoleType.DROP: {
        // Drop mode: react to drop role permanently
        await member.roles.remove(roleId).catch(() => null);
        break;
      }
      case ReactionRoleType.LIMIT: {
        const groupRoleIds = group.items.map((i: any) => i.roleId);
        const currentRoles = member.roles.cache.filter((r) => groupRoleIds.includes(r.id)).size;
        if (group.maxRoles > 0 && currentRoles >= group.maxRoles) {
          // Reached limit: remove reaction
          await reaction.users.remove(member.id).catch(() => null);
          await member.send(`⚠️ You can only select up to ${group.maxRoles} roles in **${member.guild.name}**.`).catch(() => null);
          return;
        }
        await member.roles.add(roleId).catch(() => null);
        break;
      }
      default: {
        await member.roles.add(roleId).catch(() => null);
      }
    }

    // Handle Timed Reaction Roles (if timedHours > 0)
    if (group.timedHours && group.timedHours > 0) {
      this.scheduleTimedRoleRemoval(member.guild.id, member.id, roleId, group.timedHours, client);
    }
  }

  private static async applyRoleRemoveLogic(
    group: any,
    item: any,
    member: GuildMember,
    reaction: MessageReaction,
    client: TortugaClient
  ): Promise<void> {
    const roleId = item.roleId;

    switch (group.type) {
      case ReactionRoleType.NORMAL: {
        await member.roles.remove(roleId).catch(() => null);
        break;
      }
      case ReactionRoleType.UNIQUE: {
        await member.roles.remove(roleId).catch(() => null);
        break;
      }
      case ReactionRoleType.VERIFY: {
        // Removing reaction on verify does nothing
        break;
      }
      case ReactionRoleType.REVERSE: {
        // Reverse mode: unreacting re-adds the role
        await member.roles.add(roleId).catch(() => null);
        break;
      }
      case ReactionRoleType.BINDING: {
        // Binding mode: unreacting does NOT remove the role
        break;
      }
      case ReactionRoleType.DROP: {
        // Drop mode: unreacting does not restore role
        break;
      }
      case ReactionRoleType.LIMIT: {
        await member.roles.remove(roleId).catch(() => null);
        break;
      }
      default: {
        await member.roles.remove(roleId).catch(() => null);
      }
    }
  }

  private static scheduleTimedRoleRemoval(
    guildId: string,
    userId: string,
    roleId: string,
    hours: number,
    client: TortugaClient
  ): void {
    const durationMs = hours * 3600 * 1000;
    setTimeout(async () => {
      try {
        const guild = client.guilds.cache.get(guildId);
        if (!guild) return;
        const member = await guild.members.fetch(userId).catch(() => null);
        if (!member) return;
        if (member.roles.cache.has(roleId)) {
          await member.roles.remove(roleId);
          logger.info(`Removed timed reaction role ${roleId} from user ${userId} after ${hours}h`);
        }
      } catch (err) {
        logger.error("Error executing timed role removal", err);
      }
    }, durationMs).unref();
  }
}
