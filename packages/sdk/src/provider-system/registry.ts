/**
 * Provider registry for managing and discovering available providers.
 *
 * The registry handles provider registration, discovery, and instantiation.
 * It supports both built-in providers and external provider packages.
 */

import { FactoryRegistry } from "./factory";
import type {
  ProviderRegistry as IProviderRegistry,
  Provider,
  ProviderError,
  ProviderFactory,
  ProviderMetadata,
} from "./types";

/**
 * Lazy provider factory wrapper for deferred loading
 */
interface LazyProviderFactory {
  metadata: ProviderMetadata;
  loader: () => Promise<ProviderFactory>;
  loaded?: ProviderFactory;
}

/**
 * Central registry for managing provider factories and metadata.
 * Implements automatic discovery and manual registration of providers.
 */
export class ProviderRegistry implements IProviderRegistry {
  private readonly factoryRegistry = new FactoryRegistry();
  private readonly metadata = new Map<string, ProviderMetadata>();
  private readonly lazyFactories = new Map<string, LazyProviderFactory>();
  private readonly providerCache = new Map<string, Provider>();
  private discoveryComplete = false;

  /**
   * Register a provider factory manually.
   * Used for built-in providers and explicit external provider registration.
   */
  registerProvider(factory: ProviderFactory): void {
    const metadata = factory.getMetadata();

    // Validate metadata
    this.validateProviderMetadata(metadata);

    // Check for conflicts
    if (this.factoryRegistry.has(metadata.type)) {
      throw this.createRegistryError(
        "PROVIDER_CONFLICT",
        `Provider type '${metadata.type}' is already registered`,
        {
          existingProvider: this.metadata.get(metadata.type),
          newProvider: metadata,
        }
      );
    }

    // Register factory and metadata
    this.factoryRegistry.register(factory);
    this.metadata.set(metadata.type, metadata);

    console.debug(
      `[ProviderRegistry] Registered provider: ${metadata.type} (${metadata.name})`
    );
  }

  /**
   * Register a lazy-loaded provider factory.
   * The factory will be loaded only when first needed.
   */
  registerLazyProvider(
    metadata: ProviderMetadata,
    loader: () => Promise<ProviderFactory>
  ): void {
    // Validate metadata
    this.validateProviderMetadata(metadata);

    // Check for conflicts
    if (
      this.factoryRegistry.has(metadata.type) ||
      this.lazyFactories.has(metadata.type)
    ) {
      throw this.createRegistryError(
        "PROVIDER_CONFLICT",
        `Provider type '${metadata.type}' is already registered`,
        {
          existingProvider: this.metadata.get(metadata.type),
          newProvider: metadata,
        }
      );
    }

    // Register lazy factory and metadata
    this.lazyFactories.set(metadata.type, { metadata, loader });
    this.metadata.set(metadata.type, metadata);

    console.debug(
      `[ProviderRegistry] Registered lazy provider: ${metadata.type} (${metadata.name})`
    );
  }

  /**
   * Get a provider factory by type.
   */
  getFactory(type: string): ProviderFactory | undefined {
    // Check if it's already loaded
    const factory = this.factoryRegistry.get(type);
    if (factory) {
      return factory;
    }

    // Check if it's a lazy factory that needs loading
    const lazyFactory = this.lazyFactories.get(type);
    if (lazyFactory?.loaded) {
      return lazyFactory.loaded;
    }

    return undefined;
  }

