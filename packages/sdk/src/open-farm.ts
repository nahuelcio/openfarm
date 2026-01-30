import { 
  ProviderRegistry, 
  type Provider
} from "./provider-system/index.js";
import type {
  ExecutionOptions,
  ExecutionResult,
  OpenFarmConfig,
} from "./types";

const DEFAULT_MAX_TOKENS = 30000;

export class OpenFarm {
  private readonly config: OpenFarmConfig;
  private readonly providerRegistry: ProviderRegistry;
  private currentProvider?: Provider;
  private initializationPromise: Promise<void>;

  constructor(config: OpenFarmConfig = {}) {
    this.config = config;

    // Initialize new provider system
    this.providerRegistry = new ProviderRegistry();
    
    // Auto-discover and register providers
    this.initializationPromise = this.initializeProviders();
  }

  async execute(options: ExecutionOptions): Promise<ExecutionResult> {
    // Ensure providers are initialized
    await this.initializationPromise;

    // Use explicitly provided provider, or current provider if set, or default, or direct-api
    const provider = options.provider || this.currentProvider?.type || this.config.defaultProvider || "direct-api";

    // Use new provider system
    if (this.providerRegistry.isRegistered(provider)) {
      return this.executeWithNewProvider(provider, options);
    }

    // Provider not found
    const availableProviders = await this.getAvailableProviders();
    throw new Error(
      `Provider '${provider}' is not available. Available providers: ${availableProviders.join(', ')}`
    );
  }

  async testConnection(): Promise<boolean> {
    // Ensure providers are initialized
    await this.initializationPromise;

    // Test current provider if set
    if (this.currentProvider) {
      return this.currentProvider.testConnection();
    }

    // Test default provider
    const defaultProvider = this.config.defaultProvider || "direct-api";
    if (this.providerRegistry.isRegistered(defaultProvider)) {
      const provider = await this.providerRegistry.createProviderAsync(defaultProvider);
      return provider.testConnection();
    }

    return false;
  }

  async setProvider(provider: string): Promise<void> {
    // Ensure providers are initialized
    await this.initializationPromise;

    // Use new provider system
    if (this.providerRegistry.isRegistered(provider)) {
      try {
        this.currentProvider = await this.providerRegistry.createProviderAsync(provider);
        return;
      } catch (error) {
        throw new Error(`Failed to create provider ${provider}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    const availableProviders = await this.getAvailableProviders();
    throw new Error(
      `Provider '${provider}' is not available. Available providers: ${availableProviders.join(', ')}`
    );
  }

  /**
   * Get list of available providers
   */
  async getAvailableProviders(): Promise<string[]> {
    // Ensure providers are initialized
    await this.initializationPromise;
    return this.providerRegistry.getRegisteredProviders();
  }

  /**
   * Get provider metadata
   */
  async getProviderMetadata(providerName: string) {
    // Ensure providers are initialized
    await this.initializationPromise;
    return this.providerRegistry.getProviderMetadata(providerName);
  }

  /**
   * Get registry statistics
   */
  async getRegistryStats() {
    // Ensure providers are initialized
    await this.initializationPromise;
    return this.providerRegistry.getStats();
  }

  /**
   * Preload a specific provider for better performance
   */
  async preloadProvider(providerName: string): Promise<void> {
    await this.providerRegistry.preloadProvider(providerName);
  }

  /**
   * Preload all providers for better performance
   */
  async preloadAllProviders(): Promise<void> {
    await this.providerRegistry.preloadAllProviders();
  }

  private async executeWithNewProvider(
    providerName: string, 
    options: ExecutionOptions
  ): Promise<ExecutionResult> {
    const startTime = Date.now();

    try {
      // Create or reuse provider instance (use async for lazy loading)
      if (!this.currentProvider || this.currentProvider.type !== providerName) {
        this.currentProvider = await this.providerRegistry.createProviderAsync(providerName);
      }

      // Execute with new provider using ExecutionOptions directly
      const result = await this.currentProvider.execute({
        ...options,
        model: options.model || this.config.defaultModel,
        temperature: options.temperature ?? 0.7,
        maxTokens: options.maxTokens ?? DEFAULT_MAX_TOKENS,
      });

      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        output: `Provider execution failed: ${message}`,
        duration: Date.now() - startTime,
        error: message,
      };
    }
  }

  private async initializeProviders(): Promise<void> {
    try {
      // Auto-discover providers from known packages
      await this.providerRegistry.discoverProviders();
    } catch (error) {
      console.warn('Failed to auto-discover providers:', error);
    }
  }
}
