#!/usr/bin/env node
import { runTUIApp } from "./tui-cli";
import type { OpenFarmConfig } from "./types";

// Parse config from environment or use defaults
const config: OpenFarmConfig = {
  apiUrl: process.env.OPENFARM_API_URL,
  apiKey: process.env.OPENFARM_API_KEY,
  defaultProvider: process.env.OPENFARM_PROVIDER || "opencode",
  defaultModel: process.env.OPENFARM_MODEL,
};

// Run TUI
runTUIApp(process.argv.slice(2), config);
