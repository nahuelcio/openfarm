/**
 * Property-based tests for Component Delegation
 *
 * **Feature: provider-architecture-refactor, Property 5: Component Delegation**
 * **Validates: Requirements 2.5, 3.5, 4.3**
 *
 * Property: For any provider operation, the Base_Provider should correctly delegate
 * communication to the appropriate strategy and parsing to the appropriate parser.
 */

import * as fc from "fast-check";
import { describe, expect, it } from "vitest";
import type { ExecutionOptions, ExecutionResult } from "../../types";
import { BaseProvider } from "../base-provider";
import type {
  CommunicationRequest,
  CommunicationResponse,
  CommunicationStrategy,
  ConfigurationManager,
  ProviderCapabilities,
  ResponseParser,
} from "../types";

// Mock communication strategy that tracks delegation calls
class MockCommunicationStrategy implements CommunicationStrategy {
  readonly type: string;
  private executeCalls: Array<{
    request: CommunicationRequest;
    timestamp: number;
  }> = [];
  private testConnectionCalls = 0;
  private readonly shouldSucceed: boolean;
  private readonly responseBody: string;

  constructor(
    type: string,
    shouldSucceed = true,
    responseBody = "mock-response"
  ) {
    this.type = type;
    this.shouldSucceed = shouldSucceed;
    this.responseBody = responseBody;
  }

  async execute(request: CommunicationRequest): Promise<CommunicationResponse> {
    this.executeCalls.push({ request, timestamp: Date.now() });

    return {
      status: this.shouldSucceed ? 200 : 500,
      body: this.responseBody,
      success: this.shouldSucceed,
      duration: 10,
      headers: { "content-type": "application/json" },
    };
  }

  async testConnection(): Promise<boolean> {
    this.testConnectionCalls++;
    return this.shouldSucceed;
  }

  // Test helpers
  getExecuteCalls(): Array<{
    request: CommunicationRequest;
    timestamp: number;
  }> {
    return [...this.executeCalls];
  }

  getTestConnectionCalls(): number {
    return this.testConnectionCalls;
  }

  clearCalls(): void {
    this.executeCalls = [];
    this.testConnectionCalls = 0;
  }
}

// Mock response parser that tracks delegation calls
class MockResponseParser implements ResponseParser<any> {
  readonly type: string;
  private parseCalls: Array<{
    response: CommunicationResponse;
    timestamp: number;
  }> = [];
  private canHandleCalls: Array<{
    response: CommunicationResponse;
    timestamp: number;
  }> = [];
  private readonly shouldSucceed: boolean;
  private readonly parseResult: any;

  constructor(
    type: string,
    shouldSucceed = true,
    parseResult: any = { parsed: true }
  ) {
    this.type = type;
    this.shouldSucceed = shouldSucceed;
    this.parseResult = parseResult;
  }

  async parse(response: CommunicationResponse): Promise<any> {
    this.parseCalls.push({ response, timestamp: Date.now() });

    if (!this.shouldSucceed) {
      throw new Error("Parser error");
    }

    return this.parseResult;
  }

  canHandle(response: CommunicationResponse): boolean {
    this.canHandleCalls.push({ response, timestamp: Date.now() });
    return this.shouldSucceed;
  }

  // Test helpers
  getParseCalls(): Array<{
    response: CommunicationResponse;
    timestamp: number;
  }> {
    return [...this.parseCalls];
  }

  getCanHandleCalls(): Array<{
    response: CommunicationResponse;
    timestamp: number;
  }> {
    return [...this.canHandleCalls];
  }

  clearCalls(): void {
    this.parseCalls = [];
    this.canHandleCalls = [];
  }
}

// Mock configuration manager that tracks delegation calls
class MockConfigurationManager implements ConfigurationManager {
  private validateCalls: Array<{ config: unknown; timestamp: number }> = [];
  private getDefaultsCalls = 0;
  private readonly isValid: boolean;
  private readonly defaults: Record<string, unknown>;

  constructor(
    isValid = true,
    defaults: Record<string, unknown> = { timeout: 30_000 }
  ) {
    this.isValid = isValid;
    this.defaults = defaults;
  }

  validate(config: unknown): boolean {
    this.validateCalls.push({ config, timestamp: Date.now() });
    return this.isValid;
  }

  getValidationErrors(config: unknown): string[] {
    return this.isValid ? [] : [`Invalid config: ${JSON.stringify(config)}`];
  }

