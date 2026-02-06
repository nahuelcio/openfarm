#!/usr/bin/env bun
import type { OpenFarmConfig } from "./types";

async function runWebMode(args: string[]): Promise<void> {
  const { startWebServer, parseConfig } = await import("@openfarm/web-ui");

  const config = parseConfig(args);

  console.log("Starting OpenFarm Web UI (Thin Client)...");

  const server = await startWebServer(config);

  process.on("SIGINT", () => {
    console.log("\nShutting down server...");
    server.close();
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    server.close();
    process.exit(0);
  });

  // Keep process alive
  await new Promise(() => {});
}

export async function runTUIApp(
  args: string[],
  config: OpenFarmConfig
): Promise<void> {
  // Parse flags
  const useTaskLoop = args.includes("--task-loop") || args.includes("--loop");
  const useRemote = args.includes("--remote") || args.includes("--server");
  const useWeb = args.includes("--web");

  // Parse --theme flag
  const themeIndex = args.indexOf("--theme");
  const themeId =
    themeIndex >= 0 && args[themeIndex + 1] ? args[themeIndex + 1] : undefined;

  // If --web flag, run web mode (Thin Client: xterm.js + PTY)
  if (useWeb) {
    return runWebMode(args);
  }

  // If first argument is "context", use the context CLI
  if (args[0] === "context") {
    const { runContextCLI } = await import("./cli-context");
    return runContextCLI(args.slice(1), config);
  }

  // If command is remote-server, start server
  if (args[0] === "remote-server" || args[0] === "server" || useRemote) {
    const { runRemoteServerCLI } = await import("./cli/remote-server-cli");
    return runRemoteServerCLI(args.slice(1), config);
  }

  // If command is spec, delegate to spec CLI
  if (args[0] === "spec") {
    try {
      const specModulePath = "@openfarm/spec";
      const { runSpecCLI } = (await import(specModulePath)) as {
        runSpecCLI: (args: string[]) => Promise<void>;
      };
      return runSpecCLI(args.slice(1));
    } catch (error) {
      const importError =
        error instanceof Error ? error.message : "unknown import error";
      throw new Error(
        `The 'spec' command is not available in this OSS build. Missing optional package '@openfarm/spec'. Original error: ${importError}`
      );
    }
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
