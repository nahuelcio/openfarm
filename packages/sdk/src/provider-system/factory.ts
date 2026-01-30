/**
 * Provider factory implementation for creating provider instances.
 *
 * Factories handle provider instantiation with dependency injection,
 * configuration validation, and proper error handling.
 */

import type {
  CommunicationStrategy,
  ConfigurationManager,
  ProviderFactory as IProviderFactory,
  Provider,
  ProviderError,
  ProviderMetadata,
  ResponseParser,
} from "./types";

/**
 * Abstract base factory that provider-specific factories should extend.
 * Provides common functionality for provider creation and validation.
 */
export abstract class BaseProviderFactory implements IProviderFactory {
  protected readonly metadata: ProviderMetadata;

  constructor(metadata: ProviderMetadata) {
    this.metadata = metadata;
  }

  /**
   * Create a provider instance with optional configuration.
   * Template method that handles common creation logic.
   */
  create(config?: unknown): Provider {
    try {
      // Validate configuration if provided
      if (config !== undefined) {
        this.validateConfig(config);
      }

      // Create dependencies
      const communicationStrategy = this.createCommunicationStrategy(config);
      const responseParser = this.createResponseParser(config);
      const configManager = this.createConfigurationManager(config);

      // Create the provider instance
      const provider = this.createProvider(
        communicationStrategy,
        responseParser,
        configManager,
        config
      );

      return provider;
    } catch (error) {
      throw this.createFactoryError(
        "PROVIDER_CREATION_FAILED",
        `Failed to create ${this.metadata.type} provider`,
        { config },
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Get provider metadata.
   */
  getMetadata(): ProviderMetadata {
    return { ...this.metadata }; // Return a copy to prevent mutation
  }

  /**
   * Check if this factory can create providers of the given type.
   */
  canCreate(type: string): boolean {
    return this.metadata.type === type;
  }

  // Abstract methods that subclasses must implement

  /**
   * Create the communication strategy for this provider.
   */
  protected abstract createCommunicationStrategy(
    config?: unknown
  ): CommunicationStrategy;

  /**
   * Create the response parser for this provider.
   */
  protected abstract createResponseParser(config?: unknown): ResponseParser;

  /**
   * Create the configuration manager for this provider.
   */
  protected abstract createConfigurationManager(
    config?: unknown
  ): ConfigurationManager;

  /**
   * Create the actual provider instance.
   */
  protected abstract createProvider(
    communicationStrategy: CommunicationStrategy,
    responseParser: ResponseParser,
    configManager: ConfigurationManager,
    config?: unknown
  ): Provider;

  // Protected utility methods for subclasses

  /**
   * Validate provider configuration.
   * Can be overridden by subclasses for custom validation.
   */
  protected validateConfig(config: unknown): void {
    if (config === null) {
      throw this.createFactoryError(
        "INVALID_CONFIG",
        "Configuration cannot be null"
      );
    }

    if (typeof config === "object" && config !== null) {
      const configObj = config as Record<string, unknown>;

      // Validate type if specified
      if ("type" in configObj && configObj.type !== this.metadata.type) {
        throw this.createFactoryError(
          "CONFIG_TYPE_MISMATCH",
          `Configuration type '${configObj.type}' does not match factory type '${this.metadata.type}'`,
          { expectedType: this.metadata.type, actualType: configObj.type }
        );
      }
    }
  }

  /**
   * Create a standardized factory error.
   */
  protected createFactoryError(
    code: string,
    message: string,
    details?: Record<string, unknown>,
    cause?: Error
  ): ProviderError {
    const error = new Error(message) as ProviderError;
    error.type = "provider";
    error.code = code;
    error.details = details;
    error.cause = cause;
    return error;
  }

  /**
   * Merge configuration with defaults.
   */
  protected mergeWithDefaults(
    config: unknown,
    defaults: Record<string, unknown>
  ): Record<string, unknown> {
    if (!config || typeof config !== "object") {
      return { ...defaults };
    }

    return {
      ...defaults,
      ...(config as Record<string, unknown>),
    };
  }

  /**
   * Extract typed configuration value.
   */
  protected getConfigValue<T>(
    config: unknown,
    key: string,
    defaultValue: T,
    validator?: (value: unknown) => value is T
  ): T {
    if (!config || typeof config !== "object") {
      return defaultValue;
    }

    const configObj = config as Record<string, unknown>;
    const value = configObj[key];

    if (value === undefined) {
      return defaultValue;
    }

    if (validator && !validator(value)) {
      throw this.createFactoryError(
        "INVALID_CONFIG_VALUE",
        `Invalid value for configuration key '${key}'`,
        { key, value, expectedType: typeof defaultValue }
      );
    }

    return value as T;
  }
}

/**
 * Simple factory implementation for providers that don't need complex setup.
 * Useful for built-in providers with standard dependencies.
 */
export class SimpleProviderFactory extends BaseProviderFactory {
  private readonly providerConstructor: new (
    communicationStrategy: CommunicationStrategy,
    responseParser: ResponseParser,
    configManager: ConfigurationManager
  ) => Provider;

  private readonly strategyFactory: (config?: unknown) => CommunicationStrategy;
  private readonly parserFactory: (config?: unknown) => ResponseParser;
  private readonly configManagerFactory: (
    config?: unknown
  ) => ConfigurationManager;

  constructor(
    metadata: ProviderMetadata,
    providerConstructor: new (
      communicationStrategy: CommunicationStrategy,
      responseParser: ResponseParser,
      configManager: ConfigurationManager
    ) => Provider,
    strategyFactory: (config?: unknown) => CommunicationStrategy,
    parserFactory: (config?: unknown) => ResponseParser,
    configManagerFactory: (config?: unknown) => ConfigurationManager
  ) {
    super(metadata);
    this.providerConstructor = providerConstructor;
    this.strategyFactory = strategyFactory;
    this.parserFactory = parserFactory;
    this.configManagerFactory = configManagerFactory;
  }

  protected createCommunicationStrategy(
    config?: unknown
  ): CommunicationStrategy {
    return this.strategyFactory(config);
  }

  protected createResponseParser(config?: unknown): ResponseParser {
    return this.parserFactory(config);
  }

  protected createConfigurationManager(config?: unknown): ConfigurationManager {
    return this.configManagerFactory(config);
  }

  protected createProvider(
    communicationStrategy: CommunicationStrategy,
    responseParser: ResponseParser,
    configManager: ConfigurationManager
  ): Provider {
    return new this.providerConstructor(
      communicationStrategy,
      responseParser,
      configManager
    );
  }
}

/**
 * Factory registry for managing multiple factory types.
 * Useful for complex providers that might have multiple variants.
 */
export class FactoryRegistry {
  private readonly factories = new Map<string, IProviderFactory>();

  /**
   * Register a factory for a specific provider type.
   */
  register(factory: IProviderFactory): void {
    const metadata = factory.getMetadata();
    this.factories.set(metadata.type, factory);
  }

  /**
   * Get a factory by provider type.
   */
  get(type: string): IProviderFactory | undefined {
    return this.factories.get(type);
  }

  /**
   * Create a provider using the appropriate factory.
   */
  create(type: string, config?: unknown): Provider {
    const factory = this.factories.get(type);

    if (!factory) {
      throw new Error(`No factory registered for provider type: ${type}`);
    }

    return factory.create(config);
  }

  /**
   * Get all registered factory types.
   */
  getTypes(): string[] {
    return Array.from(this.factories.keys());
  }

  /**
   * Check if a factory is registered for the given type.
   */
  has(type: string): boolean {
    return this.factories.has(type);
  }

  /**
   * Get the number of registered factories.
   */
  size(): number {
    return this.factories.size;
  }

  /**
   * Clear all registered factories.
   */
  clear(): void {
    this.factories.clear();
  }
}

/**
 * Concrete provider factory implementation that works with the registry.
 * This is the main factory class used by the provider system.
 */
export class ProviderFactory {
  private readonly registry: FactoryRegistry;

  constructor(registry: FactoryRegistry) {
    this.registry = registry;
  }

  /**
   * Create a provider instance by type.
   */
  createProvider(type: string, config?: unknown): Provider {
    return this.registry.create(type, config);
  }

  /**
   * Check if a provider type is available.
   */
  canCreate(type: string): boolean {
    return this.registry.has(type);
  }

  /**
   * Get all available provider types.
   */
  getAvailableTypes(): string[] {
    return this.registry.getTypes();
  }
}
