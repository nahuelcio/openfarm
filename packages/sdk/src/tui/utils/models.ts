/**
 * Model loading for providers and external agents with caching and preloading.
 */
import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

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
    "opencode/gpt-5-nano",
    "opencode/grok-code-fast-1",
    "gpt-5-mini",
    "gpt-4o",
    "gpt-4o-mini",
  ],
};

const PROVIDER_FALLBACK_MODELS: Record<string, string[]> = {
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
  opencode: [
    "opencode/gpt-5-nano",
    "opencode/grok-code-fast-1",
    "gpt-5-mini",
    "gpt-4o",
    "gpt-4o-mini",
    "zai/glm-4.7",
    "zai/glm-4-flash",
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
function cacheModels(
  provider: string,
  cli: string | undefined,
  models: string[]
): void {
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
        const { stdout } = await execAsync(`${cli} ${flag}`, {
          timeout: 5000,
          windowsHide: true,
          maxBuffer: 1024 * 1024,
        });

        const models = parseCliOutput(stdout || "");
        if (models.length > 0) {
          return models;
        }
      } catch {}
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
    if (!trimmed) {
      continue;
    }

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
    const match = trimmed.match(/^[-*\s]*([a-zA-Z0-9._/-]+)/);
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
  const importAtRuntime = new Function(
    "modulePath",
    "return import(modulePath);"
  ) as (modulePath: string) => Promise<Record<string, unknown>>;
  const hasModelLoader = (
    mod: Record<string, unknown>
  ): mod is Record<string, unknown> & {
    getAvailableModels: () => string[] | Promise<string[]>;
  } => typeof mod.getAvailableModels === "function";

  const supportedExternalProviders = new Set(["opencode", "aider", "claude"]);

  try {
    if (supportedExternalProviders.has(provider)) {
      const mod = await importAtRuntime(`@openfarm/provider-${provider}`);
      if (hasModelLoader(mod)) {
        const models = await mod.getAvailableModels();
        return Array.isArray(models) ? models : [];
      }
    }
  } catch {
    // Package not found or doesn't export getAvailableModels
  }

  const supportedLocalProviders = new Set(["opencode", "aider", "claude"]);
  if (!supportedLocalProviders.has(provider)) {
    return [];
  }

  const localSource = `../../../../provider-${provider}/src/index.ts`;

  try {
    const mod = await importAtRuntime(localSource);
    if (hasModelLoader(mod)) {
      const models = await mod.getAvailableModels();
      return Array.isArray(models) ? models : [];
    }
  } catch {
    // Local source fallback failed
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
  const commonProviders = ["direct-api", "anthropic", "openai", "opencode"];
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
