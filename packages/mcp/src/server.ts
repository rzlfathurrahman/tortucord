import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { normalizeObjectSchema } from '@modelcontextprotocol/sdk/server/zod-compat.js';
import { toJsonSchemaCompat } from '@modelcontextprotocol/sdk/server/zod-json-schema-compat.js';
import { z } from 'zod';
import { prisma, InfractionAction, AutomodAction } from '@tortuga/database';
import { discord } from './discord.js';

// Same conversion the SDK applies in its own tools/list handler.
export function toInputJsonSchema(schema: unknown): Record<string, unknown> {
  const obj = normalizeObjectSchema(schema as any);
  return obj
    ? toJsonSchemaCompat(obj, { strictUnions: true, pipeStrategy: 'input' })
    : { type: 'object', properties: {} };
}

export function createTortugaMcpServer(): McpServer {
  const server = new McpServer({
    name: 'tortuga-discord-mcp',
    version: '1.0.0',
  });

  // ===========================================================================
  // 1. SYSTEM & GUILD TOOLS
  // ===========================================================================

  server.tool(
    'tortuga_system_status',
    'Get real-time operational status of Tortuga Discord bot, PostgreSQL database, and system metrics',
    {},
    async () => {
      try {
        let dbOk = false;
        let botUser: any = null;

        try {
          await prisma.$queryRaw`SELECT 1`;
          dbOk = true;
        } catch {
          dbOk = false;
        }

        try {
          botUser = await discord.getBotUser();
        } catch (e: any) {
          botUser = { error: e.message };
        }

        const guildCount = await prisma.guild.count();

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  status: dbOk ? 'healthy' : 'degraded',
                  database: { connected: dbOk, registeredGuilds: guildCount },
                  bot: botUser,
                  timestamp: new Date().toISOString(),
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `System status error: ${err.message}` }],
        };
      }
    }
  );

  server.tool(
    'tortuga_list_guilds',
    'List all Discord servers (guilds) managed by Tortuga bot with member count and prefix',
    {},
    async () => {
      try {
        const [discordGuilds, dbGuilds] = await Promise.all([
          discord.getBotGuilds().catch(() => []),
          prisma.guild.findMany({
            select: {
              id: true,
              prefix: true,
              locale: true,
              premium: true,
              premiumTier: true,
            },
          }),
        ]);

        const dbMap = new Map(dbGuilds.map((g) => [g.id, g]));

        const combined = discordGuilds.map((dg) => {
          const dbData = dbMap.get(dg.id);
          return {
            id: dg.id,
            name: dg.name,
            iconUrl: dg.icon
              ? `https://cdn.discordapp.com/icons/${dg.id}/${dg.icon}.png`
              : null,
            approximateMemberCount: dg.approximate_member_count || 0,
            prefix: dbData?.prefix || '!',
            locale: dbData?.locale || 'en-US',
            premium: dbData?.premium || false,
            premiumTier: dbData?.premiumTier || 0,
          };
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(combined, null, 2),
            },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to list guilds: ${err.message}` }],
        };
      }
    }
  );

  server.tool(
    'tortuga_get_guild_config',
    'Retrieve full configuration for a specific guild (prefix, automod, leveling, logging, starboard)',
    {
      guildId: z.string().describe('The Discord Guild Snowflake ID'),
    },
    async ({ guildId }) => {
      try {
        const [guild, details] = await Promise.all([
          prisma.guild.findUnique({
            where: { id: guildId },
            include: {
              automodConfig: true,
              levelingConfig: true,
              loggingConfig: true,
              starboardConfig: true,
              stickyMessages: { where: { isActive: true } },
              customCommands: true,
              botWatcherConfig: true,
            },
          }),
          discord.getGuild(guildId).catch(() => null),
        ]);

        if (!guild) {
          return {
            isError: true,
            content: [
              {
                type: 'text',
                text: `Guild with ID ${guildId} not found in Tortuga database.`,
              },
            ],
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ guild, discordSummary: details }, null, 2),
            },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to get guild config: ${err.message}` }],
        };
      }
    }
  );

  server.tool(
    'tortuga_update_guild_settings',
    'Update general settings for a guild (prefix, locale, muted role, disabled commands)',
    {
      guildId: z.string().describe('The Discord Guild Snowflake ID'),
      prefix: z.string().optional().describe('Custom bot command prefix (e.g. !, ?, tc!)'),
      locale: z.string().optional().describe('Locale setting (e.g. en-US, id-ID)'),
      mutedRoleId: z.string().nullable().optional().describe('Muted role Snowflake ID'),
      disabledCommands: z
        .array(z.string())
        .optional()
        .describe('List of command names to disable'),
      disabledChannels: z
        .array(z.string())
        .optional()
        .describe('List of channel IDs where commands are ignored'),
    },
    async ({ guildId, prefix, locale, mutedRoleId, disabledCommands, disabledChannels }) => {
      try {
        const updateData: any = {};
        if (prefix !== undefined) updateData.prefix = prefix;
        if (locale !== undefined) updateData.locale = locale;
        if (mutedRoleId !== undefined) updateData.mutedRoleId = mutedRoleId;
        if (disabledCommands !== undefined) updateData.disabledCommands = disabledCommands;
        if (disabledChannels !== undefined) updateData.disabledChannels = disabledChannels;

        const updated = await prisma.guild.update({
          where: { id: guildId },
          data: updateData,
        });

        return {
          content: [
            {
              type: 'text',
              text: `Guild settings updated successfully:\n${JSON.stringify(updated, null, 2)}`,
            },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to update guild settings: ${err.message}` }],
        };
      }
    }
  );

  // ===========================================================================
  // 2. CHANNEL & MESSAGING TOOLS
  // ===========================================================================

  server.tool(
    'tortuga_list_channels',
    'List all channels in a guild (text, voice, categories, announcements, threads)',
    {
      guildId: z.string().describe('The Discord Guild Snowflake ID'),
    },
    async ({ guildId }) => {
      try {
        const channels = await discord.getGuildChannels(guildId);
        const channelTypeMap: Record<number, string> = {
          0: 'GUILD_TEXT',
          2: 'GUILD_VOICE',
          4: 'GUILD_CATEGORY',
          5: 'GUILD_ANNOUNCEMENT',
          11: 'PUBLIC_THREAD',
          12: 'PRIVATE_THREAD',
          13: 'GUILD_STAGE_VOICE',
          15: 'GUILD_FORUM',
        };

        const formatted = channels.map((c) => ({
          id: c.id,
          name: c.name,
          type: channelTypeMap[c.type] || `UNKNOWN_${c.type}`,
          parentId: c.parent_id || null,
          position: c.position,
          topic: c.topic || null,
        }));

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(formatted, null, 2),
            },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to list channels: ${err.message}` }],
        };
      }
    }
  );

  server.tool(
    'tortuga_create_channel',
    'Create a new Discord channel or category in a guild',
    {
      guildId: z.string().describe('The Discord Guild Snowflake ID'),
      name: z.string().describe('The channel name'),
      type: z
        .enum(['text', 'voice', 'category', 'announcement', 'forum'])
        .default('text')
        .describe('Type of channel'),
      parentId: z.string().optional().describe('Parent category ID (optional)'),
      topic: z.string().optional().describe('Channel topic description'),
    },
    async ({ guildId, name, type, parentId, topic }) => {
      try {
        const typeMap: Record<string, number> = {
          text: 0,
          voice: 2,
          category: 4,
          announcement: 5,
          forum: 15,
        };

        const channel = await discord.createGuildChannel(guildId, {
          name,
          type: typeMap[type] ?? 0,
          parent_id: parentId,
          topic,
        });

        return {
          content: [
            {
              type: 'text',
              text: `Channel created successfully:\n${JSON.stringify(channel, null, 2)}`,
            },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to create channel: ${err.message}` }],
        };
      }
    }
  );

  server.tool(
    'tortuga_delete_channel',
    'Delete a Discord channel from a guild',
    {
      channelId: z.string().describe('The channel ID to delete'),
      reason: z.string().optional().describe('Audit log reason for deletion'),
    },
    async ({ channelId, reason }) => {
      try {
        await discord.deleteChannel(channelId, reason);
        return {
          content: [
            {
              type: 'text',
              text: `Channel ${channelId} deleted successfully. Reason: ${reason || 'None provided'}`,
            },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to delete channel: ${err.message}` }],
        };
      }
    }
  );

  server.tool(
    'tortuga_send_message',
    'Send a message or embed announcement to a Discord channel',
    {
      channelId: z.string().describe('The target channel Snowflake ID'),
      content: z.string().optional().describe('Text message content (supports Discord Markdown)'),
      embedTitle: z.string().optional().describe('Embed title'),
      embedDescription: z.string().optional().describe('Embed description'),
      embedColor: z.number().optional().describe('Embed color in integer hex (e.g. 0x10b981 for emerald)'),
      embedFields: z
        .array(
          z.object({
            name: z.string(),
            value: z.string(),
            inline: z.boolean().optional(),
          })
        )
        .optional()
        .describe('Embed fields array'),
    },
    async ({ channelId, content, embedTitle, embedDescription, embedColor, embedFields }) => {
      try {
        const payload: any = {};
        if (content) payload.content = content;

        if (embedTitle || embedDescription || embedFields) {
          payload.embeds = [
            {
              title: embedTitle,
              description: embedDescription,
              color: embedColor ?? 0x10b981, // Tortuga Emerald default
              fields: embedFields,
              footer: { text: 'Tortuga • Automated Dispatch' },
              timestamp: new Date().toISOString(),
            },
          ];
        }

        const msg = await discord.sendMessage(channelId, payload);
        return {
          content: [
            {
              type: 'text',
              text: `Message sent successfully. Message ID: ${msg.id}`,
            },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to send message: ${err.message}` }],
        };
      }
    }
  );

  server.tool(
    'tortuga_purge_messages',
    'Bulk delete up to 100 messages in a channel (with optional author filter)',
    {
      channelId: z.string().describe('The channel Snowflake ID'),
      amount: z.number().min(1).max(100).default(20).describe('Number of messages to delete (1-100)'),
      authorId: z.string().optional().describe('Filter deletion to a specific user Snowflake ID'),
    },
    async ({ channelId, amount, authorId }) => {
      try {
        const messages = await discord.getChannelMessages(channelId, amount);
        let toDelete = messages;

        if (authorId) {
          toDelete = messages.filter((m) => m.author?.id === authorId);
        }

        // Discord bulk delete only allows messages <= 14 days old
        const fourteenDaysAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
        const eligible = toDelete.filter(
          (m) => new Date(m.timestamp).getTime() > fourteenDaysAgo
        );

        if (eligible.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: 'No eligible messages found to delete (messages older than 14 days cannot be bulk deleted).',
              },
            ],
          };
        }

        const ids = eligible.map((m) => m.id);
        await discord.bulkDeleteMessages(channelId, ids);

        return {
          content: [
            {
              type: 'text',
              text: `Successfully purged ${ids.length} message(s) from channel ${channelId}.`,
            },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to purge messages: ${err.message}` }],
        };
      }
    }
  );

  // ===========================================================================
  // 3. ROLES & PERMISSIONS TOOLS
  // ===========================================================================

  server.tool(
    'tortuga_list_roles',
    'List all roles in a guild with hierarchy position, permissions, and color',
    {
      guildId: z.string().describe('The Discord Guild Snowflake ID'),
    },
    async ({ guildId }) => {
      try {
        const roles = await discord.getGuildRoles(guildId);
        const sorted = roles
          .sort((a, b) => b.position - a.position)
          .map((r) => ({
            id: r.id,
            name: r.name,
            color: `#${r.color.toString(16).padStart(6, '0')}`,
            hoist: r.hoist,
            position: r.position,
            permissions: r.permissions,
            managed: r.managed,
          }));

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(sorted, null, 2),
            },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to list roles: ${err.message}` }],
        };
      }
    }
  );

  server.tool(
    'tortuga_list_members',
    'List guild members (up to 1000), optionally only those holding a given role',
    {
      guildId: z.string().describe('The Discord Guild Snowflake ID'),
      roleId: z.string().optional().describe('Only return members holding this role'),
    },
    async ({ guildId, roleId }) => {
      try {
        // ponytail: single page of 1000, add `after` pagination for bigger guilds
        const members = await discord.getGuildMembers(guildId, 1000);
        const result = members
          .filter((m) => !roleId || m.roles.includes(roleId))
          .map((m) => ({
            id: m.user?.id,
            username: m.user?.username,
            nick: m.nick,
            bot: m.user?.bot ?? false,
            roles: m.roles,
            joinedAt: m.joined_at,
          }));

        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to list members: ${err.message}` }],
        };
      }
    }
  );

  server.tool(
    'tortuga_delete_role',
    'Delete a role from a guild (refuses @everyone and integration-managed roles)',
    {
      guildId: z.string().describe('The Discord Guild Snowflake ID'),
      roleId: z.string().describe('The role Snowflake ID to delete'),
      reason: z.string().optional().describe('Audit log reason for deletion'),
    },
    async ({ guildId, roleId, reason }) => {
      try {
        const role = (await discord.getGuildRoles(guildId)).find((r) => r.id === roleId);
        if (!role) throw new Error(`Role ${roleId} not found in guild ${guildId}`);
        if (role.id === guildId) throw new Error('Cannot delete the @everyone role');
        if (role.managed) throw new Error(`Role "${role.name}" is managed by an integration`);

        await discord.deleteRole(guildId, roleId, reason);
        return {
          content: [
            {
              type: 'text',
              text: `Role "${role.name}" (${roleId}) deleted successfully. Reason: ${reason || 'None provided'}`,
            },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to delete role: ${err.message}` }],
        };
      }
    }
  );

  server.tool(
    'tortuga_manage_member_role',
    'Assign or remove a role to/from a guild member',
    {
      guildId: z.string().describe('The Discord Guild Snowflake ID'),
      userId: z.string().describe('The member user Snowflake ID'),
      roleId: z.string().describe('The role Snowflake ID'),
      action: z.enum(['add', 'remove']).describe('Action to perform (add or remove)'),
    },
    async ({ guildId, userId, roleId, action }) => {
      try {
        if (action === 'add') {
          await discord.addMemberRole(guildId, userId, roleId);
        } else {
          await discord.removeMemberRole(guildId, userId, roleId);
        }

        return {
          content: [
            {
              type: 'text',
              text: `Role ${roleId} successfully ${action === 'add' ? 'added to' : 'removed from'} user ${userId}.`,
            },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to manage member role: ${err.message}` }],
        };
      }
    }
  );

  // ===========================================================================
  // 4. MODERATION & AUDIT TOOLS
  // ===========================================================================

  server.tool(
    'tortuga_moderate_member',
    'Execute a moderation action against a member (WARN, TIMEOUT, KICK, BAN) and log an infraction case',
    {
      guildId: z.string().describe('The Discord Guild Snowflake ID'),
      userId: z.string().describe('The target member user Snowflake ID'),
      action: z.enum(['WARN', 'TIMEOUT', 'KICK', 'BAN']).describe('Moderation action'),
      reason: z.string().default('Rule violation').describe('Reason for the infraction'),
      durationMinutes: z.number().optional().describe('Duration in minutes (required for TIMEOUT)'),
      moderatorId: z.string().optional().describe('Moderator Snowflake ID or name (defaults to Tortuga MCP Agent)'),
    },
    async ({ guildId, userId, action, reason, durationMinutes, moderatorId }) => {
      try {
        const modId = moderatorId || 'Tortuga-MCP-Agent';

        // 1. Execute Discord API action
        if (action === 'TIMEOUT') {
          await discord.timeoutMember(guildId, userId, durationMinutes || 60, reason);
        } else if (action === 'KICK') {
          await discord.kickMember(guildId, userId, reason);
        } else if (action === 'BAN') {
          await discord.banMember(guildId, userId, 0, reason);
        }

        // 2. Compute next incremental case ID
        const latestInfraction = await prisma.infraction.findFirst({
          where: { guildId },
          orderBy: { caseId: 'desc' },
          select: { caseId: true },
        });
        const nextCaseId = (latestInfraction?.caseId ?? 0) + 1;

        // 3. Record in database
        const infraction = await prisma.infraction.create({
          data: {
            caseId: nextCaseId,
            guildId,
            userId,
            modId,
            action: action as InfractionAction,
            reason,
            expiresAt: durationMinutes
              ? new Date(Date.now() + durationMinutes * 60 * 1000)
              : null,
          },
        });

        // 4. Create Audit Weblog
        await prisma.weblogEntry.create({
          data: {
            guildId,
            eventType: `MODERATION_${action}`,
            targetId: userId,
            actorId: modId,
            detailsJson: {
              caseId: nextCaseId,
              durationMinutes: durationMinutes || null,
              reason: reason || null,
            },
          },
        });

        return {
          content: [
            {
              type: 'text',
              text: `Moderation action ${action} executed for user ${userId}.\nCase #${nextCaseId} recorded:\n${JSON.stringify(
                infraction,
                null,
                2
              )}`,
            },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to moderate member: ${err.message}` }],
        };
      }
    }
  );

  server.tool(
    'tortuga_list_infractions',
    'Retrieve moderation infractions and case history for a guild or specific user',
    {
      guildId: z.string().describe('The Discord Guild Snowflake ID'),
      userId: z.string().optional().describe('Filter cases to a specific user Snowflake ID'),
      limit: z.number().default(20).describe('Maximum number of records to return'),
    },
    async ({ guildId, userId, limit }) => {
      try {
        const where: any = { guildId };
        if (userId) where.userId = userId;

        const infractions = await prisma.infraction.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: limit,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(infractions, null, 2),
            },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to list infractions: ${err.message}` }],
        };
      }
    }
  );

  server.tool(
    'tortuga_get_audit_logs',
    'Query security, moderation, and guild events from Tortuga weblog ledger',
    {
      guildId: z.string().describe('The Discord Guild Snowflake ID'),
      limit: z.number().default(25).describe('Maximum number of events to fetch'),
    },
    async ({ guildId, limit }) => {
      try {
        const logs = await prisma.weblogEntry.findMany({
          where: { guildId },
          orderBy: { createdAt: 'desc' },
          take: limit,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(logs, null, 2),
            },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to get audit logs: ${err.message}` }],
        };
      }
    }
  );

  // ===========================================================================
  // 5. AUTOMOD & AGENT TOOLS
  // ===========================================================================

  server.tool(
    'tortuga_get_automod_rules',
    'Inspect Anti-Spam, Anti-Invite, Anti-Link, and Drama Watcher rules for a guild',
    {
      guildId: z.string().describe('The Discord Guild Snowflake ID'),
    },
    async ({ guildId }) => {
      try {
        const config = await prisma.automodConfig.findUnique({
          where: { guildId },
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(config || { message: 'Automod not configured yet' }, null, 2),
            },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to get automod rules: ${err.message}` }],
        };
      }
    }
  );

  server.tool(
    'tortuga_update_automod_rules',
    'Update Anti-Spam, Anti-Invite, and banned words rules for a guild',
    {
      guildId: z.string().describe('The Discord Guild Snowflake ID'),
      antiSpam: z.boolean().optional().describe('Toggle rapid message spam prevention'),
      antiInvite: z.boolean().optional().describe('Toggle Discord invite link filter'),
      antiLink: z.boolean().optional().describe('Toggle general URL link filter'),
      maxMentions: z.number().optional().describe('Maximum user/role mentions before triggering action'),
      bannedWords: z.array(z.string()).optional().describe('List of prohibited words'),
      actionOnSpam: z.enum(['WARN', 'TIMEOUT', 'MUTE', 'KICK', 'BAN', 'DELETE_MESSAGE']).optional(),
    },
    async ({ guildId, antiSpam, antiInvite, antiLink, maxMentions, bannedWords, actionOnSpam }) => {
      try {
        const data: any = {};
        if (antiSpam !== undefined) data.antiSpam = antiSpam;
        if (antiInvite !== undefined) data.antiInvite = antiInvite;
        if (antiLink !== undefined) data.antiLink = antiLink;
        if (maxMentions !== undefined) data.maxMentions = maxMentions;
        if (bannedWords !== undefined) data.bannedWords = bannedWords;
        if (actionOnSpam !== undefined) data.actionOnSpam = actionOnSpam as AutomodAction;

        const updated = await prisma.automodConfig.upsert({
          where: { guildId },
          update: data,
          create: {
            guildId,
            ...data,
          },
        });

        return {
          content: [
            {
              type: 'text',
              text: `Automod configuration updated:\n${JSON.stringify(updated, null, 2)}`,
            },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to update automod rules: ${err.message}` }],
        };
      }
    }
  );

  server.tool(
    'tortuga_search_knowledge',
    'Search the Hermes AI Knowledge Base for documents, FAQs, and server guidelines',
    {
      guildId: z.string().describe('The Discord Guild Snowflake ID'),
      query: z.string().describe('Keywords or topic to search for'),
    },
    async ({ guildId, query }) => {
      try {
        const docs = await prisma.knowledgeDoc.findMany({
          where: {
            guildId,
            OR: [
              { title: { contains: query, mode: 'insensitive' } },
              { content: { contains: query, mode: 'insensitive' } },
              { tags: { has: query.toLowerCase() } },
            ],
          },
          take: 5,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(docs, null, 2),
            },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to search knowledge: ${err.message}` }],
        };
      }
    }
  );

  server.tool(
    'tortuga_add_knowledge_doc',
    'Add or update an article in the Hermes AI server Knowledge Base',
    {
      guildId: z.string().describe('The Discord Guild Snowflake ID'),
      title: z.string().describe('Document title'),
      content: z.string().describe('Document markdown body content'),
      tags: z.array(z.string()).optional().describe('Tags for categorization'),
    },
    async ({ guildId, title, content, tags }) => {
      try {
        const doc = await prisma.knowledgeDoc.create({
          data: {
            guildId,
            title,
            content,
            tags: tags || [],
          },
        });

        return {
          content: [
            {
              type: 'text',
              text: `Knowledge document created successfully:\n${JSON.stringify(doc, null, 2)}`,
            },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to add knowledge document: ${err.message}` }],
        };
      }
    }
  );

  server.tool(
    'tortuga_list_tickets',
    'List support tickets for a guild',
    {
      guildId: z.string().describe('The Discord Guild Snowflake ID'),
      status: z.enum(['OPEN', 'CLOSED']).optional().describe('Filter by ticket status'),
    },
    async ({ guildId, status }) => {
      try {
        const where: any = { guildId };
        if (status) where.status = status;

        const tickets = await prisma.ticket.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: 25,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(tickets, null, 2),
            },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to list tickets: ${err.message}` }],
        };
      }
    }
  );

  // ===========================================================================
  // 6. RESOURCES
  // ===========================================================================

  server.resource(
    'tortuga_guilds',
    'tortuga://guilds',
    async (uri) => {
      const guilds = await prisma.guild.findMany({
        select: {
          id: true,
          prefix: true,
          locale: true,
          premium: true,
          createdAt: true,
        },
      });

      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify(guilds, null, 2),
          },
        ],
      };
    }
  );

  server.resource(
    'tortuga_system_health',
    'tortuga://system/health',
    async (uri) => {
      let dbConnected = true;
      try {
        await prisma.$queryRaw`SELECT 1`;
      } catch {
        dbConnected = false;
      }

      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify(
              {
                service: 'Tortuga Discord Platform',
                mcpVersion: '1.0.0',
                database: dbConnected ? 'connected' : 'disconnected',
                timestamp: new Date().toISOString(),
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // ===========================================================================
  // 7. PROMPTS
  // ===========================================================================

  server.prompt(
    'tortuga_server_audit',
    'Comprehensive Discord server safety, role hierarchy, and permission leak audit',
    {
      guildId: z.string().describe('The Discord Guild Snowflake ID to audit'),
    },
    ({ guildId }) => {
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Please conduct a thorough server safety and permissions audit for Discord Guild ID "${guildId}".
Follow these steps using Tortuga MCP tools:
1. Fetch guild configuration with \`tortuga_get_guild_config\`.
2. Inspect roles hierarchy and dangerous permissions (Administrator, Manage Guild, Mention Everyone) using \`tortuga_list_roles\`.
3. Check AutoMod anti-spam and word filter status with \`tortuga_get_automod_rules\`.
4. Review recent security infractions and weblogs using \`tortuga_get_audit_logs\`.
5. Provide an executive summary with actionable recommendations to harden server security.`,
            },
          },
        ],
      };
    }
  );

  server.prompt(
    'tortuga_draft_announcement',
    'Draft and format a high-impact Discord announcement embed',
    {
      channelId: z.string().describe('Target channel ID'),
      topic: z.string().describe('Topic or update details'),
    },
    ({ channelId, topic }) => {
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Draft a professional Discord announcement for channel "${channelId}" regarding: "${topic}".
Include:
- Eye-catching header and structured Markdown
- Relevant Discord emoji accents
- Key bullet points and call-to-action
- A proposed JSON payload for \`tortuga_send_message\` (title, description, fields, and emerald color #10b981).
Ask the user for confirmation before sending the message to Discord.`,
            },
          },
        ],
      };
    }
  );

  server.prompt(
    'tortuga_incident_analysis',
    'Analyze moderation infractions and user incident reports',
    {
      guildId: z.string().describe('Guild ID'),
      userId: z.string().optional().describe('Target user ID (optional)'),
    },
    ({ guildId, userId }) => {
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Analyze recent moderation incidents for Guild "${guildId}"${userId ? ` and User "${userId}"` : ''}.
1. Call \`tortuga_list_infractions\` to retrieve recent warns, mutes, kicks, and bans.
2. Call \`tortuga_get_audit_logs\` to see corresponding moderator logs.
3. Identify patterns, repeat offenders, or escalation triggers.
4. Recommend whether to escalate punishment, adjust AutoMod rules, or resolve the case.`,
            },
          },
        ],
      };
    }
  );

  return server;
}
