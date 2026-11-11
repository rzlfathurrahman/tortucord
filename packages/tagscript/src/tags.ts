import type { DiscordEmbed, DiscordEmbedField } from "@tortuga/config";
import { evaluateMath } from "./math.js";
import type {
  ASTNode,
  TagHandler,
  TagInterpreter,
  TagNode,
  TagScriptContext,
} from "./types.js";

/**
 * Standard color names mapped to hex numbers.
 */
const COLOR_MAP: Record<string, number> = {
  default: 0x5865f2,
  blurple: 0x5865f2,
  green: 0x57f287,
  yellow: 0xfee75c,
  fuchsia: 0xeb459e,
  red: 0xed4245,
  white: 0xffffff,
  black: 0x000000,
  grey: 0x95a5a6,
  gray: 0x95a5a6,
  blue: 0x3498db,
  purple: 0x9b59b6,
  orange: 0xe67e22,
};

/**
 * Parse color input into an integer for Discord Embeds.
 */
function parseColor(input: string): number {
  const clean = input.trim().toLowerCase();
  if (COLOR_MAP[clean] !== undefined) {
    return COLOR_MAP[clean];
  }

  // Hex format: #ff0000 or 0xff0000 or ff0000
  if (clean.startsWith("#")) {
    const val = parseInt(clean.slice(1), 16);
    return isNaN(val) ? 0 : val;
  }
  if (clean.startsWith("0x")) {
    const val = parseInt(clean.slice(2), 16);
    return isNaN(val) ? 0 : val;
  }

  // Decimal format: 16711680
  const dec = parseInt(clean, 10);
  return isNaN(dec) ? 0 : dec;
}

/**
 * Built-in Tag Handlers for Carl-bot TagScript syntax.
 */
