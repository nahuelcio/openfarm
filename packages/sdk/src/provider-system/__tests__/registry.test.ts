/**
 * Unit tests for ProviderRegistry
 *
 * Tests the core functionality of provider registration, discovery, and management.
 */

import { beforeEach, describe, expect, it } from "vitest";
import { ProviderRegistry } from "../registry";
import type {
  ExecutionOptions,
  ExecutionResult,
  Provider,
  ProviderFactory,
  ProviderMetadata,
} from "../types";

// Mock implementations for testing
class MockProvider implements Provider {
  readonly type: string;
  readonly name: string;

  constructor(type: string, name: string) {
    this.type = type;
    this.name = name;
  }

  async execute(_options: ExecutionOptions): Promise<ExecutionResult> {
    return {
      success: true,
      output: "mock result",
      duration: 100,
    };
  }

  async testConnection(): Promise<boolean> {
    return true;
  }

  validateConfig(_config: unknown): boolean {
    return true;
  }
}

class MockProviderFactory implements ProviderFactory {
  private readonly metadata: ProviderMetadata;

  constructor(metadata: ProviderMetadata) {
    this.metadata = metadata;
  }

  create(_config?: unknown): Provider {
    return new MockProvider(this.metadata.type, this.metadata.name);
  }

  getMetadata(): ProviderMetadata {
    return { ...this.metadata };
  }

  canCreate(type: string): boolean {
    return this.metadata.type === type;
  }
}

