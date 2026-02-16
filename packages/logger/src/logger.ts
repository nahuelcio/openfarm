import pino from "pino";

export type { Logger } from "pino";

export const createLogger = (options?: pino.LoggerOptions): pino.Logger => {
  const level = (() => {
    try {
      return (typeof process !== "undefined" && process.env?.LOG_LEVEL) || "info";
    } catch {
      return "info";
    }
  })();
  
  return pino({
    level,
    ...options,
  });
};

let _logger: pino.Logger | null = null;

export const logger = (): pino.Logger => {
  if (!_logger) {
    _logger = createLogger();
  }
  return _logger;
};
