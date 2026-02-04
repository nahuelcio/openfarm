#!/usr/bin/env bun
import type { OpenFarmConfig } from "./types";

export async function runTUIApp(
  args: string[],
  config: OpenFarmConfig
): Promise<void> {
  // Parse flags
  const useLegacy = args.includes("--cli") || args.includes("--legacy");
  const useTaskLoop = args.includes("--task-loop") || args.includes("--loop");
  const useRemote = args.includes("--remote") || args.includes("--server");

  // Parse --theme flag
  const themeIndex = args.findIndex((arg) => arg === "--theme");
  const themeId =
    themeIndex >= 0 && args[themeIndex + 1] ? args[themeIndex + 1] : undefined;

  // Si se pasa --cli o --legacy, usar modo legacy
  if (useLegacy) {
    const { runLegacyCLI } = await import("./cli-legacy");
    return runLegacyCLI(args, config);
  }

  // Si el primer argumento es "context", usar el CLI de contexto
  if (args[0] === "context") {
    const { runContextCLI } = await import("./cli-context");
    return runContextCLI(args.slice(1), config);
  }

  // Si es comando task-loop, ejecutar task loop directamente
  if (args[0] === "task-loop" || args[0] === "loop" || useTaskLoop) {
    const { runTaskLoopCLI } = await import("./cli/task-loop-cli");
    return runTaskLoopCLI(args.slice(1), config);
  }

  // Si es comando remote-server, iniciar servidor
  if (args[0] === "remote-server" || args[0] === "server" || useRemote) {
    const { runRemoteServerCLI } = await import("./cli/remote-server-cli");
    return runRemoteServerCLI(args.slice(1), config);
  }

  // Por defecto, usar TUI v2 (Ralph-style dashboard)
  const { runTUIV2 } = await import("./tui/index-v2");
  await runTUIV2(config, themeId);
}
