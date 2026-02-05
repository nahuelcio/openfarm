#!/usr/bin/env bun
import type { OpenFarmConfig } from "./types";

export async function runTUIApp(
  args: string[],
  config: OpenFarmConfig
): Promise<void> {
  // Parse flags
  const useTaskLoop = args.includes("--task-loop") || args.includes("--loop");
  const useRemote = args.includes("--remote") || args.includes("--server");

  // Parse --theme flag
  const themeIndex = args.indexOf("--theme");
  const themeId =
    themeIndex >= 0 && args[themeIndex + 1] ? args[themeIndex + 1] : undefined;

  // Si el primer argumento es "context", usar el CLI de contexto
  if (args[0] === "context") {
    const { runContextCLI } = await import("./cli-context");
    return runContextCLI(args.slice(1), config);
  }

  // Si es comando remote-server, iniciar servidor
  if (args[0] === "remote-server" || args[0] === "server" || useRemote) {
    const { runRemoteServerCLI } = await import("./cli/remote-server-cli");
    return runRemoteServerCLI(args.slice(1), config);
  }

  // TUI unificada: siempre usar AppV2
  if (args.includes("--cli") || args.includes("--legacy")) {
    console.warn(
      "[openfarm] --cli/--legacy is deprecated. Using unified TUI (AppV2)."
    );
  }

  const openTaskLoopScreen =
    args[0] === "task-loop" || args[0] === "loop" || useTaskLoop;

  if (openTaskLoopScreen) {
    const { useStore } = await import("./tui/store");
    useStore.setState({
      activeTab: "execute",
      screen: "task-loop",
    });
  }

  const { runTUIV2 } = await import("./tui/index-v2");
  await runTUIV2(config, themeId);
}
