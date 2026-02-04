#!/usr/bin/env node
/**
 * TUI v2 Entry Point
 *
 * Ralph TUI-style dashboard layout with tabs.
 */

import { render } from "ink";
import React from "react";
import type { OpenFarmConfig } from "../types";
import { AppV2 } from "./app-v2";
import { useStore } from "./store";
import { useThemeStore } from "./theme/store";

export async function runTUIV2(
  config?: OpenFarmConfig,
  themeId?: string
): Promise<void> {
  if (config) {
    useStore.setState({
      config,
      provider: config.defaultProvider || "opencode",
    });
  }

  // Set theme if provided
  if (themeId) {
    useThemeStore.getState().setTheme(themeId);
  }

  // Load execution history from database
  const { loadExecutionsFromDb } = useStore.getState();
  await loadExecutionsFromDb();

  const { waitUntilExit } = render(<AppV2 />);
  await waitUntilExit();
}