  getDefaults(): Record<string, unknown> {
    this.getDefaultsCalls++;
    return { ...this.defaults };
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

  // Test helpers
  getValidateCalls(): Array<{ config: unknown; timestamp: number }> {
    return [...this.validateCalls];
  }

  getGetDefaultsCalls(): number {
    return this.getDefaultsCalls;
  }

  clearCalls(): void {
    this.validateCalls = [];
    this.getDefaultsCalls = 0;
  }
}

// Test provider implementation
class TestProvider extends BaseProvider {
  readonly type: string;
  readonly name: string;
  private readonly prepareRequestCalls: Array<{
    options: ExecutionOptions;
    timestamp: number;
  }> = [];
  private readonly formatResultCalls: Array<{
    parsedResult: unknown;
    timestamp: number;
  }> = [];

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
    this.prepareRequestCalls.push({ options, timestamp: Date.now() });

    return {
      endpoint: "/test",
      method: "POST",
      body: { task: options.task, provider: this.type },
    };
  }

  protected async formatResult(
    parsedResult: unknown,
    _response: any,
    duration: number
  ): Promise<ExecutionResult> {
    this.formatResultCalls.push({ parsedResult, timestamp: Date.now() });

    return {
      success: true,
      output: `${this.type}: ${JSON.stringify(parsedResult)}`,
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
      features: ["delegation-test"],
    };
  }

  // Test helpers
  getPrepareRequestCalls(): Array<{
    options: ExecutionOptions;
    timestamp: number;
  }> {
    return [...this.prepareRequestCalls];
  }

  getFormatResultCalls(): Array<{ parsedResult: unknown; timestamp: number }> {
    return [...this.formatResultCalls];
  }
}

// Generators for property-based testing
const providerTypeArb = fc
  .string({ minLength: 1, maxLength: 10 })
  .filter((s) => /^[a-zA-Z][a-zA-Z0-9_-]*$/.test(s));

const taskArb = fc
  .string({ minLength: 1, maxLength: 100 })
  .filter((s) => s.trim().length > 0);

const executionOptionsArb = fc.record({
  task: taskArb,
  temperature: fc.option(fc.float({ min: 0, max: 2 })),
  maxTokens: fc.option(fc.integer({ min: 1, max: 100_000 })),
  stream: fc.option(fc.boolean()),
  verbose: fc.option(fc.boolean()),
});

