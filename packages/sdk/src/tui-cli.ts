#!/usr/bin/env bun
import { runTUI } from "./tui";
import type { OpenFarmConfig } from "./types";

export async function runTUIApp(
  args: string[],
  config: OpenFarmConfig
): Promise<void> {
  // Si se pasa --cli, usar modo legacy
  if (args.includes("--cli")) {
    const { runLegacyCLI } = await import("./cli-legacy");
    return runLegacyCLI(args, config);
  }

  // Si el primer argumento es "context", usar el CLI de contexto
  if (args[0] === "context") {
    const { runContextCLI } = await import("./cli-context");
    return runContextCLI(args.slice(1), config);
  }

  // Por defecto, usar TUI
  await runTUI(config);
}
