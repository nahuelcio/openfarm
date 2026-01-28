import pino from "pino";

export type { Logger } from "pino";

export const createLogger = (options?: pino.LoggerOptions): pino.Logger => {
  return pino({
    level: process.env.LOG_LEVEL || "info",
    ...options,
  });
};

export const logger = createLogger();
