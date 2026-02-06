#!/usr/bin/env node
/**
 * CLI entry point for Web UI mode (Thin Client)
 *
 * Usage: bun run web
 * Flags: --port <number>, --host <string>, --no-open
 */

import { parseConfig, startWebServer } from "@openfarm/web-ui";

const config = parseConfig(process.argv.slice(2));

console.log("Starting OpenFarm Web UI (Thin Client)...");

const server = await startWebServer(config);

process.on("SIGINT", () => {
  console.log("\nShutting down server...");
  server.close();
  process.exit(0);
});

process.on("SIGTERM", () => {
  server.close();
  process.exit(0);
});
