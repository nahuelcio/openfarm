/**
 * OpenFarm Provider System
 *
 * A modular, plugin-based architecture for code execution providers.
 * This system replaces the monolithic executor pattern with a flexible,
 * extensible provider system that promotes code reuse and maintainability.
 */

// Response parsers
export { JsonResponseParser } from "../parsers/json-parser";
export { StreamResponseParser } from "../parsers/stream-parser";
export { CliCommunicationStrategy } from "../strategies/cli-strategy";
// Communication strategies
export { HttpCommunicationStrategy } from "../strategies/http-strategy";
// Re-export commonly used types from the main SDK for convenience
export type { ExecutionOptions, ExecutionResult } from "../types";
// Base implementations
export { BaseProvider } from "./base-provider";
// Configuration management
export {
  BaseConfigSchema,
  CommonSchemas,
  ConfigManagers,
  ConfigurationValidationError,
  createProviderConfigManager,
  ZodConfigurationManager,
} from "./configuration-manager";
export {
  BaseProviderFactory,
  FactoryRegistry,
  ProviderFactory as ConcreteProviderFactory,
  SimpleProviderFactory,
} from "./factory";
// Testing utilities and mocks
export * from "./mocks/index.js";
// Registry implementation
export { globalProviderRegistry, ProviderRegistry } from "./registry";
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
