import { execSync } from "node:child_process";

export { OpenCodeProviderFactory } from "./opencode-factory";
export { OpenCodeProvider } from "./opencode-provider";
export type {
  FileDiff,
  OpenCodeConfig,
  OpenCodeEvent,
  OpenCodeExecutionState,
  OpenCodeMessage,
  OpenCodeSession,
} from "./types";

/**
 * Get list of available models for OpenCode provider.
 * Executes `opencode models` to get dynamic list.
 */
export function getAvailableModels(): string[] {
  try {
    // Execute opencode models command
    const output = execSync("opencode models", {
      encoding: "utf8",
      timeout: 5000,
      stdio: ["ignore", "pipe", "ignore"],
    });

    // Parse output - one model per line
    const models = output
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"));

    return models;
  } catch (error) {
    // If command fails, return empty array
    console.error("Failed to load OpenCode models:", error);
    return [];
  }
}
