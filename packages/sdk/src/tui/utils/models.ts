/**
 * Model loading for providers and external agents.
 */
import { execSync } from "node:child_process";

// Hardcoded fallbacks for CLIs
const CLI_MODELS: Record<string, string[]> = {
  claude: [
    "claude-3-5-sonnet-20241022",
    "claude-3-opus-20240229",
    "claude-3-sonnet-20240229",
    "claude-3-haiku-20240307",
  ],
  aider: ["gpt-4o", "gpt-4o-mini", "claude-3-5-sonnet-20241022"],
  codex: ["gpt-4o", "gpt-4o-mini", "o1-preview", "o1-mini"],
};

/**
 * Get available models for a provider.
 * For external-agent, tries to execute CLI with --models flag.
 * Falls back to hardcoded list if CLI fails.
 */
export async function getAvailableModels(
  provider: string,
  cli?: string
): Promise<string[]> {
  // External agent with CLI
  if (provider === "external-agent" && cli) {
    // Try to get models from CLI
    const cliModels = await fetchModelsFromCli(cli);
    if (cliModels.length > 0) {
      return cliModels;
    }
    // Fallback to hardcoded
    return CLI_MODELS[cli] || [];
  }

  // Regular providers
  return loadFromProviderPackage(provider);
}

/**
 * Execute CLI with --models flag to get available models
 */
async function fetchModelsFromCli(cli: string): Promise<string[]> {
  try {
    // Common flags used by different CLIs to list models
    const flags = ["--models", "models", "--list-models", "-m"];

    for (const flag of flags) {
      try {
        const output = execSync(`${cli} ${flag}`, {
          encoding: "utf-8",
          timeout: 5000,
          stdio: ["pipe", "pipe", "ignore"], // Ignore stderr
        });

        const models = parseCliOutput(output);
        if (models.length > 0) {
          return models;
        }
      } catch {
        // Try next flag
        continue;
      }
    }
  } catch {
    // All flags failed
  }

  return [];
}

/**
 * Parse model list from CLI output
 */
function parseCliOutput(output: string): string[] {
  const models: string[] = [];

  for (const line of output.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Skip headers and common non-model lines
    if (
      trimmed.toLowerCase().includes("available models") ||
      trimmed.toLowerCase().includes("models:") ||
      trimmed.startsWith("-") === false
    ) {
      // Try to extract model name anyway (might be just a list)
    }

    // Extract model ID - usually lines like:
    // - gpt-4o
    // * anthropic/claude-3-opus
    //   google/gemini-pro
    const match = trimmed.match(/^[-*\s]*(.+)$/);
    if (match) {
      const model = match[1].trim();
      // Filter out obvious non-models
      if (
        model &&
        !model.toLowerCase().includes("model") &&
        !model.includes("═") &&
        !model.includes("─")
      ) {
        models.push(model);
      }
    }
  }

  return models;
}

/**
 * Try to load models from provider package
 */
async function loadFromProviderPackage(provider: string): Promise<string[]> {
  try {
    const mod = await import(`@openfarm/provider-${provider}`);
    if (typeof mod.getAvailableModels === "function") {
      const models = mod.getAvailableModels();
      return Array.isArray(models) ? models : [];
    }
  } catch {
    // Package not found
  }
  return [];
}

/**
 * Preload models in background
 */
export function preloadModels(provider: string, cli?: string): void {
  getAvailableModels(provider, cli).catch(() => {});
}
