import crypto from "node:crypto";
import { execSync } from "node:child_process";
import type { WebServerConfig } from "./types.ts";

const DEFAULT_PORT = 3001;
const DEFAULT_HOST = "127.0.0.1";

function resolveBunPath(): string {
  // Resolve full path to bun so node-pty can find it
  try {
    return execSync("which bun", { encoding: "utf-8" }).trim();
  } catch {
    return "bun"; // Fallback to PATH resolution
  }
}

export function parseConfig(args: string[]): WebServerConfig {
  const portIdx = args.indexOf("--port");
  const port =
    portIdx >= 0 && args[portIdx + 1]
      ? Number.parseInt(args[portIdx + 1], 10)
      : DEFAULT_PORT;

  const hostIdx = args.indexOf("--host");
  const host =
    hostIdx >= 0 && args[hostIdx + 1] ? args[hostIdx + 1] : DEFAULT_HOST;

  const noOpen = args.includes("--no-open");

  // Generate security token when binding to non-localhost
  const isRemote = host !== "127.0.0.1" && host !== "localhost";
  const token = isRemote ? crypto.randomBytes(16).toString("hex") : undefined;

  // Validate port
  if (Number.isNaN(port) || port < 1024 || port > 65535) {
    console.error(
      `[web-ui] Invalid port: ${port}. Must be between 1024-65535.`
    );
    process.exit(1);
  }

  return {
    port,
    host,
    open: !noOpen,
    command: [resolveBunPath(), "run", "tui"],
    cwd: process.cwd(),
    token,
  };
}

export function isLocalhost(host: string): boolean {
  return host === "127.0.0.1" || host === "localhost" || host === "::1";
}
