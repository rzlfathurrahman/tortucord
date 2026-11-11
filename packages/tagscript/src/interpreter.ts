import type { DiscordEmbed } from "@tortuga/config";
import { parseTagScript } from "./parser.js";
import { defaultTagHandlers } from "./tags.js";
import type {
  ASTNode,
  TagHandler,
  TagInterpreter,
  TagNode,
  TagScriptContext,
  TagScriptResult,
} from "./types.js";

/**
 * Interpreter engine for executing TagScript AST nodes.
 */
export class Interpreter implements TagInterpreter {
  private handlers: Map<string, TagHandler>;
  private embed: DiscordEmbed = {};
  private actions: TagScriptResult["actions"] = {
    deleteMessage: false,
    silent: false,
  };

  constructor(customHandlers?: Record<string, TagHandler>) {
    this.handlers = new Map(Object.entries(defaultTagHandlers));
    if (customHandlers) {
      for (const [name, handler] of Object.entries(customHandlers)) {
        this.handlers.set(name.toLowerCase(), handler);
      }
    }
  }

  public registerTag(name: string, handler: TagHandler): void {
    this.handlers.set(name.toLowerCase(), handler);
  }

  public getEmbed(): DiscordEmbed {
    return this.embed;
  }

  public setEmbed(partial: Partial<DiscordEmbed>): void {
    this.embed = {
      ...this.embed,
      ...partial,
      fields: partial.fields ?? this.embed.fields,
      author: partial.author ? { ...this.embed.author, ...partial.author } : this.embed.author,
      footer: partial.footer ? { ...this.embed.footer, ...partial.footer } : this.embed.footer,
    };
  }

  public getActions(): TagScriptResult["actions"] {
    return this.actions;
  }

  /**
   * Evaluate a sequence of AST nodes to a resolved string.
   */
  public async evaluateNodes(nodes: ASTNode[], context: TagScriptContext): Promise<string> {
    const results: string[] = [];

    for (const node of nodes) {
      if (node.type === "text") {
        results.push(node.value);
      } else if (node.type === "tag") {
        const val = await this.evaluateTag(node, context);
        if (val !== null) {
          results.push(val);
        }
      }
    }

    return results.join("");
  }

  /**
   * Evaluate an individual tag node.
   */
  private async evaluateTag(tag: TagNode, context: TagScriptContext): Promise<string | null> {
    const handler = this.handlers.get(tag.name);
    if (handler) {
      const res = await handler(tag, context, this);
      return res ?? "";
    }

    // Check custom variables with case-insensitive fallback
    if (context.variables) {
      if (Object.prototype.hasOwnProperty.call(context.variables, tag.name)) {
        const v = context.variables[tag.name];
        return v !== undefined && v !== null ? String(v) : "";
      }
      const lower = tag.name.toLowerCase();
      for (const [key, val] of Object.entries(context.variables)) {
        if (key.toLowerCase() === lower) {
          return val !== undefined && val !== null ? String(val) : "";
        }
      }
    }

    // Unknown tag, preserve raw string
    return tag.raw;
  }

  /**
   * Evaluate a condition string e.g. "a == b", "10 > 2", "str includes substr".
   */
  public async evaluateCondition(condition: string, _context: TagScriptContext): Promise<boolean> {
    const cond = condition.trim();

    // Binary comparison operators
    const operators = [
      "===",
      "==",
      "!==",
      "!=",
      ">=",
      "<=",
      ">",
      "<",
      " includes ",
      " contains ",
      " in ",
      " startswith ",
      " endswith ",
    ];

    for (const op of operators) {
      const idx = cond.indexOf(op);
      if (idx !== -1) {
        const left = cond.slice(0, idx).trim();
        const right = cond.slice(idx + op.length).trim();
        return this.compareOperands(left, op.trim(), right);
      }
    }

    // Unary truthy/falsy check
    if (cond.startsWith("!")) {
      const inner = cond.slice(1).trim();
      return !this.isTruthy(inner);
    }

    return this.isTruthy(cond);
  }

  private compareOperands(left: string, op: string, right: string): boolean {
    // If both sides are valid numbers, compare numerically
    const leftNum = Number(left);
    const rightNum = Number(right);
    const areNumbers = !isNaN(leftNum) && !isNaN(rightNum) && left !== "" && right !== "";

    switch (op) {
      case "===":
      case "==":
        return areNumbers ? leftNum === rightNum : left === right;
      case "!==":
      case "!=":
        return areNumbers ? leftNum !== rightNum : left !== right;
      case ">":
        return areNumbers ? leftNum > rightNum : left.localeCompare(right) > 0;
      case ">=":
        return areNumbers ? leftNum >= rightNum : left.localeCompare(right) >= 0;
      case "<":
        return areNumbers ? leftNum < rightNum : left.localeCompare(right) < 0;
      case "<=":
        return areNumbers ? leftNum <= rightNum : left.localeCompare(right) <= 0;
      case "includes":
      case "contains":
        return left.toLowerCase().includes(right.toLowerCase());
      case "in":
        return right.toLowerCase().includes(left.toLowerCase());
      case "startswith":
        return left.toLowerCase().startsWith(right.toLowerCase());
      case "endswith":
        return left.toLowerCase().endsWith(right.toLowerCase());
      default:
        return false;
    }
  }

  private isTruthy(val: string): boolean {
    const lower = val.toLowerCase().trim();
    if (!lower || lower === "false" || lower === "0" || lower === "null" || lower === "undefined") {
      return false;
    }
    return true;
  }

  /**
   * Run execution of a template string against the given context.
   */
  public async execute(template: string, context: TagScriptContext = {}): Promise<TagScriptResult> {
    this.embed = {};
    this.actions = { deleteMessage: false, silent: false };

    const ast = parseTagScript(template);
    const rawContent = await this.evaluateNodes(ast, context);
    const content = rawContent.trim();

    const hasEmbedData =
      this.embed.title ||
      this.embed.description ||
      this.embed.color !== undefined ||
      this.embed.fields?.length ||
      this.embed.author ||
      this.embed.footer ||
      this.embed.image ||
      this.embed.thumbnail ||
      this.embed.url;

    return {
      content,
      embed: hasEmbedData ? this.embed : undefined,
      embeds: hasEmbedData ? [this.embed] : undefined,
      actions: this.actions,
    };
  }
}
