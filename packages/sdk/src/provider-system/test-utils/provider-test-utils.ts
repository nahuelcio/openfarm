import {
  type MockCommunicationOptions,
  MockCommunicationStrategy,
} from "../mocks/mock-communication-strategy.js";
import {
  MockConfigurationManager,
  type MockConfigurationManagerOptions,
} from "../mocks/mock-configuration-manager.js";
import {
  MockProvider,
  type MockProviderOptions,
} from "../mocks/mock-provider.js";
import {
  MockProviderFactory,
  type MockProviderFactoryOptions,
} from "../mocks/mock-provider-factory.js";
import {
  MockResponseParser,
  type MockResponseParserOptions,
} from "../mocks/mock-response-parser.js";
import { ProviderRegistry } from "../registry.js";
import type { ProviderMetadata } from "../types.js";

/**
 * Test utilities for provider isolation and testing
 */
export class ProviderTestUtils {
  /**
   * Create an isolated provider registry for testing
   */
  static createIsolatedRegistry(): ProviderRegistry {
    return new ProviderRegistry();
  }

  /**
   * Create a mock provider with specified options
   */
  static createMockProvider(options: MockProviderOptions = {}): MockProvider {
    return new MockProvider(options);
  }

  /**
   * Create a mock provider factory with specified options
   */
  static createMockProviderFactory(
    options: MockProviderFactoryOptions = {}
  ): MockProviderFactory {
    return new MockProviderFactory(options);
  }

  /**
   * Create a mock communication strategy with specified options
   */
  static createMockCommunicationStrategy(
    options: MockCommunicationOptions = {}
  ): MockCommunicationStrategy {
    return new MockCommunicationStrategy(options);
  }

  /**
   * Create a mock response parser with specified options
   */
  static createMockResponseParser<T = unknown>(
    options: MockResponseParserOptions<T> = {}
  ): MockResponseParser<T> {
    return new MockResponseParser<T>(options);
  }

  /**
   * Create a mock configuration manager with specified options
   */
  static createMockConfigurationManager(
    options: MockConfigurationManagerOptions = {}
  ): MockConfigurationManager {
    return new MockConfigurationManager(options);
  }

  /**
   * Register a mock provider in a registry for testing
   */
  static registerMockProvider(
    registry: ProviderRegistry,
    providerType: string,
    options: {
      providerOptions?: MockProviderOptions;
      factoryOptions?: MockProviderFactoryOptions;
    } = {}
  ): MockProviderFactory {
    const metadata: ProviderMetadata = {
      type: providerType,
      name: `Mock ${providerType} Provider`,
      version: "1.0.0",
      description: `Mock ${providerType} provider for testing`,
      supportedFeatures: ["testing", "mocking"],
    };

    const factory = new MockProviderFactory({
      metadata,
      providerOptions: {
        type: providerType,
        name: metadata.name,
        ...options.providerOptions,
      },
      ...options.factoryOptions,
    });

    registry.registerProvider(factory);
    return factory;
  }

  /**
   * Create a test scenario with multiple mock providers
   */
  static createTestScenario(
    providers: Array<{
      type: string;
      name?: string;
      providerOptions?: MockProviderOptions;
      factoryOptions?: MockProviderFactoryOptions;
    }>
  ): {
    registry: ProviderRegistry;
    factories: Record<string, MockProviderFactory>;
  } {
    const registry = ProviderTestUtils.createIsolatedRegistry();
    const factories: Record<string, MockProviderFactory> = {};

    for (const providerConfig of providers) {
      const factory = ProviderTestUtils.registerMockProvider(
        registry,
        providerConfig.type,
        {
          providerOptions: {
            name: providerConfig.name,
            ...providerConfig.providerOptions,
          },
          factoryOptions: providerConfig.factoryOptions,
        }
      );
      factories[providerConfig.type] = factory;
    }

    return { registry, factories };
  }

  /**
   * Assert that a provider was executed with specific options
   */
  static assertProviderExecuted(
    provider: MockProvider,
    expectedOptions?: Partial<import("../../types.js").ExecutionOptions>
  ): void {
    const history = provider.getExecutionHistory();

    if (history.length === 0) {
      throw new Error("Expected provider to be executed, but it was not");
    }

    if (expectedOptions) {
      const lastExecution = provider.getLastExecution()!;

      for (const [key, expectedValue] of Object.entries(expectedOptions)) {
        const actualValue = (lastExecution as any)[key];
        if (actualValue !== expectedValue) {
          throw new Error(
            `Expected ${key} to be ${JSON.stringify(expectedValue)}, but got ${JSON.stringify(actualValue)}`
          );
        }
      }
    }
  }

  /**
   * Assert that a provider factory was used to create providers
   */
  static assertFactoryUsed(
    factory: MockProviderFactory,
    expectedCreations = 1
  ): void {
    const createdProviders = factory.getCreatedProviders();

    if (createdProviders.length !== expectedCreations) {
      throw new Error(
        `Expected factory to create ${expectedCreations} providers, but created ${createdProviders.length}`
      );
    }
  }

  /**
   * Reset all mock histories for clean test state
   */
  static resetMocks(
    ...mocks: Array<
      | MockProvider
      | MockProviderFactory
      | MockCommunicationStrategy
      | MockResponseParser
      | MockConfigurationManager
    >
  ): void {
    for (const mock of mocks) {
      if ("clearHistory" in mock) {
        mock.clearHistory();
      }
    }
  }
}
