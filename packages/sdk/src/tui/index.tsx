#!/usr/bin/env bun
import React from "react";
import { createRoot } from "@opentui/react";
import { createCliRenderer } from "@opentui/core";
import { App } from "./App";
import { loadConfig } from "./config/loader";
import { useAppStore } from "./store";
import type { OpenFarmConfig } from "../types";

export async function runTUI(config?: OpenFarmConfig): Promise<void> {
  // Load config from file/env if not provided
  const loadedConfig = config || (await loadConfig());

  // Initialize store with loaded config
  useAppStore.setState({ config: loadedConfig });

  const renderer = await createCliRenderer({
    exitOnCtrlC: true,
    useAlternateScreen: true,
    targetFps: 30,
  });

  const root = createRoot(renderer);
  
  root.render(<App config={loadedConfig} />);
  
  // Start the renderer
  renderer.start();
}
