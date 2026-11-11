/**
 * Token types and scanner for TagScript syntax.
 */

export type TokenType =
  | "TEXT"
  | "TAG_START"
  | "TAG_END"
  | "COLON"
  | "PIPE"
  | "LPAREN"
  | "RPAREN"
  | "ESCAPE";

export interface Token {
  type: TokenType;
  value: string;
  position: number;
}

/**
 * Scan raw input string into token stream.
 */
export function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  let textStart = 0;
  let inTag = 0;

  while (i < input.length) {
    const char = input[i];

    if (char === "\\") {
      if (i + 1 < input.length) {
        tokens.push({ type: "ESCAPE", value: input[i + 1], position: i });
        i += 2;
        continue;
      }
    }

    if (char === "{") {
      if (i > textStart) {
        tokens.push({ type: "TEXT", value: input.slice(textStart, i), position: textStart });
      }
      tokens.push({ type: "TAG_START", value: "{", position: i });
      inTag++;
      i++;
      textStart = i;
      continue;
    }

    if (char === "}" && inTag > 0) {
      if (i > textStart) {
        tokens.push({ type: "TEXT", value: input.slice(textStart, i), position: textStart });
      }
      tokens.push({ type: "TAG_END", value: "}", position: i });
      inTag--;
      i++;
      textStart = i;
      continue;
    }

    if (inTag > 0 && char === ":") {
      if (i > textStart) {
        tokens.push({ type: "TEXT", value: input.slice(textStart, i), position: textStart });
      }
      tokens.push({ type: "COLON", value: ":", position: i });
      i++;
      textStart = i;
      continue;
    }

    if (inTag > 0 && char === "|") {
      if (i > textStart) {
        tokens.push({ type: "TEXT", value: input.slice(textStart, i), position: textStart });
      }
      tokens.push({ type: "PIPE", value: "|", position: i });
      i++;
      textStart = i;
      continue;
    }

    i++;
  }

  if (i > textStart) {
    tokens.push({ type: "TEXT", value: input.slice(textStart, i), position: textStart });
  }

  return tokens;
}