  /**
   * Create a provider instance with optional configuration.
   * Supports lazy loading and provider caching for performance.
   */
  async createProviderAsync(type: string, config?: unknown): Promise<Provider> {
    try {
      // Check cache first for performance
      const cacheKey = this.getCacheKey(type, config);
      const cachedProvider = this.providerCache.get(cacheKey);
      if (cachedProvider) {
        console.debug(`[ProviderRegistry] Using cached provider: ${type}`);
        return cachedProvider;
      }

      // Try to get existing factory
      let factory = this.factoryRegistry.get(type);

      // If not found, try lazy loading
      if (!factory) {
        const lazyFactory = this.lazyFactories.get(type);
        if (lazyFactory) {
          console.debug(`[ProviderRegistry] Lazy loading provider: ${type}`);

          if (!lazyFactory.loaded) {
            lazyFactory.loaded = await lazyFactory.loader();
            this.factoryRegistry.register(lazyFactory.loaded);
          }

          factory = lazyFactory.loaded;
        }
      }

      if (!factory) {
        throw this.createRegistryError(
          "PROVIDER_NOT_FOUND",
          `Provider type '${type}' is not registered`,
          {
            requestedType: type,
            availableTypes: this.getRegisteredProviders(),
          }
        );
      }

      // Create provider instance
      const provider = factory.create(config);

      // Cache the provider for reuse
      this.providerCache.set(cacheKey, provider);

      console.debug(`[ProviderRegistry] Created provider: ${type}`);
      return provider;
    } catch (error) {
      throw this.createRegistryError(
        "PROVIDER_CREATION_FAILED",
        `Failed to create provider '${type}'`,
        { type, config },
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Synchronous version of createProvider for backward compatibility.
   * Only works with already-loaded providers.
   */
  createProvider(type: string, config?: unknown): Provider {
    const cacheKey = this.getCacheKey(type, config);
    const cachedProvider = this.providerCache.get(cacheKey);
    if (cachedProvider) {
      return cachedProvider;
    }

    const factory = this.factoryRegistry.get(type);
    if (!factory) {
      // Check if it's a lazy factory that hasn't been loaded
      if (this.lazyFactories.has(type)) {
        throw this.createRegistryError(
          "LAZY_PROVIDER_NOT_LOADED",
          `Provider '${type}' is lazy-loaded and must be created with createProviderAsync()`,
          { type }
        );
      }

      throw this.createRegistryError(
        "PROVIDER_NOT_FOUND",
        `Provider type '${type}' is not registered`,
        {
          requestedType: type,
          availableTypes: this.getRegisteredProviders(),
        }
      );
    }

    try {
      const provider = factory.create(config);
      this.providerCache.set(cacheKey, provider);
      return provider;
    } catch (error) {
      throw this.createRegistryError(
        "PROVIDER_CREATION_FAILED",
        `Failed to create provider '${type}'`,
        { type, config },
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Get metadata for all available providers.
   */
  getAvailableProviders(): ProviderMetadata[] {
    return Array.from(this.metadata.values());
  }

  /**
   * Check if a provider type is available.
   */
  hasProvider(type: string): boolean {
    return this.factoryRegistry.has(type) || this.lazyFactories.has(type);
  }

  /**
   * Check if a provider is registered (alias for hasProvider for backward compatibility).
   */
  isRegistered(type: string): boolean {
    return this.hasProvider(type);
  }

  /**
   * Get list of registered provider names.
   */
  getRegisteredProviders(): string[] {
    const loadedTypes = this.factoryRegistry.getTypes();
    const lazyTypes = Array.from(this.lazyFactories.keys());
    return [...new Set([...loadedTypes, ...lazyTypes])];
  }

  /**
   * Discover and register providers automatically.
   * Scans for built-in providers and external provider packages.
   */
  async discoverProviders(): Promise<void> {
    if (this.discoveryComplete) {
      return;
    }

    try {
      // Discover built-in providers
      await this.discoverBuiltInProviders();

      // Discover external provider packages
      await this.discoverExternalProviders();

      this.discoveryComplete = true;

      console.debug(
        `[ProviderRegistry] Discovery complete. Found ${this.factoryRegistry.size()} providers.`
      );
    } catch (error) {
      throw this.createRegistryError(
        "DISCOVERY_FAILED",
        "Failed to discover providers",
        undefined,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Get provider metadata by type.
   */
  getProviderMetadata(type: string): ProviderMetadata | undefined {
    return this.metadata.get(type);
  }

  /**
   * Get providers that support specific features.
   */
  getProvidersByFeature(feature: string): ProviderMetadata[] {
    return Array.from(this.metadata.values()).filter((metadata) =>
      metadata.supportedFeatures.includes(feature)
    );
  }

  /**
   * Clear all registered providers (mainly for testing).
   */
  clear(): void {
    this.factoryRegistry.clear();
    this.metadata.clear();
    this.lazyFactories.clear();
    this.providerCache.clear();
    this.discoveryComplete = false;
  }

  /**
   * Clear provider cache to force recreation.
   */
  clearCache(): void {
    this.providerCache.clear();
    console.debug("[ProviderRegistry] Provider cache cleared");
  }

  /**
   * Preload a lazy provider to improve performance.
   */
  async preloadProvider(type: string): Promise<void> {
    const lazyFactory = this.lazyFactories.get(type);
    if (lazyFactory && !lazyFactory.loaded) {
      console.debug(`[ProviderRegistry] Preloading provider: ${type}`);
      lazyFactory.loaded = await lazyFactory.loader();
      this.factoryRegistry.register(lazyFactory.loaded);
    }
  }

  /**
   * Preload all lazy providers.
   */
  async preloadAllProviders(): Promise<void> {
    const preloadPromises = Array.from(this.lazyFactories.keys()).map((type) =>
      this.preloadProvider(type)
    );
    await Promise.all(preloadPromises);
    console.debug("[ProviderRegistry] All lazy providers preloaded");
  }

  /**
   * Register a provider for testing only.
   * This bypasses normal validation and conflict checking.
   */
  registerTestProvider(factory: ProviderFactory): void {
    const metadata = factory.getMetadata();

    // Skip validation for test providers
    this.factoryRegistry.register(factory);
    this.metadata.set(metadata.type, metadata);

    console.debug(
      `[ProviderRegistry] Registered test provider: ${metadata.type} (${metadata.name})`
    );
  }

  /**
   * Check if registry is in test mode (has test providers).
   */
  isTestMode(): boolean {
    return Array.from(this.metadata.values()).some(
      (metadata) =>
        metadata.name.includes("Mock") || metadata.name.includes("Test")
    );
  }

  /**
   * Get registry statistics.
   */
  getStats(): {
    totalProviders: number;
    loadedProviders: number;
    lazyProviders: number;
    cachedProviders: number;
    builtInProviders: number;
    externalProviders: number;
    providersByFeature: Record<string, number>;
  } {
    const providers = Array.from(this.metadata.values());
    const builtInProviders = providers.filter((p) => !p.packageName).length;
    const externalProviders = providers.filter((p) => p.packageName).length;

    // Count providers by feature
    const featureCounts: Record<string, number> = {};
    providers.forEach((provider) => {
      provider.supportedFeatures.forEach((feature) => {
        featureCounts[feature] = (featureCounts[feature] || 0) + 1;
      });
    });

    return {
      totalProviders: providers.length,
      loadedProviders: this.factoryRegistry.getTypes().length,
      lazyProviders: this.lazyFactories.size,
      cachedProviders: this.providerCache.size,
      builtInProviders,
      externalProviders,
      providersByFeature: featureCounts,
    };
  }

  // Private methods

  /**
   * Generate cache key for provider instances.
   */
  private getCacheKey(type: string, config?: unknown): string {
    if (!config) {
      return type;
    }

    // Create a stable hash of the config for caching
    const configHash = JSON.stringify(config, Object.keys(config).sort());
    return `${type}:${configHash}`;
  }

  /**
   * Discover built-in providers in the SDK.
   */
  private async discoverBuiltInProviders(): Promise<void> {
    console.debug("[ProviderRegistry] Scanning for built-in providers...");

    try {
      // Register Direct API Provider (built-in simple provider)
      const { DirectApiProviderFactory } = await import(
        "../providers/direct-api-factory"
      );
      const directApiFactory = new DirectApiProviderFactory();
      this.registerProvider(directApiFactory);
    } catch (error) {
      console.warn(
        "[ProviderRegistry] Failed to load DirectApiProvider:",
        error
      );
    }

    // Future built-in providers can be added here
  }

  /**
   * Discover external provider packages.
   */
  private async discoverExternalProviders(): Promise<void> {
    console.debug(
      "[ProviderRegistry] Scanning for external provider packages..."
    );

    // Register known external providers with lazy loading
    // Use dynamic imports with ts-ignore to avoid circular dependency issues
    const knownProviders: Array<{
      type: string;
      packageName: string;
      name: string;
      description: string;
      features: string[];
      loader: () => Promise<new () => ProviderFactory>;
    }> = [
      {
        type: "opencode",
        packageName: "@openfarm/provider-opencode",
        name: "OpenCode",
        description:
          "OpenCode AI coding assistant - supports both local CLI and cloud HTTP modes",
        features: [
          "code-generation",
          "code-editing",
          "debugging",
          "refactoring",
          "streaming",
          "local-execution",
          "cloud-execution",
        ],
        loader: async () => {
          try {
            
            const mod = await import("@openfarm/provider-opencode");
            return (mod as any).OpenCodeProviderFactory;
          } catch (e) {
            throw new Error(
              `@openfarm/provider-opencode not installed: ${e instanceof Error ? e.message : "Unknown error"}`
            );
          }
        },
      },
      {
        type: "aider",
        packageName: "@openfarm/provider-aider",
        name: "Aider",
        description:
          "Aider AI pair programming assistant - works directly with your codebase",
        features: [
          "code-generation",
          "code-editing",
          "refactoring",
          "debugging",
          "git-integration",
          "streaming",
        ],
        loader: async () => {
          try {
            
            const mod = await import("@openfarm/provider-aider");
            return (mod as any).AiderProviderFactory;
          } catch (e) {
            throw new Error(
              `@openfarm/provider-aider not installed: ${e instanceof Error ? e.message : "Unknown error"}`
            );
          }
        },
      },
      {
        type: "claude",
        packageName: "@openfarm/provider-claude",
        name: "Claude Code",
        description:
          "Claude Code AI assistant with advanced code understanding and editing capabilities",
        features: [
          "code-generation",
          "code-editing",
          "refactoring",
          "debugging",
          "code-analysis",
          "file-operations",
          "bash-execution",
          "web-search",
        ],
        loader: async () => {
          try {
            
            const mod = await import("@openfarm/provider-claude");
            return (mod as any).ClaudeProviderFactory;
          } catch (e) {
            throw new Error(
              `@openfarm/provider-claude not installed: ${e instanceof Error ? e.message : "Unknown error"}`
            );
          }
        },
      },
    ];

    for (const providerInfo of knownProviders) {
      try {
        // Create metadata for lazy registration
        const metadata: ProviderMetadata = {
          type: providerInfo.type,
          name: providerInfo.name,
          version: "1.0.0",
          description: providerInfo.description,
          packageName: providerInfo.packageName,
          supportedFeatures: providerInfo.features,
          requiresExternal: true,
        };

        // Register as lazy provider
        this.registerLazyProvider(metadata, async () => {
          const FactoryClass = await providerInfo.loader();
          return new FactoryClass();
        });

        console.debug(
          `[ProviderRegistry] Registered lazy external provider: ${providerInfo.type}`
        );
      } catch (error) {
        console.warn(
          `[ProviderRegistry] Failed to register lazy provider ${providerInfo.type}:`,
          error
        );
      }
    }

    // In a real implementation, this would also:
    // 1. Scan node_modules for @openfarm/provider-* packages
    // 2. Load their package.json to get provider metadata
    // 3. Dynamically register them with lazy loading
    // 4. Handle version compatibility and conflicts
  }

  /**
   * Validate provider metadata before registration.
   */
  private validateProviderMetadata(metadata: ProviderMetadata): void {
    if (!metadata.type || typeof metadata.type !== "string") {
      throw this.createRegistryError(
        "INVALID_METADATA",
        "Provider metadata must have a valid type string",
        { metadata }
      );
    }

    if (!metadata.name || typeof metadata.name !== "string") {
      throw this.createRegistryError(
        "INVALID_METADATA",
        "Provider metadata must have a valid name string",
        { metadata }
      );
    }

    if (!metadata.version || typeof metadata.version !== "string") {
      throw this.createRegistryError(
        "INVALID_METADATA",
        "Provider metadata must have a valid version string",
        { metadata }
      );
    }

    if (!Array.isArray(metadata.supportedFeatures)) {
      throw this.createRegistryError(
        "INVALID_METADATA",
        "Provider metadata must have supportedFeatures as an array",
        { metadata }
      );
    }

    // Validate type format (alphanumeric, hyphens, underscores only)
    if (!/^[a-zA-Z0-9_-]+$/.test(metadata.type)) {
      throw this.createRegistryError(
        "INVALID_METADATA",
        "Provider type must contain only alphanumeric characters, hyphens, and underscores",
        { metadata }
      );
    }
  }

  /**
   * Create a standardized registry error.
   */
  private createRegistryError(
    code: string,
    message: string,
    details?: Record<string, unknown>,
    cause?: Error
  ): ProviderError {
    const error = new Error(message) as ProviderError;
    error.type = "registry";
    error.code = code;
    error.details = details;
    error.cause = cause;
    return error;
  }
}

/**
 * Global provider registry instance.
 * This singleton ensures consistent provider management across the SDK.
 */
export const globalProviderRegistry = new ProviderRegistry();
