/**
 * Stream Response Parser for OpenFarm Provider System.
 *
 * Provides line-by-line parsing for streaming responses with mixed content.
 * Handles JSON events mixed with plain text output from CLI tools like Aider and OpenCode.
 */

import type {
  CommunicationResponse,
  ResponseParser,
} from "../provider-system/types";
import type { StreamParserOptions } from "./types";

/**
 * Parsed stream event with metadata.
 */
export interface StreamEvent {
  /** Original line content */
  raw: string;

  /** Parsed JSON data (if line is valid JSON) */
  data?: unknown;

  /** Whether this line contains valid JSON */
  isJson: boolean;

  /** Line number in the stream (0-based) */
  lineNumber: number;

  /** Whether this line was filtered out */
  filtered?: boolean;
}

/**
 * Result of stream parsing operation.
 */
export interface StreamParseResult {
  /** All parsed events */
  events: StreamEvent[];

  /** Only JSON events */
  jsonEvents: StreamEvent[];

  /** Only plain text lines */
  textLines: StreamEvent[];

  /** Total number of lines processed */
  totalLines: number;

  /** Number of valid JSON events found */
  jsonCount: number;

  /** Number of plain text lines found */
  textCount: number;

  /** Number of empty/filtered lines */
  filteredCount: number;
}

/**
 * Parser for streaming responses with line-by-line JSON event detection.
 *
 * Features:
 * - Line-by-line parsing with configurable separators
 * - Automatic JSON event detection and parsing
 * - Mixed content handling (JSON events + plain text)
 * - Configurable line filtering and transformation
 * - Empty line and whitespace handling
 * - Robust error handling for malformed JSON in streams
 * - Detailed parsing statistics and metadata
 */
export class StreamResponseParser implements ResponseParser<StreamParseResult> {
  readonly type = "stream";

  private readonly options: Required<StreamParserOptions>;

  constructor(options: StreamParserOptions = {}) {
    this.options = {
      separator: options.separator ?? "\n",
      skipEmpty: options.skipEmpty ?? true,
      trim: options.trim ?? true,
      filter: options.filter ?? (() => true),
      transform: options.transform ?? ((line: string) => line),
    };
  }

  /**
   * Parse a streaming communication response into structured events.
   *
   * @param response - The communication response to parse
   * @returns Promise resolving to parsed stream result with events and metadata
   */
  async parse(response: CommunicationResponse): Promise<StreamParseResult> {
    if (!this.canHandle(response)) {
      throw new Error(
        `Cannot parse response: ${this.getParsingErrorReason(response)}`
      );
    }

    // Handle empty responses
    if (!response.body || response.body.trim() === "") {
      return this.createEmptyResult();
    }

    // Split response into lines
    const lines = this.splitIntoLines(response.body);

    // Process each line
    const events: StreamEvent[] = [];
    let filteredCount = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Apply trimming if enabled
      const processedLine = this.options.trim ? line.trim() : line;

      // Skip empty lines if configured
      if (this.options.skipEmpty && processedLine === "") {
        filteredCount++;
        continue;
      }

      // Apply custom filter
      if (!this.options.filter(processedLine)) {
        filteredCount++;
        events.push({
          raw: line,
          isJson: false,
          lineNumber: i,
          filtered: true,
        });
        continue;
      }

      // Apply transformation
      const transformedLine = this.options.transform(processedLine);
      const finalLine =
        typeof transformedLine === "string" ? transformedLine : processedLine;

      // Try to parse as JSON
      const event = this.parseLineAsEvent(finalLine, i);
      events.push(event);
    }

