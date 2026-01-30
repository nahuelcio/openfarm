/**
 * Unit tests for ProviderFactory implementations.
 *
 * Tests the factory pattern implementation including BaseProviderFactory,
 * SimpleProviderFactory, and FactoryRegistry.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { BaseProvider } from "../base-provider";
import {
  BaseProviderFactory,
  FactoryRegistry,
  SimpleProviderFactory,
} from "../factory";
import type {
  CommunicationRequest,
  CommunicationStrategy,
  ConfigurationManager,
  ExecutionOptions,
  ExecutionResult,
  Provider,
  ProviderCapabilities,
  ProviderMetadata,
  ResponseParser,
} from "../types";

// Mock implementations for testing
class MockCommunicationStrategy implements CommunicationStrategy {
  readonly type = "mock";

  async execute(): Promise<any> {
    return {
      status: 200,
      body: "mock response",
      success: true,
    };
  }

  async testConnection(): Promise<boolean> {
    return true;
  }
}

class MockResponseParser implements ResponseParser {
  readonly type = "mock";

  async parse(response: any): Promise<any> {
    return { parsed: response.body };
  }

  canHandle(): boolean {
    return true;
  }
}

class MockConfigurationManager implements ConfigurationManager {
  validate(): boolean {
    return true;
  }

  getValidationErrors(): string[] {
    return [];
  }

  getDefaults(): Record<string, unknown> {
    return { timeout: 30_000 };
  }

  mergeWithDefaults(config: unknown): Record<string, unknown> {
    return { ...this.getDefaults(), ...(config as Record<string, unknown>) };
  }

  getSchema(): Record<string, unknown> {
    return {};
  }
}

class TestProvider extends BaseProvider {
  readonly type = "test";
  readonly name = "Test Provider";

  protected async prepareRequest(
    options: ExecutionOptions
  ): Promise<CommunicationRequest> {
    return {
      body: { task: options.task },
    };
  }

  protected async formatResult(
    parsedResult: any,
    response: any,
    duration: number
  ): Promise<ExecutionResult> {
    return {
      success: true,
      output: parsedResult.parsed,
      duration,
    };
  }

  getCapabilities(): ProviderCapabilities {
    return {
      executionModes: ["test"],
      fileTypes: ["*"],
      supportsStreaming: false,
      supportsLocal: true,
      requiresInternet: false,
      features: ["test"],
    };
  }
}

class TestProviderFactory extends BaseProviderFactory {
  protected createCommunicationStrategy(): CommunicationStrategy {
    return new MockCommunicationStrategy();
  }

  protected createResponseParser(): ResponseParser {
    return new MockResponseParser();
  }

  protected createConfigurationManager(): ConfigurationManager {
    return new MockConfigurationManager();
  }

  protected createProvider(
    communicationStrategy: CommunicationStrategy,
    responseParser: ResponseParser,
    configManager: ConfigurationManager
  ): Provider {
    return new TestProvider(
      communicationStrategy,
      responseParser,
      configManager
    );
  }
}

describe("BaseProviderFactory", () => {
  let metadata: ProviderMetadata;
  let factory: TestProviderFactory;

  beforeEach(() => {
    metadata = {
      type: "test",
      name: "Test Provider",
      description: "A test provider",
      version: "1.0.0",
      supportedFeatures: ["test"],
    };
    factory = new TestProviderFactory(metadata);
  });

  describe("Provider Creation", () => {
    it("should create provider instance successfully", () => {
      const provider = factory.create();

      expect(provider).toBeInstanceOf(TestProvider);
      expect(provider.type).toBe("test");
      expect(provider.name).toBe("Test Provider");
    });

    it("should create provider with configuration", () => {
      const config = { timeout: 60_000, customOption: "value" };
      const provider = factory.create(config);

      expect(provider).toBeInstanceOf(TestProvider);
    });

    it("should validate configuration before creation", () => {
      const invalidConfig = null;

      expect(() => factory.create(invalidConfig)).toThrow(
        "Failed to create test provider"
      );
    });

    it("should validate configuration type mismatch", () => {
      const config = { type: "wrong-type" };

      expect(() => factory.create(config)).toThrow(
        "Failed to create test provider"
      );
    });

    it("should provide specific validation error details", () => {
      const invalidConfig = null;

      try {
        factory.create(invalidConfig);
      } catch (error: any) {
        expect(error.type).toBe("provider");
        expect(error.code).toBe("PROVIDER_CREATION_FAILED");
        expect(error.cause?.message).toBe("Configuration cannot be null");
      }
    });

    it("should provide type mismatch error details", () => {
      const config = { type: "wrong-type" };

      try {
        factory.create(config);
      } catch (error: any) {
        expect(error.type).toBe("provider");
        expect(error.code).toBe("PROVIDER_CREATION_FAILED");
        expect(error.cause?.message).toContain(
          "Configuration type 'wrong-type' does not match factory type 'test'"
        );
      }
    });
  });

  describe("Metadata Management", () => {
    it("should return provider metadata", () => {
      const result = factory.getMetadata();

      expect(result).toEqual(metadata);
      expect(result).not.toBe(metadata); // Should be a copy
    });

    it("should check if factory can create provider type", () => {
      expect(factory.canCreate("test")).toBe(true);
      expect(factory.canCreate("other")).toBe(false);
    });
  });

  describe("Error Handling", () => {
    it("should handle factory creation errors", () => {
      class FailingFactory extends BaseProviderFactory {
        protected createCommunicationStrategy(): CommunicationStrategy {
          throw new Error("Strategy creation failed");
        }

        protected createResponseParser(): ResponseParser {
          return new MockResponseParser();
        }

        protected createConfigurationManager(): ConfigurationManager {
          return new MockConfigurationManager();
        }

        protected createProvider(): Provider {
          throw new Error("Should not reach here");
        }
      }

      const failingFactory = new FailingFactory(metadata);

      expect(() => failingFactory.create()).toThrow(
        "Failed to create test provider"
      );
    });

    it("should provide detailed error information", () => {
      class FailingFactory extends BaseProviderFactory {
        protected createCommunicationStrategy(): CommunicationStrategy {
          throw new Error("Custom error");
        }

        protected createResponseParser(): ResponseParser {
          return new MockResponseParser();
        }

        protected createConfigurationManager(): ConfigurationManager {
          return new MockConfigurationManager();
        }

        protected createProvider(): Provider {
          throw new Error("Should not reach here");
        }
      }

      const failingFactory = new FailingFactory(metadata);

      try {
        failingFactory.create();
      } catch (error: any) {
        expect(error.type).toBe("provider");
        expect(error.code).toBe("PROVIDER_CREATION_FAILED");
        expect(error.cause?.message).toBe("Custom error");
      }
    });
  });

  describe("Configuration Utilities", () => {
    it("should merge configuration with defaults", () => {
      const config = { customOption: "value" };
      const defaults = { timeout: 30_000, retries: 3 };

      const result = (factory as any).mergeWithDefaults(config, defaults);

      expect(result).toEqual({
        timeout: 30_000,
        retries: 3,
        customOption: "value",
      });
    });

    it("should extract typed configuration values", () => {
      const config = { timeout: 60_000, verbose: true };

      const timeout = (factory as any).getConfigValue(
        config,
        "timeout",
        30_000
      );
      const verbose = (factory as any).getConfigValue(config, "verbose", false);
      const missing = (factory as any).getConfigValue(
        config,
        "missing",
        "default"
      );

      expect(timeout).toBe(60_000);
      expect(verbose).toBe(true);
      expect(missing).toBe("default");
    });

    it("should validate configuration values with validator", () => {
      const config = { timeout: "invalid" };
      const validator = (value: unknown): value is number =>
        typeof value === "number";

      expect(() =>
        (factory as any).getConfigValue(config, "timeout", 30_000, validator)
      ).toThrow("Invalid value for configuration key 'timeout'");
    });
  });
});

describe("SimpleProviderFactory", () => {
  let metadata: ProviderMetadata;
  let factory: SimpleProviderFactory;

  beforeEach(() => {
    metadata = {
      type: "simple",
      name: "Simple Provider",
      description: "A simple test provider",
      version: "1.0.0",
      supportedFeatures: ["simple"],
    };

    factory = new SimpleProviderFactory(
      metadata,
      TestProvider,
      () => new MockCommunicationStrategy(),
      () => new MockResponseParser(),
      () => new MockConfigurationManager()
    );
  });

  describe("Provider Creation", () => {
    it("should create provider using constructor injection", () => {
      const provider = factory.create();

      expect(provider).toBeInstanceOf(TestProvider);
      expect(provider.type).toBe("test");
    });

    it("should pass configuration to factory functions", () => {
      const strategyFactory = vi.fn(() => new MockCommunicationStrategy());
      const parserFactory = vi.fn(() => new MockResponseParser());
      const configFactory = vi.fn(() => new MockConfigurationManager());

      const testFactory = new SimpleProviderFactory(
        metadata,
        TestProvider,
        strategyFactory,
        parserFactory,
        configFactory
      );

      const config = { timeout: 60_000 };
      testFactory.create(config);

      expect(strategyFactory).toHaveBeenCalledWith(config);
      expect(parserFactory).toHaveBeenCalledWith(config);
      expect(configFactory).toHaveBeenCalledWith(config);
    });
  });

  describe("Dependency Injection", () => {
    it("should inject dependencies into provider constructor", () => {
      const provider = factory.create();

      // Verify dependencies are properly injected
      expect((provider as any).communicationStrategy).toBeInstanceOf(
        MockCommunicationStrategy
      );
      expect((provider as any).responseParser).toBeInstanceOf(
        MockResponseParser
      );
      expect((provider as any).configManager).toBeInstanceOf(
        MockConfigurationManager
      );
    });
  });
});

describe("FactoryRegistry", () => {
  let registry: FactoryRegistry;
  let factory1: TestProviderFactory;
  let factory2: TestProviderFactory;

  beforeEach(() => {
    registry = new FactoryRegistry();

    factory1 = new TestProviderFactory({
      type: "provider1",
      name: "Provider 1",
      description: "First provider",
      version: "1.0.0",
      supportedFeatures: ["feature1"],
    });

    factory2 = new TestProviderFactory({
      type: "provider2",
      name: "Provider 2",
      description: "Second provider",
      version: "1.0.0",
      supportedFeatures: ["feature2"],
    });
  });

  describe("Factory Registration", () => {
    it("should register factories successfully", () => {
      registry.register(factory1);
      registry.register(factory2);

      expect(registry.has("provider1")).toBe(true);
      expect(registry.has("provider2")).toBe(true);
      expect(registry.getTypes()).toEqual(["provider1", "provider2"]);
    });

    it("should retrieve registered factories", () => {
      registry.register(factory1);

      const retrieved = registry.get("provider1");
      expect(retrieved).toBe(factory1);
    });

    it("should return undefined for non-existent factories", () => {
      const retrieved = registry.get("non-existent");
      expect(retrieved).toBeUndefined();
    });
  });

  describe("Provider Creation", () => {
    it("should create providers using registered factories", () => {
      registry.register(factory1);

      const provider = registry.create("provider1");
      expect(provider.type).toBe("test"); // TestProvider always returns "test"
    });

    it("should pass configuration to factory during creation", () => {
      const createSpy = vi.spyOn(factory1, "create");
      registry.register(factory1);

      const config = { timeout: 60_000 };
      registry.create("provider1", config);

      expect(createSpy).toHaveBeenCalledWith(config);
    });

    it("should throw error for non-existent provider type", () => {
      expect(() => registry.create("non-existent")).toThrow(
        "No factory registered for provider type: non-existent"
      );
    });
  });

  describe("Registry Management", () => {
    it("should clear all registered factories", () => {
      registry.register(factory1);
      registry.register(factory2);

      expect(registry.getTypes()).toHaveLength(2);

      registry.clear();

      expect(registry.getTypes()).toHaveLength(0);
      expect(registry.has("provider1")).toBe(false);
      expect(registry.has("provider2")).toBe(false);
    });

    it("should check factory existence", () => {
      registry.register(factory1);

      expect(registry.has("provider1")).toBe(true);
      expect(registry.has("provider2")).toBe(false);
    });

    it("should return all registered types", () => {
      registry.register(factory1);
      registry.register(factory2);

      const types = registry.getTypes();
      expect(types).toContain("provider1");
      expect(types).toContain("provider2");
      expect(types).toHaveLength(2);
    });
  });

  describe("Factory Replacement", () => {
    it("should allow replacing existing factories", () => {
      registry.register(factory1);

      const newFactory = new TestProviderFactory({
        type: "provider1",
        name: "Updated Provider 1",
        description: "Updated first provider",
        version: "2.0.0",
        supportedFeatures: ["updated-feature"],
      });

      registry.register(newFactory);

      const retrieved = registry.get("provider1");
      expect(retrieved).toBe(newFactory);
      expect(retrieved?.getMetadata().version).toBe("2.0.0");
    });
  });
});