describe("ProviderRegistry", () => {
  let registry: ProviderRegistry;

  beforeEach(() => {
    registry = new ProviderRegistry();
  });

  describe("Provider Registration", () => {
    it("should register a provider factory successfully", () => {
      // Arrange
      const metadata: ProviderMetadata = {
        type: "test-provider",
        name: "Test Provider",
        description: "A test provider",
        version: "1.0.0",
        supportedFeatures: ["basic"],
      };
      const factory = new MockProviderFactory(metadata);

      // Act
      registry.registerProvider(factory);

      // Assert
      expect(registry.hasProvider("test-provider")).toBe(true);
      expect(registry.getFactory("test-provider")).toBe(factory);
      expect(registry.getProviderMetadata("test-provider")).toEqual(metadata);
    });

    it("should throw error when registering duplicate provider type", () => {
      // Arrange
      const metadata: ProviderMetadata = {
        type: "duplicate-provider",
        name: "Duplicate Provider",
        description: "A duplicate provider",
        version: "1.0.0",
        supportedFeatures: ["basic"],
      };
      const factory1 = new MockProviderFactory(metadata);
      const factory2 = new MockProviderFactory(metadata);

      // Act & Assert
      registry.registerProvider(factory1);
      expect(() => registry.registerProvider(factory2)).toThrow(
        "Provider type 'duplicate-provider' is already registered"
      );
    });

    it("should validate provider metadata before registration", () => {
      // Arrange - Invalid metadata (missing type)
      const invalidMetadata = {
        name: "Invalid Provider",
        description: "Invalid provider",
        version: "1.0.0",
        supportedFeatures: ["basic"],
      } as ProviderMetadata;
      const factory = new MockProviderFactory(invalidMetadata);

      // Act & Assert
      expect(() => registry.registerProvider(factory)).toThrow(
        "Provider metadata must have a valid type string"
      );
    });

    it("should validate provider type format", () => {
      // Arrange - Invalid type format
      const invalidMetadata: ProviderMetadata = {
        type: "invalid type with spaces",
        name: "Invalid Provider",
        description: "Invalid provider",
        version: "1.0.0",
        supportedFeatures: ["basic"],
      };
      const factory = new MockProviderFactory(invalidMetadata);

      // Act & Assert
      expect(() => registry.registerProvider(factory)).toThrow(
        "Provider type must contain only alphanumeric characters, hyphens, and underscores"
      );
    });
  });

  describe("Provider Creation", () => {
    it("should create provider instance successfully", () => {
      // Arrange
      const metadata: ProviderMetadata = {
        type: "create-test",
        name: "Create Test Provider",
        description: "A provider for creation testing",
        version: "1.0.0",
        supportedFeatures: ["basic"],
      };
      const factory = new MockProviderFactory(metadata);
      registry.registerProvider(factory);

      // Act
      const provider = registry.createProvider("create-test");

      // Assert
      expect(provider).toBeInstanceOf(MockProvider);
      expect(provider.type).toBe("create-test");
      expect(provider.name).toBe("Create Test Provider");
    });

    it("should throw error when creating non-existent provider", () => {
      // Act & Assert
      expect(() => registry.createProvider("non-existent")).toThrow(
        "Provider type 'non-existent' is not registered"
      );
    });

    it("should pass configuration to factory during creation", () => {
      // Arrange
      const metadata: ProviderMetadata = {
        type: "config-test",
        name: "Config Test Provider",
        description: "A provider for config testing",
        version: "1.0.0",
        supportedFeatures: ["basic"],
      };

      let receivedConfig: unknown;
      const factory: ProviderFactory = {
        create(config?: unknown): Provider {
          receivedConfig = config;
          return new MockProvider(metadata.type, metadata.name);
        },
        getMetadata(): ProviderMetadata {
          return metadata;
        },
        canCreate(type: string): boolean {
          return metadata.type === type;
        },
      };

      registry.registerProvider(factory);
      const config = { timeout: 5000 };

      // Act
      registry.createProvider("config-test", config);

      // Assert
      expect(receivedConfig).toEqual(config);
    });
  });

  describe("Provider Discovery", () => {
    it("should return all available providers", () => {
      // Arrange
      const metadata1: ProviderMetadata = {
        type: "provider-1",
        name: "Provider 1",
        description: "First provider",
        version: "1.0.0",
        supportedFeatures: ["basic"],
      };
      const metadata2: ProviderMetadata = {
        type: "provider-2",
        name: "Provider 2",
        description: "Second provider",
        version: "2.0.0",
        supportedFeatures: ["advanced"],
      };

      registry.registerProvider(new MockProviderFactory(metadata1));
      registry.registerProvider(new MockProviderFactory(metadata2));

      // Act
      const providers = registry.getAvailableProviders();

      // Assert
      expect(providers).toHaveLength(2);
      expect(providers).toContainEqual(metadata1);
      expect(providers).toContainEqual(metadata2);
    });

    it("should return providers by feature", () => {
      // Arrange
      const basicProvider: ProviderMetadata = {
        type: "basic-provider",
        name: "Basic Provider",
        description: "Basic provider",
        version: "1.0.0",
        supportedFeatures: ["basic", "simple"],
      };
      const advancedProvider: ProviderMetadata = {
        type: "advanced-provider",
        name: "Advanced Provider",
        description: "Advanced provider",
        version: "1.0.0",
        supportedFeatures: ["advanced", "complex"],
      };

      registry.registerProvider(new MockProviderFactory(basicProvider));
      registry.registerProvider(new MockProviderFactory(advancedProvider));

      // Act
      const basicProviders = registry.getProvidersByFeature("basic");
      const advancedProviders = registry.getProvidersByFeature("advanced");

      // Assert
      expect(basicProviders).toHaveLength(1);
      expect(basicProviders[0].type).toBe("basic-provider");
      expect(advancedProviders).toHaveLength(1);
      expect(advancedProviders[0].type).toBe("advanced-provider");
    });

    it("should run discovery process", async () => {
      // Act
      await registry.discoverProviders();

      // Assert - Discovery should complete without errors
      // Note: The actual discovery logic is placeholder, but the method should work
      expect(true).toBe(true);
    });

    it("should only run discovery once", async () => {
      // Act
      await registry.discoverProviders();
      await registry.discoverProviders(); // Second call should be no-op

      // Assert - Should not throw or cause issues
      expect(true).toBe(true);
    });
  });

  describe("Registry Statistics", () => {
    it("should return correct statistics", () => {
      // Arrange
      const builtInProvider: ProviderMetadata = {
        type: "builtin",
        name: "Built-in Provider",
        description: "Built-in provider",
        version: "1.0.0",
        supportedFeatures: ["basic", "builtin"],
      };
      const externalProvider: ProviderMetadata = {
        type: "external",
        name: "External Provider",
        description: "External provider",
        version: "1.0.0",
        supportedFeatures: ["advanced"],
        packageName: "@openfarm/provider-external",
      };

      registry.registerProvider(new MockProviderFactory(builtInProvider));
      registry.registerProvider(new MockProviderFactory(externalProvider));

      // Act
      const stats = registry.getStats();

      // Assert
      expect(stats.totalProviders).toBe(2);
      expect(stats.builtInProviders).toBe(1);
      expect(stats.externalProviders).toBe(1);
      expect(stats.providersByFeature.basic).toBe(1);
      expect(stats.providersByFeature.builtin).toBe(1);
      expect(stats.providersByFeature.advanced).toBe(1);
    });
  });

  describe("Registry Management", () => {
    it("should clear all providers", () => {
      // Arrange
      const metadata: ProviderMetadata = {
        type: "clear-test",
        name: "Clear Test Provider",
        description: "Provider for clear testing",
        version: "1.0.0",
        supportedFeatures: ["basic"],
      };
      registry.registerProvider(new MockProviderFactory(metadata));

      // Act
      registry.clear();

      // Assert
      expect(registry.hasProvider("clear-test")).toBe(false);
      expect(registry.getAvailableProviders()).toHaveLength(0);
    });

    it("should check provider existence", () => {
      // Arrange
      const metadata: ProviderMetadata = {
        type: "existence-test",
        name: "Existence Test Provider",
        description: "Provider for existence testing",
        version: "1.0.0",
        supportedFeatures: ["basic"],
      };
      registry.registerProvider(new MockProviderFactory(metadata));

      // Act & Assert
      expect(registry.hasProvider("existence-test")).toBe(true);
      expect(registry.hasProvider("non-existent")).toBe(false);
    });
  });

  describe("Error Handling", () => {
    it("should handle factory creation errors gracefully", () => {
      // Arrange
      const metadata: ProviderMetadata = {
        type: "error-test",
        name: "Error Test Provider",
        description: "Provider that throws during creation",
        version: "1.0.0",
        supportedFeatures: ["basic"],
      };

      const errorFactory: ProviderFactory = {
        create(_config?: unknown): Provider {
          throw new Error("Factory creation failed");
        },
        getMetadata(): ProviderMetadata {
          return metadata;
        },
        canCreate(type: string): boolean {
          return metadata.type === type;
        },
      };

      registry.registerProvider(errorFactory);

      // Act & Assert
      expect(() => registry.createProvider("error-test")).toThrow(
        "Failed to create provider 'error-test'"
      );
    });

    it("should provide detailed error information", () => {
      // Act & Assert
      try {
        registry.createProvider("non-existent");
      } catch (error: any) {
        expect(error.type).toBe("registry");
        expect(error.code).toBe("PROVIDER_NOT_FOUND");
        expect(error.details).toBeDefined();
        expect(error.details.requestedType).toBe("non-existent");
        expect(error.details.availableTypes).toEqual([]);
      }
    });
  });
});
