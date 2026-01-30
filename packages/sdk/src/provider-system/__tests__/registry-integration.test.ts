/**
 * Integration tests for ProviderRegistry with ProviderFactory
 *
 * Tests the integration between registry and factory systems.
 */

import { beforeEach, describe, expect, it } from "vitest";
import { BaseProvider } from "../base-provider";
import { BaseProviderFactory } from "../factory";
import { ProviderRegistry } from "../registry";
import type {
  CommunicationRequest,
  CommunicationResponse,
  CommunicationStrategy,
  ConfigurationManager,
  ExecutionOptions,
  ExecutionResult,
  ProviderCapabilities,
  ProviderMetadata,
  ResponseParser,
} from "../types";

// Simple test provider implementation
class TestProvider extends BaseProvider {
  readonly type: string;
  readonly name: string;

  constructor(
    communicationStrategy: CommunicationStrategy,
    responseParser: ResponseParser,
    configManager: ConfigurationManager,
    metadata?: ProviderMetadata
  ) {
    super(communicationStrategy, responseParser, configManager);
    this.type = metadata?.type || "test-integration";
    this.name = metadata?.name || "Test Integration Provider";
  }

  protected async prepareRequest(
    options: ExecutionOptions
  ): Promise<CommunicationRequest> {
    return {
      endpoint: "/test",
      body: { task: options.task },
    };
  }

  protected async formatResult(
    parsedResult: unknown,
    _response: any,
    duration: number
  ): Promise<ExecutionResult> {
    return {
      success: true,
      output: `Formatted: ${parsedResult}`,
      duration,
    };
  }

  getCapabilities(): ProviderCapabilities {
    return {
      executionModes: ["standard"],
      fileTypes: ["*"],
      supportsStreaming: false,
      supportsLocal: true,
      requiresInternet: false,
      features: ["basic"],
    };
  }
}

// Mock strategy and parser
class MockStrategy implements CommunicationStrategy {
  readonly type = "mock";

  async execute(
    _request: CommunicationRequest
  ): Promise<CommunicationResponse> {
    return {
      status: 200,
      body: "mock response",
      success: true,
      duration: 50,
    };
  }

  async testConnection(): Promise<boolean> {
    return true;
  }
}

class MockParser implements ResponseParser {
  readonly type = "mock";

  async parse(response: CommunicationResponse): Promise<string> {
    return `parsed: ${response.body}`;
  }

  canHandle(_response: CommunicationResponse): boolean {
    return true;
  }
}

class MockConfigManager implements ConfigurationManager {
  validate(_config: unknown): boolean {
    return true;
  }

  getValidationErrors(_config: unknown): string[] {
    return [];
  }

  getDefaults(): Record<string, unknown> {
    return { timeout: 30_000 };
  }

  mergeWithDefaults(config: unknown): Record<string, unknown> {
    return {
      ...this.getDefaults(),
      ...((config as Record<string, unknown>) || {}),
    };
  }

  getSchema(): Record<string, unknown> {
    return { type: "object" };
  }
}

// Custom factory that passes metadata to provider
class TestProviderFactory extends BaseProviderFactory {
  constructor(metadata: ProviderMetadata) {
    super(metadata);
  }

  protected createCommunicationStrategy(
    _config?: unknown
  ): CommunicationStrategy {
    return new MockStrategy();
  }

  protected createResponseParser(_config?: unknown): ResponseParser {
    return new MockParser();
  }

  protected createConfigurationManager(config?: unknown): ConfigurationManager {
    const manager = new MockConfigManager();
    // Capture the config for testing
    if (config && typeof config === "object") {
      (manager as any).receivedConfig = config;
    }
    return manager;
  }

  protected createProvider(
    communicationStrategy: CommunicationStrategy,
    responseParser: ResponseParser,
    configManager: ConfigurationManager,
    _config?: unknown
  ): Provider {
    return new TestProvider(
      communicationStrategy,
      responseParser,
      configManager,
      this.metadata
    );
  }
}

