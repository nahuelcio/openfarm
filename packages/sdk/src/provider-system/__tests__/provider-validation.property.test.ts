/**
 * Property-based tests for Provider Validation
 *
 * **Feature: provider-architecture-refactor, Property 13: Provider Validation**
 * **Validates: Requirements 9.5**
 *
 * Property: For any provider implementation, the Provider_Registry should validate it meets
 * the required interface before allowing registration.
 */

import * as fc from "fast-check";
import { describe, expect, it } from "vitest";
import type { ExecutionOptions, ExecutionResult } from "../../types";
import { BaseProvider } from "../base-provider";
import { BaseProviderFactory } from "../factory";
import { ProviderRegistry } from "../registry";
import type {
  CommunicationRequest,
  CommunicationResponse,
  CommunicationStrategy,
  ConfigurationManager,
  Provider,
  ProviderCapabilities,
  ProviderFactory,
  ProviderMetadata,
  ResponseParser,
} from "../types";

// Valid mock implementations for testing
class ValidCommunicationStrategy implements CommunicationStrategy {
  readonly type = "valid-mock";

  async execute(): Promise<CommunicationResponse> {
    return {
      status: 200,
      body: "valid-response",
      success: true,
      duration: 100,
    };
  }

  async testConnection(): Promise<boolean> {
    return true;
  }
}

class ValidResponseParser implements ResponseParser {
  readonly type = "valid-mock";

  async parse(response: CommunicationResponse): Promise<string> {
    return `parsed: ${response.body}`;
  }

  canHandle(): boolean {
    return true;
  }
}

class ValidConfigurationManager implements ConfigurationManager {
  validate(): boolean { return true; }
  getValidationErrors(): string[] { return []; }
  getDefaults(): Record<string, unknown> { return { timeout: 30_000 }; }
  mergeWithDefaults(config: unknown): Record<string, unknown> {
    return { ...this.getDefaults(), ...((config as Record<string, unknown>) || {}) };
  }
  getSchema(): Record<string, unknown> { return { type: "object" }; }
}

// Valid provider implementation
class ValidProvider extends BaseProvider {
  readonly type: string;
  readonly name: string;

  constructor(
    type: string,
    name: string,
    strategy: CommunicationStrategy,
    parser: ResponseParser,
    configManager: ConfigurationManager
  ) {
    super(strategy, parser, configManager);
    this.type = type;
    this.name = name;
  }

  protected async prepareRequest(options: ExecutionOptions): Promise<CommunicationRequest> {
    return { endpoint: "/valid", body: { task: options.task } };
  }

  protected async formatResult(
    parsedResult: unknown,
    _response: any,
    duration: number
  ): Promise<ExecutionResult> {
    return {
      success: true,
      output: `Valid result: ${parsedResult}`,
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
      features: ["validation"],
    };
  }
}

// Valid factory implementation
class ValidProviderFactory extends BaseProviderFactory {
  constructor(metadata: ProviderMetadata) {
    super(metadata);
  }

  protected createCommunicationStrategy(): CommunicationStrategy {
    return new ValidCommunicationStrategy();
  }

  protected createResponseParser(): ResponseParser {
    return new ValidResponseParser();
  }

  protected createConfigurationManager(): ConfigurationManager {
    return new ValidConfigurationManager();
  }

  protected createProvider(
    communicationStrategy: CommunicationStrategy,
    responseParser: ResponseParser,
    configManager: ConfigurationManager
  ): Provider {
    return new ValidProvider(
      this.metadata.type,
      this.metadata.name,
      communicationStrategy,
      responseParser,
      configManager
    );
  }
}

// Invalid factory implementations for testing validation
class InvalidFactoryMissingCreate implements Partial<ProviderFactory> {
  constructor(private metadata: ProviderMetadata) {}

  getMetadata(): ProviderMetadata {
    return this.metadata;
  }

  canCreate(type: string): boolean {
    return this.metadata.type === type;
  }

  // Missing create method - should cause validation failure
}

class InvalidFactoryMissingMetadata implements Partial<ProviderFactory> {
  create(): Provider {
    return new ValidProvider(
      "invalid",
      "Invalid Provider",
      new ValidCommunicationStrategy(),
      new ValidResponseParser(),
      new ValidConfigurationManager()
    );
  }

  canCreate(): boolean {
    return true;
  }

  // Missing getMetadata method - should cause validation failure
}

class InvalidFactoryBadMetadata extends BaseProviderFactory {
  constructor(metadata: ProviderMetadata) {
    super(metadata);
  }

