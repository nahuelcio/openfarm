#!/usr/bin/env bun
/**
 * Web UI Entry Point for OpenFarm SDK
 *
 * Thin client web mode backed by @openfarm/web-ui server runtime.
 */

import type { OpenFarmConfig } from "./types";

export async function runWebApp(
  args: string[],
  _config?: OpenFarmConfig
): Promise<void> {
  const { startWebServer, parseConfig } = await import("@openfarm/web-ui");
  const webConfig = parseConfig(args);

  console.log("Starting OpenFarm Web UI (Thin Client)...");

  const server = await startWebServer(webConfig);

  process.on("SIGINT", () => {
    console.log("\nShutting down server...");
    server.close();
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    server.close();
    process.exit(0);
  });

  await new Promise(() => {});
}

// Entry point directo
if (import.meta.main) {
  const config: OpenFarmConfig = {
    apiUrl: process.env.OPENFARM_API_URL,
    apiKey: process.env.OPENFARM_API_KEY,
    defaultProvider: process.env.OPENFARM_PROVIDER || "external-agent",
    defaultModel: process.env.OPENFARM_MODEL,
  };

  runWebApp([], config).catch((error) => {
    console.error("Failed to start Web UI:", error);
    process.exit(1);
  });
}