describe("ProviderRegistry Integration", () => {
  let registry: ProviderRegistry;

  beforeEach(() => {
    registry = new ProviderRegistry();
  });

  it("should work with SimpleProviderFactory", () => {
    // Arrange
    const metadata: ProviderMetadata = {
      type: "test-integration",
      name: "Test Integration Provider",
      description: "Integration test provider",
      version: "1.0.0",
      supportedFeatures: ["basic", "integration"],
    };

    const factory = new TestProviderFactory(metadata);

    // Act
    registry.registerProvider(factory);
    const provider = registry.createProvider("test-integration");

    // Assert
    expect(provider).toBeInstanceOf(TestProvider);
    expect(provider.type).toBe("test-integration");
    expect(provider.name).toBe("Test Integration Provider");
  });

  it("should execute provider created through registry", async () => {
    // Arrange
    const metadata: ProviderMetadata = {
      type: "test-execution",
      name: "Test Execution Provider",
      description: "Provider for execution testing",
      version: "1.0.0",
      supportedFeatures: ["execution"],
    };

    const factory = new TestProviderFactory(metadata);

    registry.registerProvider(factory);
    const provider = registry.createProvider("test-execution");

    // Act
    const result = await provider.execute({ task: "test task" });

    // Assert
    expect(result.success).toBe(true);
    expect(result.output).toContain("Formatted: parsed: mock response");
    expect(typeof result.duration).toBe("number");
  });

  it("should handle provider configuration through registry", () => {
    // Arrange
    const metadata: ProviderMetadata = {
      type: "test-config",
      name: "Test Config Provider",
      description: "Provider for config testing",
      version: "1.0.0",
      supportedFeatures: ["config"],
    };

    const factory = new TestProviderFactory(metadata);
    registry.registerProvider(factory);
    const config = { customOption: "test-value" };

    // Act
    const provider = registry.createProvider("test-config", config);

    // Assert - Check that the provider was created successfully
    expect(provider).toBeInstanceOf(TestProvider);
    expect(provider.type).toBe("test-config");
  });

  it("should support provider discovery workflow", async () => {
    // Arrange
    const metadata: ProviderMetadata = {
      type: "discoverable-provider",
      name: "Discoverable Provider",
      description: "A provider that can be discovered",
      version: "1.0.0",
      supportedFeatures: ["discovery", "basic"],
    };

    const factory = new TestProviderFactory(metadata);

    // Act
    registry.registerProvider(factory);
    await registry.discoverProviders();

    // Assert
    const availableProviders = registry.getAvailableProviders();
    expect(availableProviders).toHaveLength(1);
    expect(availableProviders[0].type).toBe("discoverable-provider");

    const discoveryProviders = registry.getProvidersByFeature("discovery");
    expect(discoveryProviders).toHaveLength(1);
    expect(discoveryProviders[0].type).toBe("discoverable-provider");
  });

  it("should maintain provider isolation", () => {
    // Arrange
    const metadata1: ProviderMetadata = {
      type: "isolated-1",
      name: "Isolated Provider 1",
      description: "First isolated provider",
      version: "1.0.0",
      supportedFeatures: ["isolation"],
    };

    const metadata2: ProviderMetadata = {
      type: "isolated-2",
      name: "Isolated Provider 2",
      description: "Second isolated provider",
      version: "1.0.0",
      supportedFeatures: ["isolation"],
    };

    const factory1 = new TestProviderFactory(metadata1);
    const factory2 = new TestProviderFactory(metadata2);

    // Act
    registry.registerProvider(factory1);
    registry.registerProvider(factory2);

    const provider1 = registry.createProvider("isolated-1");
    const provider2 = registry.createProvider("isolated-2");

    // Assert
    expect(provider1).not.toBe(provider2);
    expect(provider1.type).toBe("isolated-1");
    expect(provider2.type).toBe("isolated-2");
    expect(registry.getAvailableProviders()).toHaveLength(2);
  });
});
