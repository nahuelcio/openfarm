#!/usr/bin/env node
import { render } from "ink";
import type { OpenFarmConfig } from "../types";
import { App } from "./app";
import { useStore } from "./store";

export async function runTUI(config?: OpenFarmConfig): Promise<void> {
  if (config) {
    useStore.setState({
      config,
      provider: config.defaultProvider || "opencode",
    });
  }

  const { waitUntilExit } = render(<App />);

  // Load execution history from database (non-blocking for faster startup)
  const { loadExecutionsFromDb } = useStore.getState();
  void loadExecutionsFromDb();

  await waitUntilExit();
}
