// @openfarm/queues - Inngest client factory
// Version: 1.0.0
// License: MIT

import { DEFAULT_HOSTS, DEFAULT_PORTS } from "@openfarm/core";
import { Inngest } from "inngest";
import { InngestQueueAdapter } from "./adapters/inngest";
import { Queue } from "./queue";

/**
 * Create an Inngest client instance with default configuration
 */
export function createInngestClient(): Inngest {
  // Determine if we're using local Inngest (dev mode) or Inngest Cloud
  const inngestBaseUrl =
    process.env.INNGEST_BASE_URL ||
    `http://${DEFAULT_HOSTS.LOCALHOST}:${DEFAULT_PORTS.INNGEST}`;
  const isLocalInngest =
    inngestBaseUrl.includes("localhost") ||
    inngestBaseUrl.includes(DEFAULT_HOSTS.LOCALHOST) ||
    inngestBaseUrl.includes(`inngest:${DEFAULT_PORTS.INNGEST}`) ||
    process.env.INNGEST_DEV === "1";

  return new Inngest({
    id: "minions-farm",
    // Use dev mode if explicitly set, or if using local Inngest
    isDev: process.env.NODE_ENV !== "production" || isLocalInngest,
    baseUrl: inngestBaseUrl,
    // Signing key is required for production with Inngest Cloud
    // In dev mode with local Inngest, it's optional
    signingKey:
      process.env.INNGEST_SIGNING_KEY &&
      process.env.INNGEST_SIGNING_KEY.trim() !== ""
        ? process.env.INNGEST_SIGNING_KEY
        : undefined,
  });
}

/**
 * Create a Queue instance with Inngest adapter
 */
export function createInngestQueue(inngest?: Inngest): Queue {
  const client = inngest ?? createInngestClient();
  const adapter = new InngestQueueAdapter(client);
  return new Queue({ adapter });
}
