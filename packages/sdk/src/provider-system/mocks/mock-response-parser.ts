import type { CommunicationResponse, ResponseParser } from "../types.js";

export interface MockResponseParserOptions<T = unknown> {
  /** Mock parsed result to return */
  result?: T;
  /** Whether parsing should fail */
  shouldFail?: boolean;
  /** Error message to throw if shouldFail is true */
  errorMessage?: string;
  /** Whether canHandle should return true */
  canHandleResponse?: boolean;
  /** Delay in milliseconds before returning result */
  delay?: number;
}

export class MockResponseParser<T = unknown> implements ResponseParser<T> {
  readonly type = "mock";

  private readonly options: MockResponseParserOptions<T>;
  private readonly parseHistory: CommunicationResponse[] = [];

  constructor(options: MockResponseParserOptions<T> = {}) {
    this.options = {
      canHandleResponse: true,
      shouldFail: false,
      errorMessage: "Mock parsing failure",
      delay: 0,
      result: "Mock parsed result" as T,
      ...options,
    };
  }

  async parse(response: CommunicationResponse): Promise<T> {
    // Record the response for testing
    this.parseHistory.push({ ...response });

    // Simulate delay if specified
    if (this.options.delay && this.options.delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.options.delay));
    }

    // Simulate failure if specified
    if (this.options.shouldFail) {
      throw new Error(this.options.errorMessage);
    }

    // Return mock result
    return this.options.result as T;
  }

  canHandle(response: CommunicationResponse): boolean {
    return this.options.canHandleResponse ?? true;
  }

  /**
   * Get history of all parse calls for testing assertions
   */
  getParseHistory(): CommunicationResponse[] {
    return [...this.parseHistory];
  }

  /**
   * Get the last response parsed by this parser
   */
  getLastResponse(): CommunicationResponse | undefined {
    return this.parseHistory.at(-1);
  }

  /**
   * Clear parse history
   */
  clearHistory(): void {
    this.parseHistory.length = 0;
  }

  /**
   * Update mock options for subsequent calls
   */
  updateOptions(options: Partial<MockResponseParserOptions<T>>): void {
    Object.assign(this.options, options);
  }
}
