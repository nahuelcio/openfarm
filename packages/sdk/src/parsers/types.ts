/**
 * Response parser interfaces and types.
 *
 * Defines the contracts for different response parsing patterns
 * that providers can use (JSON, streaming, etc.).
 */

/**
 * Standardized communication response format.
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
 * Response parser interface for different formats.
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