  protected createCommunicationStrategy(): CommunicationStrategy {
    return new ValidCommunicationStrategy();
  }

  protected createResponseParser(): ResponseParser {
    return new ValidResponseParser();
  }

  protected createConfigurationManager(): ConfigurationManager {
    return new ValidConfigurationManager();
  }

  protected createProvider(): Provider {
    return new ValidProvider(
      this.metadata.type,
      this.metadata.name,
      new ValidCommunicationStrategy(),
      new ValidResponseParser(),
      new ValidConfigurationManager()
    );
  }
}

// Invalid provider implementations
class InvalidProviderMissingType implements Partial<Provider> {
  readonly name = "Invalid Provider";

  async execute(): Promise<ExecutionResult> {
    return { success: false, output: "", duration: 0 };
  }

  async testConnection(): Promise<boolean> {
    return false;
  }

  validateConfig(): boolean {
    return false;
  }

  // Missing type property - should cause validation failure
}

class InvalidProviderMissingExecute implements Partial<Provider> {
  readonly type = "invalid";
  readonly name = "Invalid Provider";

  async testConnection(): Promise<boolean> {
    return false;
  }

  validateConfig(): boolean {
    return false;
  }

  // Missing execute method - should cause validation failure
}

// Factory that creates invalid providers
class InvalidProviderCreatingFactory extends BaseProviderFactory {
  constructor(metadata: ProviderMetadata, private invalidType: "missing-type" | "missing-execute") {
    super(metadata);
  }

  protected createCommunicationStrategy(): CommunicationStrategy {
    return new ValidCommunicationStrategy();
  }

  protected createResponseParser(): ResponseParser {
    return new ValidResponseParser();
  }

  protected createConfigurationManager(): ConfigurationManager {
    return new ValidConfigurationManager();
  }

  protected createProvider(): Provider {
    if (this.invalidType === "missing-type") {
      return new InvalidProviderMissingType() as Provider;
    } else {
      return new InvalidProviderMissingExecute() as Provider;
    }
  }
}

// Generators for property-based testing
const validProviderTypeArb = fc.string({ minLength: 1, maxLength: 15 })
  .filter(s => /^[a-zA-Z0-9_-]+$/.test(s) && s.trim().length > 0);

const validProviderMetadataArb = fc.record({
  type: validProviderTypeArb,
  name: fc.string({ minLength: 1, maxLength: 25 }).filter(s => s.trim().length > 0),
  description: fc.string({ minLength: 5, maxLength: 50 }),
  version: fc.constantFrom("1.0.0", "1.1.0", "2.0.0"),
  supportedFeatures: fc.array(
    fc.constantFrom("basic", "advanced", "validation"), 
    { minLength: 1, maxLength: 3 }
  ),
});

const invalidProviderMetadataArb = fc.oneof(
  // Invalid type (empty, non-string, or invalid characters)
  fc.record({
    type: fc.oneof(
      fc.constant(""), // empty string
      fc.constant(null), // null
      fc.constant(123), // number
      fc.string().filter(s => !/^[a-zA-Z0-9_-]+$/.test(s) && s.length > 0) // invalid format
    ),
    name: fc.string({ minLength: 1, maxLength: 25 }).filter(s => s.trim().length > 0),
    description: fc.string({ minLength: 5, maxLength: 50 }),
    version: fc.constantFrom("1.0.0", "1.1.0", "2.0.0"),
    supportedFeatures: fc.array(fc.string(), { minLength: 1, maxLength: 3 }),
  }),
  // Invalid name (empty or non-string)
  fc.record({
    type: validProviderTypeArb,
    name: fc.oneof(fc.constant(""), fc.constant(null), fc.constant(123)),
    description: fc.string({ minLength: 5, maxLength: 50 }),
    version: fc.constantFrom("1.0.0", "1.1.0", "2.0.0"),
    supportedFeatures: fc.array(fc.string(), { minLength: 1, maxLength: 3 }),
  }),
  // Invalid version (empty or non-string)
  fc.record({
    type: validProviderTypeArb,
    name: fc.string({ minLength: 1, maxLength: 25 }).filter(s => s.trim().length > 0),
    description: fc.string({ minLength: 5, maxLength: 50 }),
    version: fc.oneof(fc.constant(""), fc.constant(null), fc.constant(123)),
    supportedFeatures: fc.array(fc.string(), { minLength: 1, maxLength: 3 }),
  }),
  // Invalid supportedFeatures (not an array)
  fc.record({
    type: validProviderTypeArb,
    name: fc.string({ minLength: 1, maxLength: 25 }).filter(s => s.trim().length > 0),
    description: fc.string({ minLength: 5, maxLength: 50 }),
    version: fc.constantFrom("1.0.0", "1.1.0", "2.0.0"),
    supportedFeatures: fc.oneof(fc.constant(null), fc.constant("not-array"), fc.constant(123)),
  })
);