describe("Property 5: Component Delegation", () => {
  it("should delegate execute operations to communication strategy", async () => {
    // Mock console.error to avoid stderr noise from expected error cases
    const originalConsoleError = console.error;
    console.error = () => {};

    try {
    await fc.assert(
      fc.asyncProperty(
        providerTypeArb,
        fc.string({ minLength: 1, maxLength: 20 }),
        executionOptionsArb,
        fc.boolean(),
        fc.string({ minLength: 1, maxLength: 100 }),
        async (type, name, options, strategySuccess, responseBody) => {
          // Arrange
          const strategy = new MockCommunicationStrategy(
            type,
            strategySuccess,
            responseBody
          );
          const parser = new MockResponseParser("json", true, {
            data: "parsed",
          });
          const configManager = new MockConfigurationManager(true);

          const provider = new TestProvider(
            type,
            name,
            strategy,
            parser,
            configManager
          );

          // Act
          const result = await provider.execute(options);

          // Assert - BaseProvider delegates to communication strategy
          const strategyCalls = strategy.getExecuteCalls();
          expect(strategyCalls).toHaveLength(1);

          const call = strategyCalls[0];
          expect(call.request).toBeDefined();
          expect(call.request.endpoint).toBe("/test");
          expect(call.request.method).toBe("POST");
          expect(call.request.body).toEqual({
            task: options.task,
            provider: type,
          });

          // Verify provider prepared the request correctly
          const prepareRequestCalls = provider.getPrepareRequestCalls();
          expect(prepareRequestCalls).toHaveLength(1);
          expect(prepareRequestCalls[0].options).toEqual(options);

          // Verify result matches strategy success
          expect(result.success).toBe(strategySuccess);
          if (strategySuccess) {
            expect(result.output).toContain(type);
          } else {
            expect(result.error).toBeDefined();
          }
        }
      ),
      { numRuns: 50 }
    );
    } finally {
      console.error = originalConsoleError;
    }
  });

  it("should delegate parsing to response parser", async () => {
    await fc.assert(
      fc.asyncProperty(
        providerTypeArb,
        fc.string({ minLength: 1, maxLength: 20 }),
        executionOptionsArb,
        fc.boolean(),
        fc.record({
          data: fc.string(),
          count: fc.integer(),
          success: fc.boolean(),
        }),
        async (type, name, options, parserSuccess, parseResult) => {
          // Arrange
          const strategy = new MockCommunicationStrategy(
            type,
            true,
            JSON.stringify(parseResult)
          );
          const parser = new MockResponseParser(
            "json",
            parserSuccess,
            parseResult
          );
          const configManager = new MockConfigurationManager(true);

          const provider = new TestProvider(
            type,
            name,
            strategy,
            parser,
            configManager
          );

          // Act
          const result = await provider.execute(options);

          // Assert - BaseProvider delegates to response parser
          const parseCalls = parser.getParseCalls();
          expect(parseCalls).toHaveLength(1);

          const call = parseCalls[0];
          expect(call.response).toBeDefined();
          expect(call.response.success).toBe(true);
          expect(call.response.body).toBe(JSON.stringify(parseResult));

          if (parserSuccess) {
            // Verify provider formatted the parsed result
            const formatResultCalls = provider.getFormatResultCalls();
            expect(formatResultCalls).toHaveLength(1);
            expect(formatResultCalls[0].parsedResult).toEqual(parseResult);

            expect(result.success).toBe(true);
            expect(result.output).toContain(JSON.stringify(parseResult));
          } else {
            // Parser error should result in failed execution
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it("should delegate configuration access to configuration manager", () => {
    fc.assert(
      fc.property(
        providerTypeArb,
        fc.string({ minLength: 1, maxLength: 20 }),
        fc.boolean(),
        fc.record({
          timeout: fc.integer({ min: 1000, max: 600_000 }),
          retries: fc.integer({ min: 1, max: 10 }),
          custom: fc.string(),
        }),
        (type, name, isValid, config) => {
          // Arrange
          const strategy = new MockCommunicationStrategy(type);
          const parser = new MockResponseParser("json");
          const configManager = new MockConfigurationManager(isValid, config);

          const provider = new TestProvider(
            type,
            name,
            strategy,
            parser,
            configManager
          );

          // Act
          const result = provider.validateConfig(config);

          // Assert - BaseProvider delegates to configuration manager
          const validateCalls = configManager.getValidateCalls();
          expect(validateCalls).toHaveLength(1);
          expect(validateCalls[0].config).toEqual(config);
          expect(result).toBe(isValid);
        }
      ),
      { numRuns: 50 }
    );
  });

  it("should delegate testConnection to communication strategy", async () => {
    await fc.assert(
      fc.asyncProperty(
        providerTypeArb,
        fc.string({ minLength: 1, maxLength: 20 }),
        fc.boolean(),
        async (type, name, connectionSuccess) => {
          // Arrange
          const strategy = new MockCommunicationStrategy(
            type,
            connectionSuccess
          );
          const parser = new MockResponseParser("json");
          const configManager = new MockConfigurationManager();

          const provider = new TestProvider(
            type,
            name,
            strategy,
            parser,
            configManager
          );

          // Act
          const result = await provider.testConnection();

          // Assert - BaseProvider delegates to communication strategy
          expect(strategy.getTestConnectionCalls()).toBe(1);
          expect(result).toBe(connectionSuccess);
        }
      ),
      { numRuns: 50 }
    );
  });

  it("should not interfere with component operations during delegation", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(providerTypeArb, { minLength: 2, maxLength: 4 }),
        fc.array(executionOptionsArb, { minLength: 2, maxLength: 4 }),
        async (types, optionsArray) => {
          // Ensure unique types
          const uniqueTypes = types.map((type, index) => `${type}_${index}`);

          // Arrange - Create shared components
          const sharedStrategy = new MockCommunicationStrategy(
            "shared",
            true,
            '{"shared": true}'
          );
          const sharedParser = new MockResponseParser("shared", true, {
            shared: true,
          });
          const sharedConfigManager = new MockConfigurationManager(true, {
            shared: "config",
          });

          // Create multiple providers sharing the same components
          const providers = uniqueTypes.map(
            (type) =>
              new TestProvider(
                type,
                `${type}-name`,
                sharedStrategy,
                sharedParser,
                sharedConfigManager
              )
          );

          // Act - Execute all providers with different options
          const results = await Promise.all(
            providers.map((provider, index) =>
              provider.execute(optionsArray[index % optionsArray.length])
            )
          );

          // Assert - All executions should succeed
          for (const result of results) {
            expect(result.success).toBe(true);
            expect(result.output).toContain('"shared":true');
          }

          // Verify each provider called the shared components
          expect(sharedStrategy.getExecuteCalls()).toHaveLength(
            providers.length
          );
          expect(sharedParser.getParseCalls()).toHaveLength(providers.length);

          // Verify each provider prepared its own request
          for (let i = 0; i < providers.length; i++) {
            const prepareRequestCalls = providers[i].getPrepareRequestCalls();
            expect(prepareRequestCalls).toHaveLength(1);

            const formatResultCalls = providers[i].getFormatResultCalls();
            expect(formatResultCalls).toHaveLength(1);
          }

          // Verify no interference - each provider's output should be unique
          const outputs = results.map((r) => r.output);
          const uniqueOutputs = new Set(outputs);
          expect(uniqueOutputs.size).toBe(outputs.length);
        }
      ),
      { numRuns: 50 }
    );
  });

  it("should maintain correct delegation order during execution flow", async () => {
    await fc.assert(
      fc.asyncProperty(
        providerTypeArb,
        fc.string({ minLength: 1, maxLength: 20 }),
        executionOptionsArb,
        async (type, name, options) => {
          // Arrange
          const strategy = new MockCommunicationStrategy(
            type,
            true,
            '{"ordered": true}'
          );
          const parser = new MockResponseParser("json", true, {
            ordered: true,
          });
          const configManager = new MockConfigurationManager(true);

          const provider = new TestProvider(
            type,
            name,
            strategy,
            parser,
            configManager
          );

          // Act
          const startTime = Date.now();
          const result = await provider.execute(options);
          const endTime = Date.now();

          // Assert - Verify correct delegation order
          const prepareRequestCalls = provider.getPrepareRequestCalls();
          const strategyCalls = strategy.getExecuteCalls();
          const parseCalls = parser.getParseCalls();
          const formatResultCalls = provider.getFormatResultCalls();

          // All calls should have occurred
          expect(prepareRequestCalls).toHaveLength(1);
          expect(strategyCalls).toHaveLength(1);
          expect(parseCalls).toHaveLength(1);
          expect(formatResultCalls).toHaveLength(1);

          // Verify chronological order
          const prepareTime = prepareRequestCalls[0].timestamp;
          const strategyTime = strategyCalls[0].timestamp;
          const parseTime = parseCalls[0].timestamp;
          const formatTime = formatResultCalls[0].timestamp;

          expect(prepareTime).toBeGreaterThanOrEqual(startTime);
          expect(strategyTime).toBeGreaterThanOrEqual(prepareTime);
          expect(parseTime).toBeGreaterThanOrEqual(strategyTime);
          expect(formatTime).toBeGreaterThanOrEqual(parseTime);
          expect(formatTime).toBeLessThanOrEqual(endTime);

          // Verify successful execution
          expect(result.success).toBe(true);
          expect(result.output).toContain('"ordered":true');
        }
      ),
      { numRuns: 50 }
    );
  });

  it("should handle component errors without bypassing delegation", async () => {
    // Mock console.error to avoid stderr noise from expected error cases
    const originalConsoleError = console.error;
    console.error = () => {};

    try {
    await fc.assert(
      fc.asyncProperty(
        providerTypeArb,
        fc.string({ minLength: 1, maxLength: 20 }),
        executionOptionsArb,
        fc.constantFrom("strategy", "parser"),
        async (type, name, options, errorComponent) => {
          // Arrange - Create components with one that will fail
          const strategy = new MockCommunicationStrategy(
            type,
            errorComponent !== "strategy",
            '{"test": true}'
          );
          const parser = new MockResponseParser(
            "json",
            errorComponent !== "parser",
            { test: true }
          );
          const configManager = new MockConfigurationManager(true);

          const provider = new TestProvider(
            type,
            name,
            strategy,
            parser,
            configManager
          );

          // Act
          const result = await provider.execute(options);

          // Assert - BaseProvider should still delegate to components
          if (errorComponent === "strategy") {
            // Strategy error should be handled
            expect(strategy.getExecuteCalls()).toHaveLength(1);
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
          } else if (errorComponent === "parser") {
            // Parser error should be handled
            expect(strategy.getExecuteCalls()).toHaveLength(1);
            expect(parser.getParseCalls()).toHaveLength(1);
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
          }

          // Verify BaseProvider doesn't bypass delegation even on errors
          expect(result).toBeDefined();
          expect(typeof result.success).toBe("boolean");
          expect(typeof result.duration).toBe("number");
        }
      ),
      { numRuns: 50 }
    );
    } finally {
      console.error = originalConsoleError;
    }
  });
});
