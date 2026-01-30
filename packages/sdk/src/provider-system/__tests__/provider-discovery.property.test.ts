/**
 * Property-based tests for Automatic Provider Discovery
 *
 * **Feature: provider-architecture-refactor, Property 2: Automatic Provider Discovery**
 * **Validates: Requirements 1.2, 9.1, 9.2, 9.3**
 *
 * Property: For any valid provider placed in the expected location, the Provider_Registry
 * should discover it automatically during system initialization without manual registration.
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
  ProviderMetadata,
  ResponseParser,
} from "../types";

// Mock implementations for testing
class MockCommunicationStrategy implements CommunicationStrategy {
  readonly type = "mock";

  constructor(private readonly id: string) {}

  async execute(): Promise<CommunicationResponse> {
    return {
      status: 200,
      body: `mock-response-${this.id}`,
      success: true,
      duration: 50,
    };
  }

  async testConnection(): Promise<boolean> {
    return true;
  }
}

class MockResponseParser implements ResponseParser {
  readonly type = "mock";

  constructor(private readonly id: string) {}

  async parse(response: CommunicationResponse): Promise<string> {
    return `parsed-${this.id}: ${response.body}`;
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
    return {
      ...this.getDefaults(),
      ...((config as Record<string, unknown>) || {}),
    };
  }
  getSchema(): Record<string, unknown> {
    return { type: "object" };
  }
}

// Discoverable test provider
class DiscoverableProvider extends BaseProvider {
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

  protected async prepareRequest(
    options: ExecutionOptions
  ): Promise<CommunicationRequest> {
    return {
      endpoint: "/discover",
      body: { task: options.task, provider: this.type },
    };
  }

  protected async formatResult(
    parsedResult: unknown,
    _response: any,
    duration: number
  ): Promise<ExecutionResult> {
    return {
      success: true,
      output: `Discovered provider ${this.type}: ${parsedResult}`,
      duration,
    };
  }

  getCapabilities(): ProviderCapabilities {
    return {
      executionModes: ["discovery"],
      fileTypes: ["*"],
      supportsStreaming: false,
      supportsLocal: true,
      requiresInternet: false,
      features: ["discoverable"],
    };
  }
}

// Factory for discoverable providers
class DiscoverableProviderFactory extends BaseProviderFactory {
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
    return new DiscoverableProvider(
      this.metadata.type,
      this.metadata.name,
      communicationStrategy,
      responseParser,
      configManager
    );
  }
}

// Extended registry that simulates discovery
class TestableProviderRegistry extends ProviderRegistry {
  private simulatedProviders: ProviderMetadata[] = [];

  // Simulate placing providers in expected locations
  simulateProviderPlacement(providers: ProviderMetadata[]): void {
    this.simulatedProviders = [...providers];
  }

  // Override discovery to use simulated providers
  protected async discoverBuiltInProviders(): Promise<void> {
    // Simulate discovering built-in providers
    for (const metadata of this.simulatedProviders.filter(
      (p) => !p.packageName
    )) {
      const factory = new DiscoverableProviderFactory(metadata);
      this.registerProvider(factory);
    }
  }

  protected async discoverExternalProviders(): Promise<void> {
    // Simulate discovering external provider packages
    for (const metadata of this.simulatedProviders.filter(
      (p) => p.packageName
    )) {
      const factory = new DiscoverableProviderFactory(metadata);
      this.registerProvider(factory);
    }
  }
}

// Generators for property-based testing
const providerTypeArb = fc
  .string({ minLength: 1, maxLength: 15 })
  .filter((s) => /^[a-zA-Z][a-zA-Z0-9_-]*$/.test(s));

const builtInProviderArb = fc.record({
  type: providerTypeArb,
  name: fc.string({ minLength: 1, maxLength: 25 }),
  description: fc.string({ minLength: 5, maxLength: 50 }),
  version: fc.constantFrom("1.0.0", "1.1.0", "2.0.0", "2.1.0"),
  supportedFeatures: fc.array(
    fc.constantFrom("basic", "advanced", "streaming", "local"),
    { minLength: 1, maxLength: 3 }
  ),
  // Built-in providers don't have packageName
});

const externalProviderArb = fc.record({
  type: providerTypeArb,
  name: fc.string({ minLength: 1, maxLength: 25 }),
  description: fc.string({ minLength: 5, maxLength: 50 }),
  packageName: fc
    .string({ minLength: 5, maxLength: 30 })
    .map((s) => `@openfarm/provider-${s}`),
  version: fc.constantFrom("1.0.0", "1.1.0", "2.0.0", "2.1.0"),
  supportedFeatures: fc.array(
    fc.constantFrom("basic", "advanced", "streaming", "external"),
    { minLength: 1, maxLength: 3 }
  ),
});

const mixedProvidersArb = fc
  .tuple(
    fc.array(builtInProviderArb, { minLength: 0, maxLength: 3 }),
    fc.array(externalProviderArb, { minLength: 0, maxLength: 3 })
  )
  .map(([builtIn, external]) => [...builtIn, ...external]);

describe("Property 2: Automatic Provider Discovery", () => {
  it("should discover all available providers automatically during initialization", async () => {
    await fc.assert(
      fc.asyncProperty(mixedProvidersArb, async (providers) => {
        // Skip empty provider lists
        fc.pre(providers.length > 0);

        // Ensure unique provider types
        const uniqueProviders = providers.reduce((acc, provider, index) => {
          const uniqueType = `${provider.type}_${index}`;
          acc.push({ ...provider, type: uniqueType });
          return acc;
        }, [] as ProviderMetadata[]);

        // Create registry and simulate provider placement
        const registry = new TestableProviderRegistry();
        registry.simulateProviderPlacement(uniqueProviders);

        // Verify no providers are registered before discovery
        expect(registry.getAvailableProviders()).toHaveLength(0);

        // Trigger automatic discovery
        await registry.discoverProviders();

        // Verify all providers were discovered
        const discoveredProviders = registry.getAvailableProviders();
        expect(discoveredProviders).toHaveLength(uniqueProviders.length);

        // Verify each provider was discovered correctly
        for (const expectedProvider of uniqueProviders) {
          expect(registry.hasProvider(expectedProvider.type)).toBe(true);

          const discoveredMetadata = registry.getProviderMetadata(
            expectedProvider.type
          );
          expect(discoveredMetadata).toBeDefined();
          expect(discoveredMetadata?.type).toBe(expectedProvider.type);
          expect(discoveredMetadata?.name).toBe(expectedProvider.name);
          expect(discoveredMetadata?.packageName).toBe(
            expectedProvider.packageName
          );
        }
      }),
      { numRuns: 50 }
    );
  });

  it("should discover providers without manual registration", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(builtInProviderArb, { minLength: 1, maxLength: 4 }),
        async (providers) => {
          // Ensure unique types
          const uniqueProviders = providers.map((provider, index) => ({
            ...provider,
            type: `builtin_${provider.type}_${index}`,
          }));

          // Create registry and simulate provider placement
          const registry = new TestableProviderRegistry();
          registry.simulateProviderPlacement(uniqueProviders);

          // Verify no manual registration occurred
          expect(registry.getAvailableProviders()).toHaveLength(0);

          // Discovery should find all providers automatically
          await registry.discoverProviders();

          // All providers should be available without manual registration
          expect(registry.getAvailableProviders()).toHaveLength(
            uniqueProviders.length
          );

          // Each provider should be functional
          for (const provider of uniqueProviders) {
            const instance = registry.createProvider(provider.type);
            expect(instance.type).toBe(provider.type);
            expect(instance.name).toBe(provider.name);

            // Provider should be functional
            const result = await instance.execute({ task: "discovery-test" });
            expect(result.success).toBe(true);
            expect(result.output).toContain("Discovered provider");
            expect(result.output).toContain(provider.type);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it("should support both built-in and external provider discovery", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.tuple(
          fc.array(builtInProviderArb, { minLength: 1, maxLength: 2 }),
          fc.array(externalProviderArb, { minLength: 1, maxLength: 2 })
        ),
        async ([builtInProviders, externalProviders]) => {
          // Ensure unique types across both arrays
          const uniqueBuiltIn = builtInProviders.map((provider, index) => ({
            ...provider,
            type: `builtin_${index}`,
          }));

          const uniqueExternal = externalProviders.map((provider, index) => ({
            ...provider,
            type: `external_${index}`,
          }));

          const allProviders = [...uniqueBuiltIn, ...uniqueExternal];

          // Create registry and simulate provider placement
          const registry = new TestableProviderRegistry();
          registry.simulateProviderPlacement(allProviders);

          // Trigger discovery
          await registry.discoverProviders();

          // Verify both types were discovered
          const discovered = registry.getAvailableProviders();
          expect(discovered).toHaveLength(allProviders.length);

          // Verify built-in providers (no packageName)
          const discoveredBuiltIn = discovered.filter((p) => !p.packageName);
          expect(discoveredBuiltIn).toHaveLength(uniqueBuiltIn.length);

          // Verify external providers (have packageName)
          const discoveredExternal = discovered.filter((p) => p.packageName);
          expect(discoveredExternal).toHaveLength(uniqueExternal.length);

          // Verify all providers are functional
          for (const provider of allProviders) {
            const instance = registry.createProvider(provider.type);
            expect(await instance.testConnection()).toBe(true);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it("should detect external provider packages automatically", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(externalProviderArb, { minLength: 1, maxLength: 3 }),
        async (externalProviders) => {
          // Ensure unique types and package names
          const uniqueProviders = externalProviders.map((provider, index) => ({
            ...provider,
            type: `pkg_${index}`,
            packageName: `@openfarm/provider-pkg-${index}`,
          }));

          // Create registry and simulate external package installation
          const registry = new TestableProviderRegistry();
          registry.simulateProviderPlacement(uniqueProviders);

          // Discovery should find external packages
          await registry.discoverProviders();

          // Verify external providers were detected
          const discovered = registry.getAvailableProviders();
          expect(discovered).toHaveLength(uniqueProviders.length);

          // All discovered providers should be external (have packageName)
          for (const discoveredProvider of discovered) {
            expect(discoveredProvider.packageName).toBeDefined();
            expect(discoveredProvider.packageName).toMatch(
              /^@openfarm\/provider-/
            );
          }

          // Verify providers are properly registered and functional
          for (const provider of uniqueProviders) {
            expect(registry.hasProvider(provider.type)).toBe(true);

            const instance = registry.createProvider(provider.type);
            expect(instance.type).toBe(provider.type);

            const result = await instance.execute({ task: "external-test" });
            expect(result.success).toBe(true);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it("should not interfere with manually registered providers", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.tuple(
          fc.array(builtInProviderArb, { minLength: 1, maxLength: 2 }),
          fc.array(builtInProviderArb, { minLength: 1, maxLength: 2 })
        ),
        async ([manualProviders, discoveredProviders]) => {
          // Ensure all providers have unique types
          const uniqueManual = manualProviders.map((provider, index) => ({
            ...provider,
            type: `manual_${index}`,
          }));

          const uniqueDiscovered = discoveredProviders.map(
            (provider, index) => ({
              ...provider,
              type: `discovered_${index}`,
            })
          );

          // Create registry and manually register some providers
          const registry = new TestableProviderRegistry();

          for (const provider of uniqueManual) {
            const factory = new DiscoverableProviderFactory(provider);
            registry.registerProvider(factory);
          }

          // Verify manual providers are registered
          expect(registry.getAvailableProviders()).toHaveLength(
            uniqueManual.length
          );

          // Simulate discoverable providers and trigger discovery
          registry.simulateProviderPlacement(uniqueDiscovered);
          await registry.discoverProviders();

          // Verify both manual and discovered providers are available
          const allProviders = registry.getAvailableProviders();
          expect(allProviders).toHaveLength(
            uniqueManual.length + uniqueDiscovered.length
          );

          // Verify manual providers still work
          for (const provider of uniqueManual) {
            expect(registry.hasProvider(provider.type)).toBe(true);
            const instance = registry.createProvider(provider.type);
            const result = await instance.execute({ task: "manual-test" });
            expect(result.success).toBe(true);
          }

          // Verify discovered providers work
          for (const provider of uniqueDiscovered) {
            expect(registry.hasProvider(provider.type)).toBe(true);
            const instance = registry.createProvider(provider.type);
            const result = await instance.execute({ task: "discovered-test" });
            expect(result.success).toBe(true);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it("should handle discovery idempotently", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(builtInProviderArb, { minLength: 1, maxLength: 3 }),
        async (providers) => {
          // Ensure unique types
          const uniqueProviders = providers.map((provider, index) => ({
            ...provider,
            type: `idempotent_${index}`,
          }));

          // Create registry and simulate provider placement
          const registry = new TestableProviderRegistry();
          registry.simulateProviderPlacement(uniqueProviders);

          // Run discovery multiple times
          await registry.discoverProviders();
          const firstDiscovery = registry.getAvailableProviders();

          await registry.discoverProviders();
          const secondDiscovery = registry.getAvailableProviders();

          await registry.discoverProviders();
          const thirdDiscovery = registry.getAvailableProviders();

          // Results should be identical
          expect(secondDiscovery).toHaveLength(firstDiscovery.length);
          expect(thirdDiscovery).toHaveLength(firstDiscovery.length);

          // Provider count should remain stable
          expect(firstDiscovery).toHaveLength(uniqueProviders.length);
          expect(secondDiscovery).toHaveLength(uniqueProviders.length);
          expect(thirdDiscovery).toHaveLength(uniqueProviders.length);

          // All providers should still be functional
          for (const provider of uniqueProviders) {
            expect(registry.hasProvider(provider.type)).toBe(true);
            const instance = registry.createProvider(provider.type);
            expect(await instance.testConnection()).toBe(true);
          }
        }
      ),
      { numRuns: 50 }
    );
  });
});
