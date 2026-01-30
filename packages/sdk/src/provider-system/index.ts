/**
 * OpenFarm Provider System
 *
 * A modular, plugin-based architecture for code execution providers.
 * This system replaces the monolithic executor pattern with a flexible,
 * extensible provider system that promotes code reuse and maintainability.
 */

// Re-export commonly used types from the main SDK for convenience
export type { ExecutionOptions, ExecutionResult } from "../types";

// Base implementations
export { BaseProvider } from "./base-provider";
export {
  BaseProviderFactory,
  FactoryRegistry,
  SimpleProviderFactory,
  ProviderFactory as ConcreteProviderFactory,
} from "./factory";

// Registry implementation
export { globalProviderRegistry, ProviderRegistry } from "./registry";

// Configuration management
export {
  ZodConfigurationManager,
  ConfigurationValidationError,
  createProviderConfigManager,
  CommonSchemas,
  ConfigManagers,
  BaseConfigSchema,
} from "./configuration-manager";

// Communication strategies
export { HttpCommunicationStrategy } from "../strategies/http-strategy";
export { CliCommunicationStrategy } from "../strategies/cli-strategy";

// Response parsers
export { JsonResponseParser } from "../parsers/json-parser";
export { StreamResponseParser } from "../parsers/stream-parser";

// Testing utilities and mocks
export * from "./mocks/index.js";
export * from "./test-utils/index.js";

// Core interfaces and types
export type {
  CommunicationRequest,
  CommunicationResponse,
  CommunicationStrategy,
  ConfigurationManager,
  Provider,
  ProviderCapabilities,
  ProviderConfig,
  ProviderError,
  ProviderErrorType,
  ProviderFactory,
  ProviderMetadata,
  ProviderRegistry as IProviderRegistry,
  ResponseParser,
} from "./types";
