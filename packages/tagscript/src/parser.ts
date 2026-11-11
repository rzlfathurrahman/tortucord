import type { ASTNode, TagNode, TextNode } from "./types.js";

/**
 * Parses a TagScript template string into an Abstract Syntax Tree (AST).
 * Handles nested tags, parameter blocks, payloads, escaped characters, and embedded JSON.
 */
export function parseTagScript(input: string): ASTNode[] {
  const nodes: ASTNode[] = [];
  let textBuffer = "";
  let i = 0;

  while (i < input.length) {
    const char = input[i];

    // Handle escape characters: \{, \}, \|, \\
    if (char === "\\") {
      const nextChar = input[i + 1];
      if (nextChar === "{" || nextChar === "}" || nextChar === "|" || nextChar === "\\") {
        textBuffer += nextChar;
        i += 2;
        continue;
      }
      textBuffer += "\\";
      i++;
      continue;
    }

    // Start of tag
    if (char === "{") {
      // Lookahead: a valid TagScript tag identifier must begin with a letter or underscore
      let k = i + 1;
      while (k < input.length && /\s/.test(input[k])) {
        k++;
      }
      if (k >= input.length || !/[a-zA-Z_]/.test(input[k])) {
        textBuffer += "{";
        i++;
        continue;
      }

      // Find matching closing brace taking nested braces and escapes into account
      let depth = 1;
      let j = i + 1;
      let isEscaped = false;

      while (j < input.length) {
        const c = input[j];
        if (isEscaped) {
          isEscaped = false;
          j++;
          continue;
        }

        if (c === "\\") {
          isEscaped = true;
          j++;
          continue;
        }

        if (c === "{") {
          depth++;
        } else if (c === "}") {
          depth--;
          if (depth === 0) {
            break;
          }
        }
        j++;
      }

      // If no matching closing brace found, treat as literal text
      if (depth !== 0 || j >= input.length) {
        textBuffer += "{";
        i++;
        continue;
      }

      // Flush current text buffer
      if (textBuffer.length > 0) {
        nodes.push({ type: "text", value: textBuffer });
        textBuffer = "";
      }

      const raw = input.slice(i, j + 1);
      const tagBody = input.slice(i + 1, j);
      const tagNode = parseTagBody(tagBody, raw);
      nodes.push(tagNode);

      i = j + 1;
      continue;
    }

    textBuffer += char;
    i++;
  }

  if (textBuffer.length > 0) {
    nodes.push({ type: "text", value: textBuffer });
  }

  return nodes;
}

/**
 * Parse the internal content of a tag: {declaration:payload}
 */
function parseTagBody(tagBody: string, raw: string): TagNode {
  // Find first unnested colon at depth 0
  let colonIndex = -1;
  let depth = 0;
  let isEscaped = false;

  for (let idx = 0; idx < tagBody.length; idx++) {
    const ch = tagBody[idx];
    if (isEscaped) {
      isEscaped = false;
      continue;
    }
    if (ch === "\\") {
      isEscaped = true;
      continue;
    }
    if (ch === "{") depth++;
    else if (ch === "}") depth--;
    else if (ch === ":" && depth === 0) {
      colonIndex = idx;
      break;
    }
  }

  let declaration: string;
  let payloadRaw: string | null = null;

  if (colonIndex !== -1) {
    declaration = tagBody.slice(0, colonIndex).trim();
    payloadRaw = tagBody.slice(colonIndex + 1);
  } else {
    declaration = tagBody.trim();
  }

  // Parse declaration for optional parameters e.g. if(condition) or args(0)
  let nameWithSpecifier = declaration;
  let parameter: ASTNode[] | undefined;

  const firstParen = declaration.indexOf("(");
  if (firstParen !== -1 && declaration.endsWith(")")) {
    nameWithSpecifier = declaration.slice(0, firstParen).trim();
    const paramContent = declaration.slice(firstParen + 1, -1);
    parameter = parseTagScript(paramContent);
  }

  // Parse name and specifier e.g. user.id or server.members
  let name = nameWithSpecifier.toLowerCase();
  let specifier: string | undefined;

  const dotIdx = nameWithSpecifier.indexOf(".");
  if (dotIdx !== -1) {
    name = nameWithSpecifier.slice(0, dotIdx).toLowerCase();
    specifier = nameWithSpecifier.slice(dotIdx + 1).toLowerCase();
  }

  // Parse payload branches separated by unnested '|'
  let payload: ASTNode[][] | undefined;

  if (payloadRaw !== null) {
    const branches: string[] = [];
    let currentBranch = "";
    let branchDepth = 0;
    let branchEscaped = false;

    for (let p = 0; p < payloadRaw.length; p++) {
      const c = payloadRaw[p];

      if (branchEscaped) {
        currentBranch += c;
        branchEscaped = false;
        continue;
      }

      if (c === "\\") {
        branchEscaped = true;
        continue;
      }

      if (c === "{") {
        branchDepth++;
        currentBranch += "{";
      } else if (c === "}") {
        branchDepth--;
        currentBranch += "}";
      } else if (c === "|" && branchDepth === 0) {
        branches.push(currentBranch);
        currentBranch = "";
      } else {
        currentBranch += c;
      }
    }

    branches.push(currentBranch);
    payload = branches.map((branch) => parseTagScript(branch));
  }

  return {
    type: "tag",
    raw,
    name,
    specifier,
    parameter,
    payload,
  };
}
