/**
 * Property-based tests for Base Provider Inheritance
 *
 * **Feature: provider-architecture-refactor, Property 3: Base Provider Inheritance**
 * **Validates: Requirements 1.3, 1.4**
 *
 * Property: For any provider implementation, it should inherit all common functionality
 * from Base_Provider and only implement provider-specific logic.
 */

import * as fc from "fast-check";
import { describe, expect, it } from "vitest";
import type { ExecutionResult } from "../../types";
import { BaseProvider } from "../base-provider";
import type {
  CommunicationRequest,
  CommunicationResponse,
  CommunicationStrategy,
  ConfigurationManager,
  ProviderCapabilities,
  ResponseParser,
} from "../types";

// Simple, predictable mocks
class MockCommunicationStrategy implements CommunicationStrategy {
  readonly type = "mock";

  constructor(private shouldSucceed = true) {}

  async execute(): Promise<CommunicationResponse> {
    return {
      status: this.shouldSucceed ? 200 : 500,
      body: "mock-response",
      success: this.shouldSucceed,
      duration: 100,
    };
  }

  async testConnection(): Promise<boolean> {
    return this.shouldSucceed;
  }
}

class MockResponseParser implements ResponseParser {
  readonly type = "mock";

  async parse(response: CommunicationResponse): Promise<string> {
    // Don't throw on unsuccessful responses - let the base provider handle it
    return response.success ? "parsed-result" : "error-result";
  }

  canHandle(): boolean {
    return true;
  }
}

class MockConfigurationManager implements ConfigurationManager {
  constructor(private isValid = true) {}

  validate(): boolean {
    return this.isValid;
  }

  getValidationErrors(): string[] {
    return this.isValid ? [] : ["Invalid"];
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

// Test provider implementation
class TestProvider extends BaseProvider {
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

  protected async prepareRequest(): Promise<CommunicationRequest> {
    return { endpoint: "/test" };
  }

  protected async formatResult(
    parsedResult: unknown,
    _response: any,
    duration: number
  ): Promise<ExecutionResult> {
    return {
      success: true,
      output: `Result: ${parsedResult}`,
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

describe("Property 3: Base Provider Inheritance", () => {
  it("should inherit common execution behavior from BaseProvider", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc
          .string({ minLength: 1, maxLength: 20 })
          .filter((s) => /^[a-zA-Z0-9_-]+$/.test(s)),
        fc.string({ minLength: 1, maxLength: 20 }),
        fc.boolean(),
        async (type, name, strategySuccess) => {
          // Arrange
          const strategy = new MockCommunicationStrategy(strategySuccess);
          const parser = new MockResponseParser();
          const configManager = new MockConfigurationManager();

          const provider = new TestProvider(
            type,
            name,
            strategy,
            parser,
            configManager
          );

          // Act
          const result = await provider.execute({ task: "test-task" });

          // Assert - All providers follow the same execution pattern
          expect(result).toBeDefined();
          expect(typeof result.success).toBe("boolean");
          expect(typeof result.duration).toBe("number");

          if (strategySuccess) {
            expect(result.success).toBe(true);
            expect(result.output).toContain("Result:");
          } else {
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it("should delegate testConnection to communication strategy", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc
          .string({ minLength: 1, maxLength: 20 })
          .filter((s) => /^[a-zA-Z0-9_-]+$/.test(s)),
        fc.string({ minLength: 1, maxLength: 20 }),
        fc.boolean(),
        async (type, name, connectionSuccess) => {
          // Arrange
          const strategy = new MockCommunicationStrategy(connectionSuccess);
          const parser = new MockResponseParser();
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

          // Assert - Delegates to strategy
          expect(result).toBe(connectionSuccess);
        }
      ),
      { numRuns: 50 }
    );
  });

  it("should delegate validateConfig to configuration manager", () => {
    fc.assert(
      fc.property(
        fc
          .string({ minLength: 1, maxLength: 20 })
          .filter((s) => /^[a-zA-Z0-9_-]+$/.test(s)),
        fc.string({ minLength: 1, maxLength: 20 }),
        fc.boolean(),
        (type, name, isValid) => {
          // Arrange
          const strategy = new MockCommunicationStrategy();
          const parser = new MockResponseParser();
          const configManager = new MockConfigurationManager(isValid);

          const provider = new TestProvider(
            type,
            name,
            strategy,
            parser,
            configManager
          );

          // Act
          const result = provider.validateConfig({});

          // Assert - Delegates to config manager
          expect(result).toBe(isValid);
        }
      ),
      { numRuns: 50 }
    );
  });

  it("should require provider-specific implementation", () => {
    fc.assert(
      fc.property(
        fc
          .string({ minLength: 1, maxLength: 20 })
          .filter((s) => /^[a-zA-Z0-9_-]+$/.test(s)),
        fc.string({ minLength: 1, maxLength: 20 }),
        (type, name) => {
          // Arrange
          const strategy = new MockCommunicationStrategy();
          const parser = new MockResponseParser();
          const configManager = new MockConfigurationManager();

          // Act
          const provider = new TestProvider(
            type,
            name,
            strategy,
            parser,
            configManager
          );

          // Assert - Provider implements required abstract methods
          expect(provider.type).toBe(type);
          expect(provider.name).toBe(name);
          expect(provider.getCapabilities).toBeDefined();
          expect(typeof provider.getCapabilities()).toBe("object");
        }
      ),
      { numRuns: 50 }
    );
  });
});
