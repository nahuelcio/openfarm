#!/usr/bin/env node
import { render } from "ink";
import type { OpenFarmConfig } from "../types";
import { App } from "./App";
import { useStore } from "./store";

export async function runTUI(config?: OpenFarmConfig): Promise<void> {
  if (config) {
    useStore.setState({
      config,
      provider: config.defaultProvider || "opencode",
    });
  }

  const { waitUntilExit } = render(<App />);
  await waitUntilExit();
}
