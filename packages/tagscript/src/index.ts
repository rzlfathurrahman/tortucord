import { Interpreter } from "./interpreter.js";
import type { TagScriptContext, TagScriptResult } from "./types.js";

export * from "./types.js";
export * from "./lexer.js";
export * from "./parser.js";
export * from "./math.js";
export * from "./tags.js";
export * from "./interpreter.js";

/**
 * Standard singleton interpreter instance for quick execution.
 */
const defaultInterpreter = new Interpreter();

/**
 * Execute a TagScript template string with the provided context.
 *
 * @param template The TagScript template containing tags like {user.mention}, {if(cond):then|else}, etc.
 * @param context The execution context including user, guild, channel, target, and arguments.
 * @returns The evaluated result containing message content, embed data, and actions.
 */
export async function executeTagScript(
  template: string,
  context: TagScriptContext = {}
): Promise<TagScriptResult> {
  return await defaultInterpreter.execute(template, context);
}
