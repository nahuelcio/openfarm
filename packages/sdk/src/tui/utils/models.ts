/**
 * Dynamic model loading from provider packages.
 *
 * Each provider package should export:
 * - getAvailableModels(): string[]
 */

// Module-level cache: import() only happens once per provider
const modelCache = new Map<string, string[]>();
const loadingPromises = new Map<string, Promise<string[]>>();

/**
 * Get available models for a provider by loading from provider package.
 * Results are cached - the dynamic import only runs once per provider.
 * For external-agent, specify the CLI to get appropriate models.
 */
export async function getAvailableModels(
  provider: string,
  cli?: string
): Promise<string[]> {
  // For external-agent, use the CLI name as the provider key
  // This way "external-agent + opencode CLI" loads from @openfarm/provider-opencode
  const cacheKey = provider === "external-agent" && cli ? cli : provider;

  // Return from cache instantly if available
  const cached = modelCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  // If already loading, wait for the existing promise (don't start a second import)
  const existing = loadingPromises.get(cacheKey);
  if (existing) {
    return existing;
  }

  // Try loading from provider package first (works for both direct and external-agent)
  const promise = loadModelsFromProvider(cacheKey);
  loadingPromises.set(cacheKey, promise);

  let models = await promise;
  loadingPromises.delete(cacheKey);

  // Fallback to hardcoded list if provider package didn't have models
  if (models.length === 0 && provider === "external-agent" && cli) {
    models = getModelsForCli(cli);
  }

  modelCache.set(cacheKey, models);
  return models;
}

/**
 * Preload models for a provider in background (fire-and-forget).
 * Call this when the user selects a provider so models are ready
 * by the time they reach the model step.
 */
export function preloadModels(provider: string, cli?: string): void {
  const cacheKey = provider === "external-agent" && cli ? cli : provider;
  if (modelCache.has(cacheKey)) return; // Already cached
  if (loadingPromises.has(cacheKey)) return; // Already loading

  // Fire and forget
  getAvailableModels(provider, cli).catch(() => {});
}

async function loadModelsFromProvider(provider: string): Promise<string[]> {
  try {
    const packageName = `@openfarm/provider-${provider}`;
    const providerModule = await import(packageName);

    if (
      providerModule.getAvailableModels &&
      typeof providerModule.getAvailableModels === "function"
    ) {
      const models = providerModule.getAvailableModels();
      return Array.isArray(models) ? models : [];
    }

    return [];
  } catch (_error) {
    return [];
  }
}

/**
 * Get models for a specific CLI command (for external-agent).
 * Synchronous - no import needed.
 */
function getModelsForCli(cli: string): string[] {
  const modelMap: Record<string, string[]> = {
    claude: [
      "claude-3-5-sonnet-20241022",
      "claude-3-opus-20240229",
      "claude-3-sonnet-20240229",
      "claude-3-haiku-20240307",
    ],
    opencode: [
      "zai/glm-4.7",
      "zai/glm-4-flash",
      "openai/gpt-4o",
      "openai/gpt-4o-mini",
      "anthropic/claude-3-5-sonnet",
    ],
    aider: [
      "gpt-4o",
      "gpt-4o-mini",
      "claude-3-5-sonnet-20241022",
      "deepseek/deepseek-chat",
    ],
    codex: ["gpt-4o", "gpt-4o-mini", "o1-preview", "o1-mini"],
  };

  return modelMap[cli] || [];
}
