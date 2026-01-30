/**
 * Dynamic model loading from provider packages.
 *
 * Each provider package should export:
 * - getAvailableModels(): string[]
 */

/**
 * Get available models for a provider by loading from provider package.
 */
export async function getAvailableModels(
  provider: string
): Promise<string[]> {
  try {
    // Try to dynamically import the provider package
    const packageName = `@openfarm/provider-${provider}`;

    const providerModule = await import(packageName);

    // Check if provider exports getAvailableModels
    if (
      providerModule.getAvailableModels &&
      typeof providerModule.getAvailableModels === "function"
    ) {
      const models = providerModule.getAvailableModels();
      return Array.isArray(models) ? models : [];
    }

    // Fallback: empty array (user can enter custom)
    return [];
  } catch (error) {
    // Provider package not found or doesn't export models
    // Return empty array so user can enter custom model
    return [];
  }
}

/**
 * Synchronous version - tries to load models or returns empty array
 */
export function getAvailableModelsSync(provider: string): string[] {
  try {
    // For now, return empty - will be loaded async
    // This is a fallback for synchronous contexts
    return [];
  } catch {
    return [];
  }
}
