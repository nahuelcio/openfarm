#!/usr/bin/env bun
/**
 * Web UI Entry Point for OpenFarm SDK
 *
 * Misma app que la TUI pero renderizada en el browser.
 * Usa @openfarm/web-ui como runtime en vez de @opentui/react.
 */

import type { ReactElement } from "react";
import type { OpenFarmConfig } from "./types";

// Lazy imports para no cargar dependencias de web en modo TUI
async function loadWebRuntime() {
  const { createWebApp } = await import("@openfarm/web-ui");
  return { createWebApp };
}

async function loadApp() {
  const { AppV2 } = await import("./tui/app-v2");
  const { useStore } = await import("./tui/store");
  const { preloadAllCommonModels } = await import("./tui/utils/models");
  return { AppV2, useStore, preloadAllCommonModels };
}

export async function runWebApp(
  _args: string[],
  config?: OpenFarmConfig
): Promise<void> {
  const [{ createWebApp }, { AppV2, useStore, preloadAllCommonModels }] =
    await Promise.all([loadWebRuntime(), loadApp()]);

  // Initialize stores (misma lógica que TUI)
  if (config) {
    useStore.setState({
      config,
      provider: config.defaultProvider || "external-agent",
    });
  }

  // Preload models en background
  preloadAllCommonModels();

  // Load execution history
  const { loadExecutionsFromDb } = useStore.getState();
  loadExecutionsFromDb();

  // Create wrapper component para pasar contexto si es necesario
  const WebAppWrapper = (): ReactElement => <AppV2 />;

  // Start web app
  const app = createWebApp(WebAppWrapper, {
    title: "OpenFarm",
    theme: "dark",
  });

  await app.start();
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
