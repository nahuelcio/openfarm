#!/usr/bin/env bun
import type { OpenFarmConfig } from "./types";

async function runWebMode(
  _args: string[],
  _config: OpenFarmConfig,
  _themeId?: string
): Promise<void> {
  // Web mode necesita un servidor HTTP porque el frontend corre en el browser
  // En dev, usamos Vite. En prod, serían archivos estáticos.
  const { startWebServer } = await import("@openfarm/web-ui/server");

  const portIndex = _args.indexOf("--port");
  const port = portIndex >= 0 && _args[portIndex + 1]
    ? Number.parseInt(_args[portIndex + 1], 10)
    : 3000;

  const noOpen = _args.includes("--no-open");

  console.log("🌐 Starting OpenFarm Web UI...");

  const server = await startWebServer({
    port,
    open: !noOpen,
  });

  // Mantener el proceso vivo hasta que el usuario cierre
  process.on("SIGINT", async () => {
    console.log("\n👋 Shutting down server...");
    await server.close();
    process.exit(0);
  });

  // Esperar indefinidamente
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

  // If --web flag, run web mode
  if (useWeb) {
    return runWebMode(args, config, themeId);
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
    const specModulePath = "@openfarm/spec";
    const { runSpecCLI } = (await import(specModulePath)) as {
      runSpecCLI: (args: string[]) => Promise<void>;
    };
    return runSpecCLI(args.slice(1));
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
