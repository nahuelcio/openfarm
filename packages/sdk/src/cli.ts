#!/usr/bin/env node
import { runTUIApp } from "./tui-cli";
import type { OpenFarmConfig } from "./types";

// Parse config from environment or use defaults
const config: OpenFarmConfig = {
  apiUrl: process.env.OPENFARM_API_URL,
  apiKey: process.env.OPENFARM_API_KEY,
  defaultProvider: process.env.OPENFARM_PROVIDER || "external-agent",
  defaultModel: process.env.OPENFARM_MODEL,
};

const args = process.argv.slice(2);
const wantsLegacyFlag = args.includes("--legacy-tui");
const wantsLegacyEnv = process.env.OPENFARM_ENABLE_LEGACY_TUI === "1";

if (!wantsLegacyFlag && !wantsLegacyEnv) {
  console.error(
    "[openfarm] TUI disabled by default. Use OpenFarm Desktop. To force legacy TUI for migration only, run with --legacy-tui or OPENFARM_ENABLE_LEGACY_TUI=1."
  );
  process.exit(1);
}

console.warn(
  "[openfarm] Legacy TUI mode enabled (deprecated). Migration target: OpenFarm Desktop."
);

runTUIApp(args.filter((arg) => arg !== "--legacy-tui"), config);
