#!/usr/bin/env node
/**
 * CLI entry point for Web UI mode
 *
 * Usage: bun run web
 */

import { runWebApp } from "./web-cli";
import type { OpenFarmConfig } from "./types";

const config: OpenFarmConfig = {
  apiUrl: process.env.OPENFARM_API_URL,
  apiKey: process.env.OPENFARM_API_KEY,
  defaultProvider: process.env.OPENFARM_PROVIDER || "external-agent",
  defaultModel: process.env.OPENFARM_MODEL,
};

runWebApp(process.argv.slice(2), config).catch((error) => {
  console.error("Failed to start Web UI:", error);
  process.exit(1);
});
