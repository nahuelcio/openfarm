#!/usr/bin/env bun
import React from "react";
import { createRoot } from "@opentui/react";
import { createCliRenderer } from "@opentui/core";
import { App } from "./App";
import type { OpenFarmConfig } from "../types";

export async function runTUI(config: OpenFarmConfig): Promise<void> {
  const renderer = await createCliRenderer({
    exitOnCtrlC: true,
    useAlternateScreen: true,
  });

  const root = createRoot(renderer);
  
  root.render(<App config={config} />);
  
  // Start the renderer
  renderer.start();
}
