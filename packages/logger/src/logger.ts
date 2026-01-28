import pino from "pino";

export type { Logger } from "pino";

export const createLogger = (options?: pino.LoggerOptions): Logger => {
  return pino({
    level: process.env.LOG_LEVEL || "info",
    ...options,
  });
};

export const logger = createLogger();
