/**
 * Model loading for providers and external agents with caching and preloading.
 */
import { execSync } from "node:child_process";

// Cache for loaded models
const modelCache = new Map<string, { models: string[]; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Hardcoded fallbacks for CLIs and providers
const CLI_MODELS: Record<string, string[]> = {
  claude: [
    "claude-3-5-sonnet-20241022",
    "claude-3-5-haiku-20241022",
    "claude-3-opus-20240229",
    "claude-3-sonnet-20240229",
    "claude-3-haiku-20240307",
  ],
  aider: [
    "gpt-4o",
    "gpt-4o-mini",
    "claude-3-5-sonnet-20241022",
    "claude-3-5-haiku-20241022",
    "deepseek/deepseek-chat",
    "deepseek/deepseek-coder",
  ],
  codex: ["gpt-4o", "gpt-4o-mini", "o1-preview", "o1-mini"],
  opencode: [
    "gpt-4o",
    "gpt-4o-mini",
    "claude-3-5-sonnet-20241022",
    "claude-3-5-haiku-20241022",
    "gemini-2.0-flash-exp",
    "gemini-1.5-pro",
    "deepseek-chat",
    "deepseek-coder",
  ],
};

const PROVIDER_FALLBACK_MODELS: Record<string, string[]> = {
  opencode: CLI_MODELS.opencode,
  "direct-api": [
    "gpt-4o",
    "gpt-4o-mini",
    "gpt-4-turbo",
    "gpt-3.5-turbo",
    "claude-3-5-sonnet-20241022",
    "claude-3-5-haiku-20241022",
  ],
  anthropic: [
    "claude-3-5-sonnet-20241022",
    "claude-3-5-haiku-20241022",
    "claude-3-opus-20240229",
    "claude-3-sonnet-20240229",
    "claude-3-haiku-20240307",
  ],
  openai: [
    "gpt-4o",
    "gpt-4o-mini",
    "gpt-4-turbo",
    "gpt-4",
    "gpt-3.5-turbo",
    "o1-preview",
    "o1-mini",
  ],
};

/**
 * Get cache key for provider/cli combination
 */
function getCacheKey(provider: string, cli?: string): string {
  return cli ? `${provider}:${cli}` : provider;
}

/**
 * Check if cached models are still valid
 */
function getCachedModels(provider: string, cli?: string): string[] | null {
  const key = getCacheKey(provider, cli);
  const cached = modelCache.get(key);

  if (!cached) {
    return null;
  }

  const age = Date.now() - cached.timestamp;
  if (age > CACHE_TTL) {
    modelCache.delete(key);
    return null;
  }

  return cached.models;
}

/**
 * Cache models for provider/cli
 */
function cacheModels(provider: string, cli: string | undefined, models: string[]): void {
  const key = getCacheKey(provider, cli);
  modelCache.set(key, {
    models,
    timestamp: Date.now(),
  });
}

/**
 * Get available models for a provider.
 * Returns cached models if available, otherwise fetches and caches.
 */
export async function getAvailableModels(
  provider: string,
  cli?: string
): Promise<string[]> {
  // Check cache first
  const cached = getCachedModels(provider, cli);
  if (cached) {
    return cached;
  }

  let models: string[] = [];

  // External agent with CLI
  if (provider === "external-agent" && cli) {
    // Try to get models from CLI
    models = await fetchModelsFromCli(cli);

    if (models.length === 0) {
      // Fallback to hardcoded for this CLI
      models = CLI_MODELS[cli] || [];
    }
  } else {
    // Regular providers - try package first
    models = await loadFromProviderPackage(provider);

    if (models.length === 0) {
      // Fallback to hardcoded
      models = PROVIDER_FALLBACK_MODELS[provider] || [];
    }
  }

  // Cache the result
  if (models.length > 0) {
    cacheModels(provider, cli, models);
  }

  return models;
}

/**
 * Execute CLI with --models flag to get available models
 */
async function fetchModelsFromCli(cli: string): Promise<string[]> {
  try {
    // Common flags used by different CLIs to list models
    const flags = [
      "--models",
      "models",
      "--list-models",
      "-m",
      "model list",
      "--help", // Some CLIs list models in help
    ];

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
      trimmed.toLowerCase().includes("usage:") ||
      trimmed.toLowerCase().includes("options:") ||
      trimmed.toLowerCase().includes("commands:")
    ) {
      continue;
    }

    // Extract model ID - common patterns:
    // - gpt-4o
    // * anthropic/claude-3-opus
    //   google/gemini-pro
    // gpt-4o-mini (default)
    const match = trimmed.match(/^[-*\s]*([a-zA-Z0-9._\/-]+)/);
    if (match) {
      const model = match[1].trim();

      // Filter out obvious non-models
      if (
        model &&
        model.length > 2 &&
        !model.toLowerCase().includes("model") &&
        !model.includes("═") &&
        !model.includes("─") &&
        !model.startsWith("--") &&
        !model.startsWith("-h") &&
        // Common model patterns
        (model.includes("-") || model.includes("/") || model.match(/^[a-z]+\d/))
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
      const models = await mod.getAvailableModels();
      return Array.isArray(models) ? models : [];
    }
  } catch {
    // Package not found or doesn't export getAvailableModels
  }
  return [];
}

/**
 * Preload models in background for a single provider/cli
 */
export function preloadModels(provider: string, cli?: string): void {
  // Fire and forget - errors are silently caught
  getAvailableModels(provider, cli).catch(() => {
    // Preload failed, cache will remain empty
  });
}

/**
 * Preload models for all common providers in parallel.
 * Call this on app startup to warm the cache.
 */
export function preloadAllCommonModels(): void {
  const commonProviders = ["opencode", "direct-api", "anthropic", "openai"];
  const commonClis = ["claude", "aider", "opencode"];

  // Preload provider models
  for (const provider of commonProviders) {
    preloadModels(provider);
  }

  // Preload CLI models
  for (const cli of commonClis) {
    preloadModels("external-agent", cli);
  }
}

/**
 * Clear the model cache.
 * Useful for forcing a refresh of models.
 */
export function clearModelCache(): void {
  modelCache.clear();
}

/**
 * Get cache statistics (for debugging)
 */
export function getModelCacheStats(): {
  size: number;
  keys: string[];
  oldestAge: number;
} {
  const now = Date.now();
  let oldestAge = 0;

  const entries = Array.from(modelCache.values());
  for (const value of entries) {
    const age = now - value.timestamp;
    if (age > oldestAge) {
      oldestAge = age;
    }
  }

  return {
    size: modelCache.size,
    keys: Array.from(modelCache.keys()),
    oldestAge,
  };
}