    return this.createResult(events, filteredCount);
  }

  /**
   * Check if this parser can handle the given response.
   *
   * Stream parser can handle any successful response with content.
   * It's designed to be permissive and handle mixed content.
   *
   * @param response - The communication response to check
   * @returns true if the response can be parsed as a stream
   */
  canHandle(response: CommunicationResponse): boolean {
    // Must be successful
    if (!response.success) {
      return false;
    }

    // Must have content
    if (!response.body || response.body.trim() === "") {
      return false;
    }

    // Stream parser is permissive - it can handle any text content
    return true;
  }

  /**
   * Split response body into lines using the configured separator.
   *
   * @param body - Response body to split
   * @returns Array of lines
   */
  private splitIntoLines(body: string): string[] {
    // Handle different line separators
    if (this.options.separator === "\n") {
      // Handle both \n and \r\n
      return body.split(/\r?\n/);
    }

    return body.split(this.options.separator);
  }

  /**
   * Parse a single line as a stream event.
   *
   * @param line - Line to parse
   * @param lineNumber - Line number in the stream
   * @returns Stream event with parsed data
   */
  private parseLineAsEvent(line: string, lineNumber: number): StreamEvent {
    const event: StreamEvent = {
      raw: line,
      isJson: false,
      lineNumber,
    };

    // Try to parse as JSON
    if (this.looksLikeJson(line)) {
      try {
        event.data = JSON.parse(line);
        event.isJson = true;
      } catch {
        // Not valid JSON, treat as plain text
        event.isJson = false;
      }
    }

    return event;
  }

  /**
   * Check if a line looks like it might be JSON.
   *
   * This is a quick heuristic check before attempting JSON.parse.
   *
   * @param line - Line to check
   * @returns true if line might be JSON
   */
  private looksLikeJson(line: string): boolean {
    const trimmed = line.trim();

    // Must start and end with JSON delimiters
    return (
      (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
      (trimmed.startsWith("[") && trimmed.endsWith("]")) ||
      trimmed === "null" ||
      trimmed === "true" ||
      trimmed === "false" ||
      /^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(trimmed) || // Numbers
      (trimmed.startsWith('"') && trimmed.endsWith('"')) // Strings
    );
  }

  /**
   * Create the final parsing result with statistics.
   *
   * @param events - All parsed events
   * @param filteredCount - Number of filtered lines
   * @returns Complete stream parse result
   */
  private createResult(
    events: StreamEvent[],
    filteredCount: number
  ): StreamParseResult {
    const jsonEvents = events.filter((e) => e.isJson && !e.filtered);
    const textLines = events.filter((e) => !(e.isJson || e.filtered));

    return {
      events,
      jsonEvents,
      textLines,
      totalLines: events.length + filteredCount,
      jsonCount: jsonEvents.length,
      textCount: textLines.length,
      filteredCount,
    };
  }

  /**
   * Create an empty result for empty responses.
   *
   * @returns Empty stream parse result
   */
  private createEmptyResult(): StreamParseResult {
    return {
      events: [],
      jsonEvents: [],
      textLines: [],
      totalLines: 0,
      jsonCount: 0,
      textCount: 0,
      filteredCount: 0,
    };
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

    if (!response.body || response.body.trim() === "") {
      return "Response body is empty";
    }

    return "Unknown parsing error";
  }

  /**
   * Create a new StreamResponseParser with different options.
   *
   * @param options - Parser options to use
   * @returns New parser instance with the specified options
   */
  static create(options: StreamParserOptions = {}): StreamResponseParser {
    return new StreamResponseParser(options);
  }

  /**
   * Create a parser optimized for JSON-only events (filters out plain text).
   *
   * @returns Parser that only processes JSON events
   */
  static createJsonOnly(): StreamResponseParser {
    return new StreamResponseParser({
      filter: (line) => {
        const trimmed = line.trim();
        return (
          (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
          (trimmed.startsWith("[") && trimmed.endsWith("]"))
        );
      },
    });
  }

  /**
   * Create a parser with custom line transformation.
   *
   * @param transform - Function to transform each line
   * @returns Parser with custom transformation
   */
  static createWithTransform(
    transform: (line: string) => unknown
  ): StreamResponseParser {
    return new StreamResponseParser({ transform });
  }

  /**
   * Create a parser with custom line separator.
   *
   * @param separator - Line separator to use
   * @returns Parser with custom separator
   */
  static createWithSeparator(separator: string): StreamResponseParser {
    return new StreamResponseParser({ separator });
  }

  /**
   * Create a parser that preserves empty lines and whitespace.
   *
   * @returns Parser that doesn't filter empty lines or trim whitespace
   */
  static createPreserveWhitespace(): StreamResponseParser {
    return new StreamResponseParser({
      skipEmpty: false,
      trim: false,
    });
  }
}
