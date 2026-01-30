/**
 * JSON Response Parser for OpenFarm Provider System.
 *
 * Provides robust JSON parsing with error handling, validation, and type safety.
 * Supports nested JSON objects, arrays, and various JSON content types.
 */

import type {
  CommunicationResponse,
  ResponseParser,
} from "../provider-system/types";
import type { JsonParserOptions } from "./types";

/**
 * Parser for JSON responses with comprehensive error handling and validation.
 *
 * Features:
 * - Type-safe parsing with generic support
 * - Content-Type validation for JSON responses
 * - Robust error handling for malformed JSON
 * - Support for empty responses and null values
 * - Custom reviver functions for JSON.parse
 * - Detailed error messages for debugging
 */
export class JsonResponseParser<T = unknown> implements ResponseParser<T> {
  readonly type = "json";

  private readonly options: JsonParserOptions & {
    validate: boolean;
    throwOnError: boolean;
  };

  constructor(options: JsonParserOptions = {}) {
    this.options = {
      validate: options.validate ?? true,
      reviver: options.reviver,
      throwOnError: options.throwOnError ?? true,
      schema: options.schema,
    };
  }

  /**
   * Parse a communication response into structured JSON data.
   *
   * @param response - The communication response to parse
   * @returns Promise resolving to parsed JSON data
   * @throws Error if parsing fails and throwOnError is true
   */
  async parse(response: CommunicationResponse): Promise<T> {
    // Validate that we can handle this response
    if (!this.canHandle(response)) {
      const error = new Error(
        `Cannot parse response: ${this.getParsingErrorReason(response)}`
      );
      if (this.options.throwOnError) {
        throw error;
      }
      return null as T;
    }

    // Handle empty responses
    if (!response.body || response.body.trim() === "") {
      if (this.options.throwOnError) {
        throw new Error("Cannot parse empty response body as JSON");
      }
      return null as T;
    }

    try {
      // Parse JSON with optional reviver function
      const parsed = JSON.parse(response.body, this.options.reviver) as T;

      // Validate against schema if provided
      if (this.options.schema && this.options.validate) {
        this.validateAgainstSchema(parsed, this.options.schema);
      }

      return parsed;
    } catch (error) {
      const parseError = new Error(
        `JSON parsing failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );

      if (this.options.throwOnError) {
        throw parseError;
      }

      return null as T;
    }
  }

  /**
   * Check if this parser can handle the given response.
   *
   * Validates:
   * - Response success status
   * - Content-Type headers for JSON
   * - Body content for valid JSON structure
   *
   * @param response - The communication response to check
   * @returns true if the response can be parsed as JSON
   */
  canHandle(response: CommunicationResponse): boolean {
    // Check if response was successful
    if (!response.success) {
      return false;
    }

    // Check Content-Type header if available
    if (response.headers && !this.hasJsonContentType(response.headers)) {
      return false;
    }

    // Check if body contains valid JSON
    return this.isValidJson(response.body);
  }

  /**
   * Check if the response has a JSON Content-Type header.
   *
   * Accepts various JSON content types:
   * - application/json
   * - text/json
   * - application/ld+json
   * - application/vnd.api+json
   *
   * @param headers - Response headers to check
   * @returns true if Content-Type indicates JSON
   */
  private hasJsonContentType(headers: Record<string, string>): boolean {
    const contentType = Object.keys(headers).find(
      (key) => key.toLowerCase() === "content-type"
    );

    if (!contentType) {
      // No Content-Type header - allow parsing attempt
      return true;
    }

    const value = headers[contentType].toLowerCase();
    return (
      value.includes("application/json") ||
      value.includes("text/json") ||
      value.includes("application/ld+json") ||
      value.includes("application/vnd.api+json")
    );
  }

  /**
   * Validate if a string contains valid JSON.
   *
   * @param body - String to validate
   * @returns true if the string is valid JSON
   */
  private isValidJson(body: string): boolean {
    if (!body || body.trim() === "") {
      return false;
    }

    try {
      JSON.parse(body);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get a descriptive reason why parsing failed.
   *
   * @param response - The response that failed parsing
   * @returns Human-readable error reason
   */
  private getParsingErrorReason(response: CommunicationResponse): string {
    if (!response.success) {
      return `Response was not successful (status: ${response.status})`;
    }

    if (response.headers && !this.hasJsonContentType(response.headers)) {
      const contentType = Object.keys(response.headers).find(
        (key) => key.toLowerCase() === "content-type"
      );
      const value = contentType ? response.headers[contentType] : "unknown";
      return `Content-Type '${value}' is not a JSON type`;
    }

    if (!response.body || response.body.trim() === "") {
      return "Response body is empty";
    }

    if (!this.isValidJson(response.body)) {
      return "Response body is not valid JSON";
    }

    return "Unknown parsing error";
  }

  /**
   * Validate parsed JSON against a schema.
   *
   * Basic schema validation - checks for required properties and types.
   * For more complex validation, consider using a JSON schema library.
   *
   * @param data - Parsed JSON data to validate
   * @param schema - Schema to validate against
   * @throws Error if validation fails
   */
  private validateAgainstSchema(
    data: unknown,
    schema: Record<string, unknown>
  ): void {
    if (typeof data !== "object" || data === null) {
      throw new Error("Parsed data is not an object");
    }

    // Basic validation - check required properties exist
    if (schema.required && Array.isArray(schema.required)) {
      const dataObj = data as Record<string, unknown>;
      for (const prop of schema.required) {
        if (typeof prop === "string" && !(prop in dataObj)) {
          throw new Error(`Required property '${prop}' is missing`);
        }
      }
    }

    // Additional schema validation could be added here
    // For production use, consider integrating a proper JSON schema validator
  }

  /**
   * Create a new JsonResponseParser with different options.
   *
   * @param options - Parser options to use
   * @returns New parser instance with the specified options
   */
  static create<T = unknown>(
    options: JsonParserOptions = {}
  ): JsonResponseParser<T> {
    return new JsonResponseParser<T>(options);
  }

  /**
   * Create a parser that doesn't throw on errors.
   *
   * @returns Parser that returns null instead of throwing
   */
  static createSafe<T = unknown>(): JsonResponseParser<T> {
    return new JsonResponseParser<T>({ throwOnError: false });
  }

  /**
   * Create a parser with schema validation.
   *
   * @param schema - JSON schema to validate against
   * @returns Parser with schema validation enabled
   */
  static createWithSchema<T = unknown>(
    schema: Record<string, unknown>
  ): JsonResponseParser<T> {
    return new JsonResponseParser<T>({ schema, validate: true });
  }
}
