/**
 * Property-based tests for Provider Registration Independence
 *
 * **Feature: provider-architecture-refactor, Property 1: Provider Registration Independence**
 * **Validates: Requirements 1.1, 1.5**
 *
 * Property: For any new provider implementation, registering it in the Provider_Registry
 * should not require modifications to existing provider code, and all existing providers
 * should continue to function unchanged.
 */

import * as fc from "fast-check";
import { beforeEach, describe, expect, it } from "vitest";
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

// Simple mock implementations
class MockCommunicationStrategy implements CommunicationStrategy {
  readonly type = "mock";
  constructor(private id: string) {}

  async execute(): Promise<CommunicationResponse> {
    return {
      status: 200,
      body: `response-${this.id}`,
      success: true,
      duration: 100,
    };
  }

  async testConnection(): Promise<boolean> {
    return true;
  }
}

class MockResponseParser implements ResponseParser {
  readonly type = "mock";
  constructor(private id: string) {}

  async parse(response: CommunicationResponse): Promise<string> {
    return `parsed-${this.id}: ${response.body}`;
  }

  canHandle(): boolean {
    return true;
  }
}

class MockConfigurationManager implements ConfigurationManager {
  validate(): boolean { return true; }
  getValidationErrors(): string[] { return []; }
  getDefaults(): Record<string, unknown> { return { timeout: 30_000 }; }
  mergeWithDefaults(config: unknown): Record<string, unknown> {
    return { ...this.getDefaults(), ...((config as Record<string, unknown>) || {}) };
  }
  getSchema(): Record<string, unknown> { return { type: "object" }; }
}

// Test provider
class TestProvider extends BaseProvider {
  readonly type: string;
  readonly name: string;
  private executionCount = 0;

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
    return { endpoint: "/test", body: { task: options.task } };
  }

  protected async formatResult(
    parsedResult: unknown,
    _response: any,
    duration: number
  ): Promise<ExecutionResult> {
    this.executionCount++;
    return {
      success: true,
      output: `${this.type}: ${parsedResult} (count: ${this.executionCount})`,
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

  getExecutionCount(): number {
    return this.executionCount;
  }
}

// Simple factory
class TestProviderFactory extends BaseProviderFactory {
  constructor(metadata: ProviderMetadata) {
    super(metadata);
  }

  protected createCommunicationStrategy(): CommunicationStrategy {
    return new MockCommunicationStrategy(this.metadata.type);
  }

  protected createResponseParser(): ResponseParser {
    return new MockResponseParser(this.metadata.type);
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
      this.metadata.type,
      this.metadata.name,
      communicationStrategy,
      responseParser,
      configManager
    );
  }
}

// Simple generators
const providerTypeArb = fc.string({ minLength: 1, maxLength: 10 })
  .filter(s => /^[a-zA-Z][a-zA-Z0-9_-]*$/.test(s));

const providerMetadataArb = fc.record({
  type: providerTypeArb,
  name: fc.string({ minLength: 1, maxLength: 20 }),
  description: fc.string({ minLength: 1, maxLength: 50 }),
  version: fc.constantFrom("1.0.0", "1.1.0", "2.0.0"),
  supportedFeatures: fc.array(fc.constantFrom("basic", "advanced"), { minLength: 1, maxLength: 2 }),
});

describe("Property 1: Provider Registration Independence", () => {
  it("should register new providers without affecting existing ones", () => {
    fc.assert(
      fc.property(
        fc.array(providerMetadataArb, { minLength: 2, maxLength: 4 }),
        (metadataList) => {
          // Create fresh registry for each iteration
          const registry = new ProviderRegistry();
          
          // Ensure unique types by adding index suffix
          const uniqueMetadata = metadataList.map((metadata, index) => ({
            ...metadata,
            type: `${metadata.type}_${index}`
          }));

          const registeredProviders: string[] = [];

          // Register providers one by one
          for (let i = 0; i < uniqueMetadata.length; i++) {
            const metadata = uniqueMetadata[i];
            const factory = new TestProviderFactory(metadata);

            // Register new provider
            registry.registerProvider(factory);
            registeredProviders.push(metadata.type);

            // Verify all previously registered providers are still available
            for (const providerType of registeredProviders) {
              expect(registry.hasProvider(providerType)).toBe(true);
              
              // Verify provider can still be created and works
              const provider = registry.createProvider(providerType);
              expect(provider.type).toBe(providerType);
            }

            // Verify registry state is consistent
            expect(registry.getAvailableProviders()).toHaveLength(i + 1);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it("should maintain provider functionality after new registrations", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(providerMetadataArb, { minLength: 2, maxLength: 3 }),
        async (metadataList) => {
          // Create fresh registry for each iteration
          const registry = new ProviderRegistry();
          
          // Ensure unique types
          const uniqueMetadata = metadataList.map((metadata, index) => ({
            ...metadata,
            type: `${metadata.type}_${index}`
          }));

          const providers: TestProvider[] = [];

          // Register and test providers incrementally
          for (let i = 0; i < uniqueMetadata.length; i++) {
            const metadata = uniqueMetadata[i];
            const factory = new TestProviderFactory(metadata);

            // Register new provider
            registry.registerProvider(factory);

            // Create all providers and test they work independently
            const allProviders = uniqueMetadata.slice(0, i + 1).map(m => 
              registry.createProvider(m.type) as TestProvider
            );

            // Execute all providers
            const results = await Promise.all(
              allProviders.map(provider => 
                provider.execute({ task: "test-task" })
              )
            );

            // Verify each provider works correctly
            for (let j = 0; j < results.length; j++) {
              const result = results[j];
              const provider = allProviders[j];

              expect(result.success).toBe(true);
              expect(result.output).toContain(provider.type);
              expect(result.output).toContain("count: 1"); // First execution
            }

            // Verify outputs are unique (providers are independent)
            const outputs = results.map(r => r.output);
            const uniqueOutputs = new Set(outputs);
            expect(uniqueOutputs.size).toBe(outputs.length);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it("should create independent provider instances", () => {
    fc.assert(
      fc.property(
        providerMetadataArb,
        (metadata) => {
          // Create fresh registry for each iteration
          const registry = new ProviderRegistry();
          const factory = new TestProviderFactory(metadata);

          // Register provider
          registry.registerProvider(factory);

          // Create multiple instances
          const provider1 = registry.createProvider(metadata.type);
          const provider2 = registry.createProvider(metadata.type);

          // Verify instances are independent
          expect(provider1).not.toBe(provider2);
          expect(provider1.type).toBe(metadata.type);
          expect(provider2.type).toBe(metadata.type);
          expect(provider1.name).toBe(metadata.name);
          expect(provider2.name).toBe(metadata.name);
        }
      ),
      { numRuns: 50 }
    );
  });
});