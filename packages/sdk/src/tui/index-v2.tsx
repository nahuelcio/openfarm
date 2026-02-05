#!/usr/bin/env node
/**
 * TUI v2 Entry Point
 *
 * Ralph TUI-style dashboard layout with tabs.
 */

import { render } from "@openfarm/tui-opentui";
import type { OpenFarmConfig } from "../types";
import { AppV2 } from "./app-v2";
import { useStore } from "./store";
import { useThemeStore } from "./theme/store";
import { preloadAllCommonModels } from "./utils/models";

export async function runTUIV2(
  config?: OpenFarmConfig,
  themeId?: string
): Promise<void> {
  if (config) {
    useStore.setState({
      config,
      provider: config.defaultProvider || "external-agent",
    });
  }

  // Set theme if provided
  if (themeId) {
    useThemeStore.getState().setTheme(themeId);
  }

  const { waitUntilExit } = render(<AppV2 />);

  // Preload models in background for faster UX
  preloadAllCommonModels();

  // Load execution history from database (non-blocking for faster startup)
  const { loadExecutionsFromDb } = useStore.getState();
  loadExecutionsFromDb();

  await waitUntilExit();
}
