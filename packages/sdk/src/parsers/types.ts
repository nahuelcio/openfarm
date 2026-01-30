/**
 * Response parser interfaces and types.
 *
 * Defines the contracts for different response parsing patterns
 * that providers can use (JSON, streaming, etc.).
 */

export type {
  CommunicationResponse,
  ResponseParser,
} from "../provider-system/types";

/**
 * JSON parsing options.
 */
export interface JsonParserOptions {
  /** Whether to validate JSON structure */
  validate?: boolean;

  /** Custom reviver function for JSON.parse */
  reviver?: (key: string, value: unknown) => unknown;

  /** Whether to throw on parsing errors or return null */
  throwOnError?: boolean;

  /** Expected JSON schema for validation */
  schema?: Record<string, unknown>;
}

/**
 * Stream parsing options for line-by-line processing.
 */
export interface StreamParserOptions {
  /** Line separator (default: '\n') */
  separator?: string;

  /** Whether to skip empty lines */
  skipEmpty?: boolean;

  /** Whether to trim whitespace from lines */
  trim?: boolean;

  /** Filter function for lines */
  filter?: (line: string) => boolean;

  /** Transform function for lines */
  transform?: (line: string) => unknown;
}

/**
 * Re-export stream parser types for convenience.
 */
export type {
  StreamEvent,
  StreamParseResult,
} from "./stream-parser";
