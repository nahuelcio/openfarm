export type LogLevel = "error" | "warn" | "info" | "debug";

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

class Logger {
  private currentLevel: LogLevel;
  private readonly prefix: string;

  constructor(prefix = "OpenFarm") {
    this.prefix = prefix;
    this.currentLevel = this.detectLevel();
  }

  private detectLevel(): LogLevel {
    // Check environment variable first
    const envLevel = process.env.OPENFARM_LOG_LEVEL?.toLowerCase() as LogLevel;
    if (envLevel && envLevel in LEVEL_PRIORITY) {
      return envLevel;
    }

    // In production/test, default to warn
    if (
      process.env.NODE_ENV === "production" ||
      process.env.NODE_ENV === "test"
    ) {
      return "warn";
    }

    // Default to info for development
    return "info";
  }

  setLevel(level: LogLevel): void {
    this.currentLevel = level;
  }

  private shouldLog(level: LogLevel): boolean {
    return LEVEL_PRIORITY[level] <= LEVEL_PRIORITY[this.currentLevel];
  }

  private format(level: LogLevel, message: string): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${this.prefix}] [${level.toUpperCase()}] ${message}`;
  }

  error(message: string, ...args: unknown[]): void {
    if (this.shouldLog("error")) {
      console.error(this.format("error", message), ...args);
    }
  }

  warn(message: string, ...args: unknown[]): void {
    if (this.shouldLog("warn")) {
      console.warn(this.format("warn", message), ...args);
    }
  }

  info(message: string, ...args: unknown[]): void {
    if (this.shouldLog("info")) {
      console.info(this.format("info", message), ...args);
    }
  }

  debug(message: string, ...args: unknown[]): void {
    if (this.shouldLog("debug")) {
      console.debug(this.format("debug", message), ...args);
    }
  }
}

// Global logger instance
export const logger = new Logger();

// Helper to create loggers with custom prefix
export function createLogger(prefix: string): Logger {
  return new Logger(prefix);
}
