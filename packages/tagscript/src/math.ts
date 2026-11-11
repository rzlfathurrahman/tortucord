/**
 * Safe Math Evaluator for TagScript expressions.
 * Uses recursive-descent parsing with zero reliance on eval() or Function().
 */

type MathTokenType =
  | "NUMBER"
  | "IDENT"
  | "PLUS"
  | "MINUS"
  | "MUL"
  | "DIV"
  | "MOD"
  | "POW"
  | "LPAREN"
  | "RPAREN"
  | "COMMA"
  | "EOF";

interface MathToken {
  type: MathTokenType;
  value: string;
}

function tokenizeMath(expr: string): MathToken[] {
  const tokens: MathToken[] = [];
  let i = 0;

  while (i < expr.length) {
    const char = expr[i];

    if (/\s/.test(char)) {
      i++;
      continue;
    }

    if (char === "+" ) {
      tokens.push({ type: "PLUS", value: "+" });
      i++;
    } else if (char === "-") {
      tokens.push({ type: "MINUS", value: "-" });
      i++;
    } else if (char === "*") {
      if (expr[i + 1] === "*") {
        tokens.push({ type: "POW", value: "**" });
        i += 2;
      } else {
        tokens.push({ type: "MUL", value: "*" });
        i++;
      }
    } else if (char === "/") {
      tokens.push({ type: "DIV", value: "/" });
      i++;
    } else if (char === "%") {
      tokens.push({ type: "MOD", value: "%" });
      i++;
    } else if (char === "^") {
      tokens.push({ type: "POW", value: "^" });
      i++;
    } else if (char === "(") {
      tokens.push({ type: "LPAREN", value: "(" });
      i++;
    } else if (char === ")") {
      tokens.push({ type: "RPAREN", value: ")" });
      i++;
    } else if (char === ",") {
      tokens.push({ type: "COMMA", value: "," });
      i++;
    } else if (/[0-9.]/.test(char)) {
      let numStr = "";
      while (i < expr.length && /[0-9.]/.test(expr[i])) {
        numStr += expr[i];
        i++;
      }
      tokens.push({ type: "NUMBER", value: numStr });
    } else if (/[a-zA-Z_]/.test(char)) {
      let ident = "";
      while (i < expr.length && /[a-zA-Z0-9_]/.test(expr[i])) {
        ident += expr[i];
        i++;
      }
      tokens.push({ type: "IDENT", value: ident.toLowerCase() });
    } else {
      // Unknown character, skip
      i++;
    }
  }

  tokens.push({ type: "EOF", value: "" });
  return tokens;
}

class MathParser {
  private tokens: MathToken[];
  private current = 0;

  constructor(tokens: MathToken[]) {
    this.tokens = tokens;
  }

  private peek(): MathToken {
    return this.tokens[this.current] || { type: "EOF", value: "" };
  }

  private advance(): MathToken {
    const tok = this.peek();
    this.current++;
    return tok;
  }

  private match(...types: MathTokenType[]): boolean {
    if (types.includes(this.peek().type)) {
      this.advance();
      return true;
    }
    return false;
  }

  public parse(): number {
    const result = this.expression();
    return Number.isFinite(result) ? result : 0;
  }

  // Expression = Term (('+' | '-') Term)*
  private expression(): number {
    let value = this.term();

    while (this.peek().type === "PLUS" || this.peek().type === "MINUS") {
      const op = this.advance().type;
      const right = this.term();
      if (op === "PLUS") value += right;
      else value -= right;
    }

    return value;
  }

  // Term = Factor (('*' | '/' | '%') Factor)*
  private term(): number {
    let value = this.factor();

    while (
      this.peek().type === "MUL" ||
      this.peek().type === "DIV" ||
      this.peek().type === "MOD"
    ) {
      const op = this.advance().type;
      const right = this.factor();
      if (op === "MUL") {
        value *= right;
      } else if (op === "DIV") {
        value = right === 0 ? 0 : value / right;
      } else if (op === "MOD") {
        value = right === 0 ? 0 : value % right;
      }
    }

    return value;
  }

  // Factor = Unary ('^' Factor)?
  private factor(): number {
    const left = this.unary();

    if (this.peek().type === "POW") {
      this.advance();
      const right = this.factor();
      return Math.pow(left, right);
    }

    return left;
  }

  // Unary = ('+' | '-') Unary | Primary
  private unary(): number {
    if (this.match("PLUS")) {
      return this.unary();
    }
    if (this.match("MINUS")) {
      return -this.unary();
    }
    return this.primary();
  }

  // Primary = NUMBER | IDENT '(' ArgList ')' | IDENT | '(' Expression ')'
  private primary(): number {
    const token = this.peek();

    if (token.type === "NUMBER") {
      this.advance();
      const parsed = parseFloat(token.value);
      return isNaN(parsed) ? 0 : parsed;
    }

    if (token.type === "IDENT") {
      this.advance();
      const name = token.value;

      // Check constants
      if (name === "pi") return Math.PI;
      if (name === "e") return Math.E;

      // Function call
      if (this.peek().type === "LPAREN") {
        this.advance(); // consume '('
        const args: number[] = [];

        if (this.peek().type !== "RPAREN") {
          args.push(this.expression());
          while (this.match("COMMA")) {
            args.push(this.expression());
          }
        }

        if (this.peek().type === "RPAREN") {
          this.advance(); // consume ')'
        }

        return this.executeFunction(name, args);
      }

      return 0;
    }

    if (token.type === "LPAREN") {
      this.advance(); // consume '('
      const val = this.expression();
      if (this.peek().type === "RPAREN") {
        this.advance(); // consume ')'
      }
      return val;
    }

    return 0;
  }

  private executeFunction(name: string, args: number[]): number {
    switch (name) {
      case "abs":
        return Math.abs(args[0] ?? 0);
      case "floor":
        return Math.floor(args[0] ?? 0);
      case "ceil":
        return Math.ceil(args[0] ?? 0);
      case "round":
        return Math.round(args[0] ?? 0);
      case "sqrt":
        return Math.sqrt(Math.max(0, args[0] ?? 0));
      case "min":
        return args.length > 0 ? Math.min(...args) : 0;
      case "max":
        return args.length > 0 ? Math.max(...args) : 0;
      case "rand":
      case "random": {
        const min = args.length > 1 ? args[0] : 1;
        const max = args.length > 1 ? args[1] : args[0] ?? 100;
        return Math.floor(Math.random() * (max - min + 1)) + min;
      }
      default:
        return args[0] ?? 0;
    }
  }
}

/**
 * Safely evaluate a mathematical string expression.
 * Returns the numeric result or NaN if invalid.
 */
export function evaluateMath(expression: string): number {
  try {
    const tokens = tokenizeMath(expression);
    const parser = new MathParser(tokens);
    return parser.parse();
  } catch {
    return 0;
  }
}
