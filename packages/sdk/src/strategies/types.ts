/**
 * Communication strategy interfaces and types.
 *
 * Defines the contracts for different communication patterns
 * that providers can use (HTTP, CLI, etc.).
 */

export type {
  CommunicationRequest,
  CommunicationResponse,
  CommunicationStrategy,
} from "../provider-system/types";

/**
 * HTTP-specific request options.
 */
export interface HttpRequestOptions {
  /** Base URL for the HTTP service */
  baseUrl: string;

  /** Default headers to include with all requests */
  defaultHeaders?: Record<string, string>;

  /** Request timeout in milliseconds */
  timeout?: number;

  /** Number of retry attempts */
  retries?: number;

  /** Whether to follow redirects */
  followRedirects?: boolean;

  /** SSL/TLS verification options */
  ssl?: {
    rejectUnauthorized?: boolean;
    ca?: string;
    cert?: string;
    key?: string;
  };
}

/**
 * CLI-specific execution options.
 */
export interface CliExecutionOptions {
  /** Command executable path or name */
  executable: string;

  /** Default arguments to include with all executions */
  defaultArgs?: string[];

  /** Default working directory */
  defaultWorkingDirectory?: string;

  /** Default environment variables */
  defaultEnv?: Record<string, string>;

  /** Execution timeout in milliseconds */
  timeout?: number;

  /** Whether to capture stderr separately */
  captureStderr?: boolean;

  /** Shell to use for execution */
  shell?: string | boolean;
}
