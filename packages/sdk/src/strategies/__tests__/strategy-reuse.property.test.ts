/**
 * Property-based tests for Strategy and Parser Reuse
 *
 * **Feature: provider-architecture-refactor, Property 4: Strategy and Parser Reuse**
 * **Validates: Requirements 2.2, 2.3, 3.2, 3.3**
 *
 * Property: For any two providers that use the same communication method (HTTP/CLI)
 * or response format (JSON/Stream), they should reuse the same strategy and parser
 * implementations without conflicts or interference.
 */

import * as fc from "fast-check";
import { describe, expect, it } from "vitest";
import { BaseProvider } from "../../provider-system/base-provider";
import type {
  CommunicationRequest,
  CommunicationResponse,
  CommunicationStrategy,
  ConfigurationManager,
  ProviderCapabilities,
  ResponseParser,
} from "../../provider-system/types";
import type { ExecutionOptions, ExecutionResult } from "../../types";

// Simple mock strategy that always succeeds
class MockStrategy implements CommunicationStrategy {
  readonly type: string;
  private executionCount = 0;

  constructor(type: string) {
    this.type = type;
  }

  async execute(request: CommunicationRequest): Promise<CommunicationResponse> {
    this.executionCount++;
    return {
      status: 200,
      body: JSON.stringify({
        strategy: this.type,
        execution: this.executionCount,
        task: request.body?.task || "default",
      }),
      success: true,
      duration: 10,
    };
  }

  async testConnection(): Promise<boolean> {
    return true;
  }

  getExecutionCount(): number {
    return this.executionCount;
  }
}

// Simple mock parser that always succeeds
class MockParser implements ResponseParser<any> {
  readonly type: string;
  private parseCount = 0;

  constructor(type: string) {
    this.type = type;
  }

  async parse(response: CommunicationResponse): Promise<any> {
    this.parseCount++;
    return JSON.parse(response.body);
  }

  canHandle(): boolean {
    return true;
  }

