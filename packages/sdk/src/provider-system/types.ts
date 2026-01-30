/**
 * Core interfaces and types for the OpenFarm provider system.
 *
 * This module defines the fundamental contracts that all providers must implement,
 * along with supporting types for communication, parsing, and configuration.
 */

import type { ExecutionOptions, ExecutionResult } from "../types";

/**
 * Core provider interface - all providers must implement this.
 * Defines the essential contract for code execution providers.
 */
export interface Provider {
  /** Unique identifier for the provider type (e.g., 'opencode', 'aider') */
  readonly type: string;

  /** Human-readable name for the provider */
  readonly name: string;

  /** Execute code with the given options */
  execute(options: ExecutionOptions): Promise<ExecutionResult>;

  /** Test if the provider is available and properly configured */
  testConnection(): Promise<boolean>;

  /** Validate provider-specific configuration */
  validateConfig(config: unknown): boolean;
}

/**
 * Metadata describing a provider for registry management.
 * Used for provider discovery, registration, and capability reporting.
 */
export interface ProviderMetadata {
  /** Provider type identifier */
  type: string;

  /** Human-readable provider name */
  name: string;

  /** Brief description of provider capabilities */
  description: string;

  /** Package name if provider is in external package */
  packageName?: string;

  /** Provider version */
  version: string;

  /** List of supported features/capabilities */
  supportedFeatures: string[];

  /** Whether this provider requires external dependencies */
  requiresExternal?: boolean;

  /** Configuration schema for validation */
  configSchema?: Record<string, unknown>;
}

/**
 * Factory interface for creating provider instances.
 * Enables dependency injection and configuration validation.
 */
export interface ProviderFactory {
  /** Create a new provider instance with optional configuration */
  create(config?: unknown): Provider;

  /** Get metadata about this provider */
  getMetadata(): ProviderMetadata;

  /** Check if this factory can create providers of the given type */
  canCreate(type: string): boolean;
}

/**
 * Communication strategy abstraction for different protocols.
 * Enables reuse of HTTP, CLI, and other communication patterns.
 */
export interface CommunicationStrategy {
  /** Execute a communication request */
  execute(request: CommunicationRequest): Promise<CommunicationResponse>;

  /** Test if the communication channel is available */
  testConnection(): Promise<boolean>;

  /** Get strategy type identifier */
  readonly type: string;
}

/**
 * Request object for communication strategies.
 * Flexible structure supporting HTTP, CLI, and other protocols.
 */
export interface CommunicationRequest {
  /** HTTP endpoint (for HTTP strategies) */
  endpoint?: string;

  /** HTTP method (for HTTP strategies) */
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

  /** Request headers (for HTTP strategies) */
  headers?: Record<string, string>;

  /** Request body (for HTTP strategies) */
  body?: unknown;

  /** Command line arguments (for CLI strategies) */
  args?: string[];

  /** Working directory (for CLI strategies) */
  workingDirectory?: string;

  /** Environment variables (for CLI strategies) */
  env?: Record<string, string>;

  /** Request timeout in milliseconds */
  timeout?: number;

  /** Additional strategy-specific options */
  options?: Record<string, unknown>;
}

/**
 * Response object from communication strategies.
 * Standardized format across all communication types.
 */
export interface CommunicationResponse {
  /** Response status code (HTTP status or process exit code) */
  status: number;

  /** Response headers (for HTTP responses) */
  headers?: Record<string, string>;

  /** Response body or stdout content */
  body: string;

  /** Error output or stderr content */
  error?: string;

  /** Whether the operation was successful */
  success: boolean;

  /** Response duration in milliseconds */
  duration?: number;

  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Response parser abstraction for different formats.
 * Enables reuse of JSON, streaming, and other parsing patterns.
 */
export interface ResponseParser<T = unknown> {
  /** Parse a communication response into structured data */
  parse(response: CommunicationResponse): Promise<T>;

  /** Check if this parser can handle the given response */
  canHandle(response: CommunicationResponse): boolean;

  /** Get parser type identifier */
  readonly type: string;
}

/**
 * Configuration manager interface for provider settings.
 * Provides validation and schema management for provider configs.
 */
export interface ConfigurationManager {
  /** Validate configuration against schema */
  validate(config: unknown): boolean;

  /** Get validation errors for invalid configuration */
  getValidationErrors(config: unknown): string[];

  /** Get default configuration values */
  getDefaults(): Record<string, unknown>;

  /** Merge configuration with defaults */
  mergeWithDefaults(config: unknown): Record<string, unknown>;

  /** Get configuration schema */
  getSchema(): Record<string, unknown>;
}

/**
 * Base configuration interface that all provider configs extend.
 */
export interface ProviderConfig {
  /** Provider type identifier */
  type: string;

  /** Request timeout in milliseconds */
  timeout?: number;

  /** Number of retry attempts */
  retries?: number;

  /** Enable verbose logging */
  verbose?: boolean;

  /** Additional provider-specific configuration */
  [key: string]: unknown;
}

/**
 * Error types that can occur in the provider system.
 */
export type ProviderErrorType =
  | "configuration"
  | "communication"
  | "parsing"
  | "provider"
  | "registry"
  | "validation";

/**
 * Standardized error format for the provider system.
 */
export interface ProviderError extends Error {
  /** Error type classification */
  type: ProviderErrorType;

  /** Error code for programmatic handling */
  code: string;

  /** Additional error details */
  details?: Record<string, unknown>;

  /** Original error that caused this error */
  cause?: Error;
}

/**
 * Provider registry interface for managing available providers.
 */
export interface ProviderRegistry {
  /** Register a provider factory */
  registerProvider(factory: ProviderFactory): void;

  /** Get a provider factory by type */
  getFactory(type: string): ProviderFactory | undefined;

  /** Create a provider instance */
  createProvider(type: string, config?: unknown): Provider;

  /** Get all available provider metadata */
  getAvailableProviders(): ProviderMetadata[];

  /** Check if a provider type is available */
  hasProvider(type: string): boolean;

  /** Discover and register providers automatically */
  discoverProviders(): Promise<void>;
}

/**
 * Provider capabilities that can be queried.
 */
export interface ProviderCapabilities {
  /** Supported execution modes */
  executionModes: string[];

  /** Supported file types */
  fileTypes: string[];

  /** Whether streaming is supported */
  supportsStreaming: boolean;

  /** Whether the provider can run locally */
  supportsLocal: boolean;

  /** Whether the provider requires internet */
  requiresInternet: boolean;

  /** Maximum file size supported */
  maxFileSize?: number;

  /** Additional capability flags */
  features: string[];
}