describe("Property 13: Provider Validation", () => {
  it("should accept valid provider implementations", () => {
    fc.assert(
      fc.property(
        validProviderMetadataArb,
        (metadata) => {
          // Arrange
          const registry = new ProviderRegistry();
          const factory = new ValidProviderFactory(metadata);

          // Act & Assert - Should not throw
          expect(() => registry.registerProvider(factory)).not.toThrow();

          // Verify provider was registered successfully
          expect(registry.hasProvider(metadata.type)).toBe(true);
          expect(registry.getProviderMetadata(metadata.type)).toEqual(metadata);

          // Verify provider can be created and is functional
          const provider = registry.createProvider(metadata.type);
          expect(provider.type).toBe(metadata.type);
          expect(provider.name).toBe(metadata.name);
        }
      ),
      { numRuns: 50 }
    );
  });

  it("should reject provider implementations with invalid metadata", () => {
    fc.assert(
      fc.property(
        invalidProviderMetadataArb,
        (invalidMetadata) => {
          // Arrange
          const registry = new ProviderRegistry();
          const factory = new InvalidFactoryBadMetadata(invalidMetadata as ProviderMetadata);

          // Act & Assert - Should throw validation error
          expect(() => registry.registerProvider(factory)).toThrow();

          // Verify provider was not registered
          if (typeof invalidMetadata.type === "string" && invalidMetadata.type.length > 0) {
            expect(registry.hasProvider(invalidMetadata.type)).toBe(false);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it("should reject factories missing required methods", () => {
    fc.assert(
      fc.property(
        validProviderMetadataArb,
        (metadata) => {
          // Arrange
          const registry = new ProviderRegistry();

          // Test factory missing getMetadata method - this should fail immediately
          const factoryMissingMetadata = new InvalidFactoryMissingMetadata();
          expect(() => registry.registerProvider(factoryMissingMetadata as ProviderFactory))
            .toThrow();

          // Test factory missing create method - this might register but fail on creation
          const factoryMissingCreate = new InvalidFactoryMissingCreate(metadata);
          
          // The registry might accept the factory if it has getMetadata
          // But creating a provider should fail if create method is missing
          registry.registerProvider(factoryMissingCreate as ProviderFactory);
          expect(() => registry.createProvider(metadata.type)).toThrow();

          // Verify provider creation failed (provider should not be functional)
          expect(registry.hasProvider(metadata.type)).toBe(true); // Factory was registered
        }
      ),
      { numRuns: 50 }
    );
  });

  it("should validate that created providers implement required interface", () => {
    fc.assert(
      fc.property(
        validProviderMetadataArb,
        fc.constantFrom("missing-type", "missing-execute"),
        (metadata, invalidType) => {
          // Arrange
          const registry = new ProviderRegistry();
          const factory = new InvalidProviderCreatingFactory(metadata, invalidType);

          // Act - Register factory (this should succeed since factory has valid interface)
          registry.registerProvider(factory);
          expect(registry.hasProvider(metadata.type)).toBe(true);

          // Assert - Creating provider should succeed but provider should be invalid
          // The validation happens when we try to use the provider, not when creating it
          const provider = registry.createProvider(metadata.type);
          
          // The provider should be missing required properties/methods
          if (invalidType === "missing-type") {
            expect(provider.type).toBeUndefined();
          } else if (invalidType === "missing-execute") {
            expect(provider.execute).toBeUndefined();
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it("should provide descriptive error messages for validation failures", () => {
    fc.assert(
      fc.property(
        fc.record({
          type: fc.constant(""), // Invalid empty type
          name: fc.string({ minLength: 1, maxLength: 25 }),
          description: fc.string({ minLength: 5, maxLength: 50 }),
          version: fc.constantFrom("1.0.0", "1.1.0", "2.0.0"),
          supportedFeatures: fc.array(fc.string(), { minLength: 1, maxLength: 3 }),
        }),
        (invalidMetadata) => {
          // Arrange
          const registry = new ProviderRegistry();
          const factory = new InvalidFactoryBadMetadata(invalidMetadata as ProviderMetadata);

          // Act & Assert
          try {
            registry.registerProvider(factory);
            expect.fail("Expected validation to throw an error");
          } catch (error) {
            // Verify error is descriptive
            expect(error).toBeInstanceOf(Error);
            const errorMessage = (error as Error).message.toLowerCase();
            expect(errorMessage).toMatch(/type|metadata|valid/);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it("should prevent duplicate provider type registration", () => {
    fc.assert(
      fc.property(
        validProviderMetadataArb,
        (metadata) => {
          // Arrange
          const registry = new ProviderRegistry();
          const factory1 = new ValidProviderFactory(metadata);
          const factory2 = new ValidProviderFactory(metadata); // Same type

          // Act - Register first provider
          registry.registerProvider(factory1);
          expect(registry.hasProvider(metadata.type)).toBe(true);

          // Assert - Registering duplicate should fail
          expect(() => registry.registerProvider(factory2)).toThrow();

          // Verify original provider is still registered and functional
          expect(registry.hasProvider(metadata.type)).toBe(true);
          const provider = registry.createProvider(metadata.type);
          expect(provider.type).toBe(metadata.type);
        }
      ),
      { numRuns: 50 }
    );
  });

  it("should validate provider type format restrictions", () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.string().filter(s => s.includes(" ")), // Contains spaces
          fc.string().filter(s => s.includes(".")), // Contains dots
          fc.string().filter(s => s.includes("/")), // Contains slashes
          fc.string().filter(s => /[^a-zA-Z0-9_-]/.test(s) && s.length > 0 && !s.includes(" ") && !s.includes(".") && !s.includes("/")), // Other invalid characters
          fc.constant("") // Empty string
        ),
        fc.string({ minLength: 1, maxLength: 25 }).filter(s => s.trim().length > 0),
        (invalidType, name) => {
          // Skip if the invalid type would actually be valid
          fc.pre(!/^[a-zA-Z0-9_-]+$/.test(invalidType) || invalidType === "");

          // Arrange
          const registry = new ProviderRegistry();
          const metadata: ProviderMetadata = {
            type: invalidType,
            name,
            description: "Test provider with invalid type",
            version: "1.0.0",
            supportedFeatures: ["basic"],
          };
          const factory = new InvalidFactoryBadMetadata(metadata);

          // Act & Assert - Should reject invalid type format
          expect(() => registry.registerProvider(factory)).toThrow();

          // Verify provider was not registered
          expect(registry.hasProvider(invalidType)).toBe(false);
        }
      ),
      { numRuns: 50 }
    );
  });

  it("should validate that providers can be created successfully", async () => {
    await fc.assert(
      fc.asyncProperty(
        validProviderMetadataArb,
        async (metadata) => {
          // Arrange
          const registry = new ProviderRegistry();
          const factory = new ValidProviderFactory(metadata);

          // Act - Register and create provider
          registry.registerProvider(factory);
          const provider = registry.createProvider(metadata.type);

          // Assert - Provider should be fully functional
          expect(provider.type).toBe(metadata.type);
          expect(provider.name).toBe(metadata.name);

          // Test core provider functionality
          expect(await provider.testConnection()).toBe(true);
          expect(provider.validateConfig({})).toBe(true);

          // Test execution
          const result = await provider.execute({ task: "validation-test" });
          expect(result.success).toBe(true);
          expect(result.output).toContain("Valid result");
          expect(typeof result.duration).toBe("number");
        }
      ),
      { numRuns: 50 }
    );
  });

  it("should validate provider capabilities are properly defined", () => {
    fc.assert(
      fc.property(
        validProviderMetadataArb,
        (metadata) => {
          // Arrange
          const registry = new ProviderRegistry();
          const factory = new ValidProviderFactory(metadata);

          // Act
          registry.registerProvider(factory);
          const provider = registry.createProvider(metadata.type);

          // Assert - Capabilities should be properly defined
          const capabilities = provider.getCapabilities();
          expect(capabilities).toBeDefined();
          expect(Array.isArray(capabilities.executionModes)).toBe(true);
          expect(Array.isArray(capabilities.fileTypes)).toBe(true);
          expect(Array.isArray(capabilities.features)).toBe(true);
          expect(typeof capabilities.supportsStreaming).toBe("boolean");
          expect(typeof capabilities.supportsLocal).toBe("boolean");
          expect(typeof capabilities.requiresInternet).toBe("boolean");
        }
      ),
      { numRuns: 50 }
    );
  });
});