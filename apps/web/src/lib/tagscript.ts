/**
 * Tortuga TagScript Parser & Simulator
 * Replaces Tortuga TagScript blocks with preview variables
 */

export interface TagScriptContext {
  user?: {
    name: string;
    mention: string;
    id: string;
    avatar?: string;
  };
  server?: {
    name: string;
    id: string;
    memberCount: number;
  };
  channel?: {
    name: string;
    mention: string;
    id: string;
  };
}

export const DEFAULT_TAGSCRIPT_CONTEXT: TagScriptContext = {
  user: {
    name: 'CaptainJack',
    mention: '@CaptainJack',
    id: '123456789012345678',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
  },
  server: {
    name: 'Tortuga Sanctuary',
    id: '987654321098765432',
    memberCount: 2489,
  },
  channel: {
    name: 'general-chat',
    mention: '#general-chat',
    id: '456789012345678901',
  },
};

export function parseTagScript(template: string, ctx: TagScriptContext = DEFAULT_TAGSCRIPT_CONTEXT): string {
  if (!template) return '';

  let result = template;
  const now = new Date();

  const replacements: Record<string, string> = {
    '{user}': ctx.user?.name || 'User',
    '{user.name}': ctx.user?.name || 'User',
    '{user.mention}': ctx.user?.mention || '@User',
    '{user.id}': ctx.user?.id || '123456789',
    '{server}': ctx.server?.name || 'Server',
    '{server.name}': ctx.server?.name || 'Server',
    '{server.id}': ctx.server?.id || '987654321',
    '{server.members}': ctx.server?.memberCount ? ctx.server.memberCount.toLocaleString() : '1,000',
    '{memberCount}': ctx.server?.memberCount ? ctx.server.memberCount.toLocaleString() : '1,000',
    '{channel}': ctx.channel?.name || 'channel',
    '{channel.name}': ctx.channel?.name || 'channel',
    '{channel.mention}': ctx.channel?.mention || '#channel',
    '{channel.id}': ctx.channel?.id || '456789012',
    '{date}': now.toLocaleDateString('en-US'),
    '{time}': now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    '{timestamp}': Math.floor(now.getTime() / 1000).toString(),
  };

  for (const [tag, val] of Object.entries(replacements)) {
    result = result.replaceAll(tag, val);
  }

  return result;
}

export const TAGSCRIPT_CHEATSHEET = [
  { tag: '{user.mention}', desc: 'Mentions the triggering user' },
  { tag: '{user.name}', desc: 'Username of the user' },
  { tag: '{server.name}', desc: 'Name of the current Discord server' },
  { tag: '{memberCount}', desc: 'Total member count of the server' },
  { tag: '{channel.mention}', desc: 'Mentions current channel' },
  { tag: '{time}', desc: 'Current formatted time' },
];