export const defaultTagHandlers: Record<string, TagHandler> = {
  // --- USER TAGS ---
  user: (tag, ctx) => {
    const u = ctx.user;
    if (!u) return "";
    switch (tag.specifier) {
      case "id":
        return u.id;
      case "name":
      case "username":
        return u.name;
      case "mention":
        return u.mention ?? `<@${u.id}>`;
      case "discriminator":
      case "discrim":
        return u.discriminator ?? "0";
      case "tag":
        return u.tag ?? (u.discriminator && u.discriminator !== "0" ? `${u.name}#${u.discriminator}` : u.name);
      case "avatar":
        return u.avatar ?? "";
      default:
        return u.name;
    }
  },

  // --- SERVER / GUILD TAGS ---
  server: (tag, ctx) => handleGuild(tag, ctx.server ?? ctx.guild),
  guild: (tag, ctx) => handleGuild(tag, ctx.guild ?? ctx.server),

  // --- CHANNEL TAGS ---
  channel: (tag, ctx) => {
    const ch = ctx.channel;
    if (!ch) return "";
    switch (tag.specifier) {
      case "id":
        return ch.id;
      case "name":
        return ch.name;
      case "mention":
        return ch.mention ?? `<#${ch.id}>`;
      default:
        return ch.mention ?? `<#${ch.id}>`;
    }
  },

  // --- TARGET USER TAGS ---
  target: (tag, ctx) => {
    const t = ctx.target;
    if (!t) return "";
    switch (tag.specifier) {
      case "id":
        return t.id;
      case "name":
        return t.name;
      case "mention":
        return t.mention ?? `<@${t.id}>`;
      case "avatar":
        return t.avatar ?? "";
      default:
        return t.name;
    }
  },

  // --- ARGUMENTS TAG ---
  args: async (tag, ctx, interp) => {
    let argsArray: string[] = [];
    if (Array.isArray(ctx.args)) {
      argsArray = ctx.args;
    } else if (typeof ctx.args === "string") {
      argsArray = ctx.args.trim().length > 0 ? ctx.args.trim().split(/\s+/) : [];
    }

    // Specifier e.g. {args:0} or parameter e.g. {args(0)}
    let indexSpec: string | undefined = tag.specifier;
    if (!indexSpec && tag.parameter) {
      indexSpec = (await interp.evaluateNodes(tag.parameter, ctx)).trim();
    }
    if (!indexSpec && tag.payload && tag.payload.length > 0) {
      indexSpec = (await interp.evaluateNodes(tag.payload[0], ctx)).trim();
    }

    if (!indexSpec) {
      return Array.isArray(ctx.args) ? ctx.args.join(" ") : ctx.args ?? "";
    }

    // Range: e.g. "1+" (from 1 to end)
    if (indexSpec.endsWith("+")) {
      const start = parseInt(indexSpec.slice(0, -1), 10);
      if (isNaN(start)) return "";
      return argsArray.slice(start).join(" ");
    }

    // Specific index: e.g. "0"
    const idx = parseInt(indexSpec, 10);
    if (isNaN(idx)) return "";
    return argsArray[idx] ?? "";
  },

  // --- RANDOM & CHOICE TAGS ---
  choose: async (tag, ctx, interp) => {
    if (!tag.payload || tag.payload.length === 0) return "";
    const randIndex = Math.floor(Math.random() * tag.payload.length);
    return await interp.evaluateNodes(tag.payload[randIndex], ctx);
  },
  choice: async (tag, ctx, interp) => {
    if (!tag.payload || tag.payload.length === 0) return "";
    const randIndex = Math.floor(Math.random() * tag.payload.length);
    return await interp.evaluateNodes(tag.payload[randIndex], ctx);
  },

  random: async (tag, ctx, interp) => {
    let raw = "";
    if (tag.payload && tag.payload.length > 0) {
      raw = (await interp.evaluateNodes(tag.payload[0], ctx)).trim();
    } else if (tag.specifier) {
      raw = tag.specifier;
    }

    // Range format: "min-max" or "min~max" or multiple payload args "min|max"
    let min = 1;
    let max = 100;

    if (tag.payload && tag.payload.length > 1) {
      const minStr = await interp.evaluateNodes(tag.payload[0], ctx);
      const maxStr = await interp.evaluateNodes(tag.payload[1], ctx);
      min = parseInt(minStr, 10) || 1;
      max = parseInt(maxStr, 10) || 100;
    } else if (raw.includes("-")) {
      const parts = raw.split("-");
      min = parseInt(parts[0], 10) || 1;
      max = parseInt(parts[1], 10) || 100;
    } else if (raw.includes("~")) {
      const parts = raw.split("~");
      min = parseInt(parts[0], 10) || 1;
      max = parseInt(parts[1], 10) || 100;
    } else if (raw.length > 0) {
      max = parseInt(raw, 10) || 100;
      min = 1;
    }

    if (min > max) {
      const temp = min;
      min = max;
      max = temp;
    }

    return String(Math.floor(Math.random() * (max - min + 1)) + min);
  },

  // --- LOGIC / IF TAG ---
  if: async (tag, ctx, interp) => {
    if (!tag.parameter || !tag.payload || tag.payload.length === 0) {
      return "";
    }

    // Evaluate parameter as condition string
    const conditionStr = await interp.evaluateNodes(tag.parameter, ctx);
    const isTrue = await interp.evaluateCondition(conditionStr, ctx);

    if (isTrue) {
      // Then branch
      return await interp.evaluateNodes(tag.payload[0], ctx);
    } else if (tag.payload.length > 1) {
      // Else branch
      return await interp.evaluateNodes(tag.payload[1], ctx);
    }

    return "";
  },

  // --- MATH TAG ---
  math: async (tag, ctx, interp) => {
    if (!tag.payload || tag.payload.length === 0) return "0";
    const expr = await interp.evaluateNodes(tag.payload[0], ctx);
    const result = evaluateMath(expr);
    // Format float cleanly
    return Number.isInteger(result) ? result.toString() : parseFloat(result.toFixed(4)).toString();
  },

  // --- EMBED JSON TAG ---
  embed: async (tag, ctx, interp) => {
    if (!tag.payload || tag.payload.length === 0) return "";
    const jsonStr = await interp.evaluateNodes(tag.payload[0], ctx);
    try {
      const parsed = JSON.parse(jsonStr) as DiscordEmbed;
      interp.setEmbed(parsed);
    } catch {
      // Failed to parse JSON, ignore without crashing
    }
    return "";
  },

  // --- STANDALONE EMBED BUILDER TAGS ---
  title: async (tag, ctx, interp) => {
    if (!tag.payload || tag.payload.length === 0) return "";
    const title = await interp.evaluateNodes(tag.payload[0], ctx);
    interp.setEmbed({ title });
    return "";
  },

  description: async (tag, ctx, interp) => {
    if (!tag.payload || tag.payload.length === 0) return "";
    const description = await interp.evaluateNodes(tag.payload[0], ctx);
    interp.setEmbed({ description });
    return "";
  },
  desc: async (tag, ctx, interp) => {
    if (!tag.payload || tag.payload.length === 0) return "";
    const description = await interp.evaluateNodes(tag.payload[0], ctx);
    interp.setEmbed({ description });
    return "";
  },

  color: async (tag, ctx, interp) => {
    let colorRaw = "";
    if (tag.payload && tag.payload.length > 0) {
      colorRaw = await interp.evaluateNodes(tag.payload[0], ctx);
    } else if (tag.specifier) {
      colorRaw = tag.specifier;
    }
    if (colorRaw) {
      interp.setEmbed({ color: parseColor(colorRaw) });
    }
    return "";
  },

  url: async (tag, ctx, interp) => {
    if (!tag.payload || tag.payload.length === 0) return "";
    const url = await interp.evaluateNodes(tag.payload[0], ctx);
    interp.setEmbed({ url: url.trim() });
    return "";
  },

  thumbnail: async (tag, ctx, interp) => {
    if (!tag.payload || tag.payload.length === 0) return "";
    const url = await interp.evaluateNodes(tag.payload[0], ctx);
    interp.setEmbed({ thumbnail: { url: url.trim() } });
    return "";
  },

  image: async (tag, ctx, interp) => {
    if (!tag.payload || tag.payload.length === 0) return "";
    const url = await interp.evaluateNodes(tag.payload[0], ctx);
    interp.setEmbed({ image: { url: url.trim() } });
    return "";
  },

  author: async (tag, ctx, interp) => {
    if (!tag.payload || tag.payload.length === 0) return "";
    const name = await interp.evaluateNodes(tag.payload[0], ctx);
    const iconUrl = tag.payload.length > 1 ? await interp.evaluateNodes(tag.payload[1], ctx) : undefined;
    const url = tag.payload.length > 2 ? await interp.evaluateNodes(tag.payload[2], ctx) : undefined;
    interp.setEmbed({
      author: {
        name,
        icon_url: iconUrl?.trim(),
        url: url?.trim(),
      },
    });
    return "";
  },

  footer: async (tag, ctx, interp) => {
    if (!tag.payload || tag.payload.length === 0) return "";
    const text = await interp.evaluateNodes(tag.payload[0], ctx);
    const iconUrl = tag.payload.length > 1 ? await interp.evaluateNodes(tag.payload[1], ctx) : undefined;
    interp.setEmbed({
      footer: {
        text,
        icon_url: iconUrl?.trim(),
      },
    });
    return "";
  },

  field: async (tag, ctx, interp) => {
    if (!tag.payload || tag.payload.length < 2) return "";
    const name = await interp.evaluateNodes(tag.payload[0], ctx);
    const value = await interp.evaluateNodes(tag.payload[1], ctx);
    const inlineStr = tag.payload.length > 2 ? (await interp.evaluateNodes(tag.payload[2], ctx)).toLowerCase().trim() : "false";
    const inline = inlineStr === "true" || inlineStr === "yes" || inlineStr === "inline";

    const current = interp.getEmbed();
    const fields: DiscordEmbedField[] = [...(current.fields ?? []), { name, value, inline }];
    interp.setEmbed({ fields });
    return "";
  },

  timestamp: async (tag, ctx, interp) => {
    let iso = new Date().toISOString();
    if (tag.payload && tag.payload.length > 0) {
      const customDate = await interp.evaluateNodes(tag.payload[0], ctx);
      if (customDate.trim()) {
        iso = new Date(customDate.trim()).toISOString();
      }
    }
    interp.setEmbed({ timestamp: iso });
    return "";
  },

  // --- ACTIONS ---
  delete: (_tag, _ctx, interp) => {
    interp.getActions().deleteMessage = true;
    return "";
  },
  silent: (_tag, _ctx, interp) => {
    interp.getActions().silent = true;
    return "";
  },
};

function handleGuild(tag: TagNode, g?: TagScriptContext["guild"]): string {
  if (!g) return "";
  switch (tag.specifier) {
    case "id":
      return g.id;
    case "name":
      return g.name;
    case "members":
    case "membercount":
      return String(g.members ?? g.memberCount ?? 0);
    case "icon":
      return g.icon ?? "";
    case "owner":
      return g.ownerId ?? "";
    default:
      return g.name;
  }
}
