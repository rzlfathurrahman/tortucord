import type { DiscordEmbed } from "@tortuga/config";

/**
 * Contextual user representation for TagScript variables.
 */
export interface TagScriptUser {
  id: string;
  name: string;
  discriminator?: string;
  tag?: string;
  mention?: string;
  avatar?: string;
  bot?: boolean;
}

/**
 * Contextual guild representation for TagScript variables.
 */
export interface TagScriptGuild {
  id: string;
  name: string;
  members?: number;
  memberCount?: number;
  icon?: string;
  ownerId?: string;
}

/**
 * Contextual channel representation for TagScript variables.
 */
export interface TagScriptChannel {
  id: string;
  name: string;
  mention?: string;
}

/**
 * Execution context supplied when evaluating TagScript.
 */
export interface TagScriptContext {
  user?: TagScriptUser;
  guild?: TagScriptGuild;
  server?: TagScriptGuild; // Alias for guild
  channel?: TagScriptChannel;
  target?: TagScriptUser;
  args?: string | string[];
  variables?: Record<string, string | number | boolean>;
}

/**
 * AST Node representing plain text.
 */
export interface TextNode {
  type: "text";
  value: string;
}

/**
 * AST Node representing a TagScript tag:
 * Examples:
 * - {user.mention} -> name: "user", specifier: "mention"
 * - {choose:a|b|c} -> name: "choose", payload: [[{type: "text", value: "a"}], [...]]
 * - {if({args} == 1):Yes|No} -> name: "if", parameter: [...], payload: [[Yes], [No]]
 */
export interface TagNode {
  type: "tag";
  raw: string;
  name: string;
  specifier?: string;
  parameter?: ASTNode[];
  payload?: ASTNode[][]; // Arguments separated by unnested '|'
}

export type ASTNode = TextNode | TagNode;

/**
 * Output resulting from executing a TagScript template.
 */
export interface TagScriptResult {
  content: string;
  embed?: DiscordEmbed;
  embeds?: DiscordEmbed[];
  actions: {
    deleteMessage: boolean;
    silent: boolean;
  };
}

/**
 * Tag handler function signature.
 */
export type TagHandler = (
  tag: TagNode,
  context: TagScriptContext,
  interpreter: TagInterpreter
) => Promise<string | null> | string | null;

/**
 * Interface for the interpreter passed to handlers.
 */
export interface TagInterpreter {
  evaluateNodes(nodes: ASTNode[], context: TagScriptContext): Promise<string>;
  evaluateCondition(condition: string, context: TagScriptContext): Promise<boolean>;
  getEmbed(): DiscordEmbed;
  setEmbed(embed: Partial<DiscordEmbed>): void;
  getActions(): TagScriptResult["actions"];
}
