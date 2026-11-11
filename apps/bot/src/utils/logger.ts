/**
 * Logger utility for Tortuga Bot.
 */

const colors = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  bright: "\x1b[1m",
  green: "\x1b[32m",
  blue: "\x1b[34m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

export class Logger {
  private prefix: string;

  constructor(prefix = "Tortuga") {
    this.prefix = prefix;
  }

  private timestamp(): string {
    return new Date().toISOString().replace("T", " ").substring(0, 19);
  }

  public info(message: string, ...args: unknown[]): void {
    console.log(
      `${colors.dim}[${this.timestamp()}]${colors.reset} ${colors.cyan}[${this.prefix}]${colors.reset} ${colors.blue}INFO${colors.reset} ${message}`,
      ...args
    );
  }

  public success(message: string, ...args: unknown[]): void {
    console.log(
      `${colors.dim}[${this.timestamp()}]${colors.reset} ${colors.cyan}[${this.prefix}]${colors.reset} ${colors.green}SUCCESS${colors.reset} ${message}`,
      ...args
    );
  }

  public warn(message: string, ...args: unknown[]): void {
    console.warn(
      `${colors.dim}[${this.timestamp()}]${colors.reset} ${colors.cyan}[${this.prefix}]${colors.reset} ${colors.yellow}WARN${colors.reset} ${message}`,
      ...args
    );
  }

  public error(message: string, error?: unknown): void {
    console.error(
      `${colors.dim}[${this.timestamp()}]${colors.reset} ${colors.cyan}[${this.prefix}]${colors.reset} ${colors.red}ERROR${colors.reset} ${message}`,
      error ?? ""
    );
  }

  public debug(message: string, ...args: unknown[]): void {
    if (process.env.DEBUG || process.env.NODE_ENV === "development") {
      console.log(
        `${colors.dim}[${this.timestamp()}]${colors.reset} ${colors.cyan}[${this.prefix}]${colors.reset} ${colors.magenta}DEBUG${colors.reset} ${message}`,
        ...args
      );
    }
  }
}

export const logger = new Logger("TortugaBot");