  getParseCount(): number {
    return this.parseCount;
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

  protected async prepareRequest(
    options: ExecutionOptions
  ): Promise<CommunicationRequest> {
    return {
      endpoint: "/test",
      body: { task: options.task, provider: this.type },
    };
  }

  protected async formatResult(
    parsedResult: unknown,
    _response: any,
    duration: number
  ): Promise<ExecutionResult> {
    this.executionCount++;
    return {
      success: true,
      output: `${this.type}: ${JSON.stringify(parsedResult)} (execution: ${this.executionCount})`,
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
      features: ["reusable"],
    };
  }

  getExecutionCount(): number {
    return this.executionCount;
  }
}

// Generators for property-based testing
const providerTypeArb = fc
  .string({ minLength: 1, maxLength: 10 })
  .filter((s) => /^[a-zA-Z][a-zA-Z0-9_-]*$/.test(s));

const providerSpecArb = fc.record({
  type: providerTypeArb,
  name: fc.string({ minLength: 1, maxLength: 20 }),
  strategyType: fc.constantFrom("http", "cli"),
  parserType: fc.constantFrom("json", "stream"),
});

describe("Property 4: Strategy and Parser Reuse", () => {
  it("should reuse strategy instances across multiple providers", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(providerSpecArb, { minLength: 2, maxLength: 4 }),
        async (providerSpecs) => {
          // Ensure unique provider types
          const uniqueSpecs = providerSpecs.map((spec, index) => ({
            ...spec,
            type: `${spec.type}_${index}`,
          }));

          // Group providers by strategy type
          const httpProviders: TestProvider[] = [];
          const cliProviders: TestProvider[] = [];

          // Create shared strategies
          const httpStrategy = new MockStrategy("http");
          const cliStrategy = new MockStrategy("cli");

          // Create providers with shared strategies
          for (const spec of uniqueSpecs) {
            const parser = new MockParser(spec.parserType);
            const strategy =
              spec.strategyType === "http" ? httpStrategy : cliStrategy;

            const provider = new TestProvider(
              spec.type,
              spec.name,
              strategy,
              parser,
              new MockConfigurationManager()
            );

            if (spec.strategyType === "http") {
              httpProviders.push(provider);
            } else {
              cliProviders.push(provider);
            }
          }

          const allProviders = [...httpProviders, ...cliProviders];

          // Execute all providers
          const results = await Promise.all(
            allProviders.map((provider) =>
              provider.execute({ task: "strategy-reuse-test" })
            )
          );

          // Verify all executions succeeded
          for (const result of results) {
            expect(result.success).toBe(true);
            expect(result.output).toContain("strategy-reuse-test");
          }

          // Verify strategy reuse - providers with same strategy type share instances
          for (const provider of httpProviders) {
            expect(provider.communicationStrategy).toBe(httpStrategy);
          }
          for (const provider of cliProviders) {
            expect(provider.communicationStrategy).toBe(cliStrategy);
          }

          // Verify strategies were used correctly
          if (httpProviders.length > 0) {
            expect(httpStrategy.getExecutionCount()).toBe(httpProviders.length);
          }
          if (cliProviders.length > 0) {
            expect(cliStrategy.getExecutionCount()).toBe(cliProviders.length);
          }

          // Verify outputs are unique (providers are independent)
          const outputs = results.map((r) => r.output);
          const uniqueOutputs = new Set(outputs);
          expect(uniqueOutputs.size).toBe(outputs.length);
        }
      ),
      { numRuns: 50 }
    );
  });

  it("should reuse parser instances across providers with different strategies", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(providerSpecArb, { minLength: 2, maxLength: 4 }),
        async (providerSpecs) => {
          // Ensure unique provider types
          const uniqueSpecs = providerSpecs.map((spec, index) => ({
            ...spec,
            type: `parser_${spec.type}_${index}`,
          }));

          // Group providers by parser type
          const jsonProviders: TestProvider[] = [];
          const streamProviders: TestProvider[] = [];

          // Create shared parsers
          const jsonParser = new MockParser("json");
          const streamParser = new MockParser("stream");

          // Create providers with shared parsers
          for (const spec of uniqueSpecs) {
            const strategy = new MockStrategy(spec.strategyType);
            const parser =
              spec.parserType === "json" ? jsonParser : streamParser;

            const provider = new TestProvider(
              spec.type,
              spec.name,
              strategy,
              parser,
              new MockConfigurationManager()
            );

            if (spec.parserType === "json") {
              jsonProviders.push(provider);
            } else {
              streamProviders.push(provider);
            }
          }

          const allProviders = [...jsonProviders, ...streamProviders];

          // Execute all providers
          const results = await Promise.all(
            allProviders.map((provider) =>
              provider.execute({ task: "parser-reuse-test" })
            )
          );

          // Verify all executions succeeded
          for (const result of results) {
            expect(result.success).toBe(true);
            expect(result.output).toContain("parser-reuse-test");
          }

          // Verify parser reuse - providers with same parser type share instances
          for (const provider of jsonProviders) {
            expect(provider.responseParser).toBe(jsonParser);
          }
          for (const provider of streamProviders) {
            expect(provider.responseParser).toBe(streamParser);
          }

          // Verify parsers were used correctly
          if (jsonProviders.length > 0) {
            expect(jsonParser.getParseCount()).toBe(jsonProviders.length);
          }
          if (streamProviders.length > 0) {
            expect(streamParser.getParseCount()).toBe(streamProviders.length);
          }

          // Verify outputs are unique (providers are independent)
          const outputs = results.map((r) => r.output);
          const uniqueOutputs = new Set(outputs);
          expect(uniqueOutputs.size).toBe(outputs.length);
        }
      ),
      { numRuns: 50 }
    );
  });

  it("should handle concurrent execution without interference when sharing components", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(providerSpecArb, { minLength: 3, maxLength: 5 }),
        async (providerSpecs) => {
          // Ensure unique provider types
          const uniqueSpecs = providerSpecs.map((spec, index) => ({
            ...spec,
            type: `concurrent_${spec.type}_${index}`,
          }));

          // Create shared components
          const sharedStrategy = new MockStrategy("shared");
          const sharedParser = new MockParser("shared");

          // Create providers with shared components
          const providers: TestProvider[] = [];
          for (const spec of uniqueSpecs) {
            const provider = new TestProvider(
              spec.type,
              spec.name,
              sharedStrategy,
              sharedParser,
              new MockConfigurationManager()
            );
            providers.push(provider);
          }

          // Execute all providers concurrently
          const results = await Promise.all(
            providers.map((provider, index) =>
              provider.execute({ task: `concurrent-task-${index}` })
            )
          );

          // Verify all executions succeeded
          for (const result of results) {
            expect(result.success).toBe(true);
            expect(result.output).toContain("concurrent-task");
          }

          // Verify shared components were used
          for (const provider of providers) {
            expect(provider.communicationStrategy).toBe(sharedStrategy);
            expect(provider.responseParser).toBe(sharedParser);
          }

          // Verify each provider executed exactly once
          for (const provider of providers) {
            expect(provider.getExecutionCount()).toBe(1);
          }

          // Verify shared components tracked total usage
          expect(sharedStrategy.getExecutionCount()).toBe(providers.length);
          expect(sharedParser.getParseCount()).toBe(providers.length);

          // Verify outputs are unique (no interference)
          const outputs = results.map((r) => r.output);
          const uniqueOutputs = new Set(outputs);
          expect(uniqueOutputs.size).toBe(outputs.length);
        }
      ),
      { numRuns: 50 }
    );
  });

  it("should maintain component state independence across multiple execution rounds", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(providerSpecArb, { minLength: 2, maxLength: 3 }),
        fc.integer({ min: 1, max: 3 }),
        async (providerSpecs, executionRounds) => {
          // Ensure unique provider types
          const uniqueSpecs = providerSpecs.map((spec, index) => ({
            ...spec,
            type: `state_${spec.type}_${index}`,
          }));

          // Create shared components
          const sharedStrategy = new MockStrategy("state-test");
          const sharedParser = new MockParser("state-test");

          // Create providers with shared components
          const providers: TestProvider[] = [];
          for (const spec of uniqueSpecs) {
            const provider = new TestProvider(
              spec.type,
              spec.name,
              sharedStrategy,
              sharedParser,
              new MockConfigurationManager()
            );
            providers.push(provider);
          }

          // Execute multiple rounds to test state independence
          for (let round = 1; round <= executionRounds; round++) {
            const results = await Promise.all(
              providers.map((provider) =>
                provider.execute({ task: `round-${round}` })
              )
            );

            // Verify all executions succeeded
            for (const result of results) {
              expect(result.success).toBe(true);
              expect(result.output).toContain(`round-${round}`);
            }

            // Verify each provider maintains its own execution count
            for (let i = 0; i < providers.length; i++) {
              expect(providers[i].getExecutionCount()).toBe(round);
            }
          }

          // Verify shared components tracked total usage across all providers and rounds
          expect(sharedStrategy.getExecutionCount()).toBe(
            providers.length * executionRounds
          );
          expect(sharedParser.getParseCount()).toBe(
            providers.length * executionRounds
          );
        }
      ),
      { numRuns: 50 }
    );
  });
});
