import type { Provider, ProviderFactory, ProviderMetadata } from "../types.js";
import { MockProvider, type MockProviderOptions } from "./mock-provider.js";

export interface MockProviderFactoryOptions {
  /** Provider metadata */
  metadata?: ProviderMetadata;
  /** Options to pass to created providers */
  providerOptions?: MockProviderOptions;
  /** Whether creation should fail */
  shouldFailCreation?: boolean;
  /** Error message to throw if shouldFailCreation is true */
  creationErrorMessage?: string;
}

export class MockProviderFactory implements ProviderFactory {
  private readonly options: MockProviderFactoryOptions;
  private readonly creationHistory: unknown[] = [];
  private readonly createdProviders: MockProvider[] = [];

  constructor(options: MockProviderFactoryOptions = {}) {
    this.options = {
      metadata: {
        type: "mock",
        name: "Mock Provider",
        version: "1.0.0",
        description: "Mock provider factory for testing",
        supportedFeatures: ["testing", "mocking"],
      },
      providerOptions: {},
      shouldFailCreation: false,
      creationErrorMessage: "Mock factory creation failure",
      ...options,
    };
  }

  create(config?: unknown): Provider {
    // Record the config for testing
    this.creationHistory.push(config);

    // Simulate failure if specified
    if (this.options.shouldFailCreation) {
      throw new Error(this.options.creationErrorMessage);
    }

    // Create mock provider
    const provider = new MockProvider({
      type: this.options.metadata!.type,
      name: this.options.metadata!.name,
      ...this.options.providerOptions,
    });

    this.createdProviders.push(provider);
    return provider;
  }

  getMetadata(): ProviderMetadata {
    return { ...this.options.metadata! };
  }

  canCreate(type: string): boolean {
    return type === this.options.metadata!.type;
  }

  /**
   * Get history of all create calls for testing assertions
   */
  getCreationHistory(): unknown[] {
    return [...this.creationHistory];
  }

  /**
   * Get all providers created by this factory
   */
  getCreatedProviders(): MockProvider[] {
    return [...this.createdProviders];
  }

  /**
   * Get the last provider created
   */
  getLastCreatedProvider(): MockProvider | undefined {
    return this.createdProviders.at(-1);
  }

  /**
   * Clear all history
   */
  clearHistory(): void {
    this.creationHistory.length = 0;
    this.createdProviders.length = 0;
  }

  /**
   * Update mock options for subsequent calls
   */
  updateOptions(options: Partial<MockProviderFactoryOptions>): void {
    Object.assign(this.options, options);
  }
}
