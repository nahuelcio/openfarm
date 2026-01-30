import type { CommunicationStrategy, CommunicationRequest, CommunicationResponse } from '../types.js';

export interface MockCommunicationOptions {
  /** Mock response to return */
  response?: Partial<CommunicationResponse>;
  /** Delay in milliseconds before responding */
  delay?: number;
  /** Whether to simulate connection failure */
  shouldFail?: boolean;
  /** Error message to throw if shouldFail is true */
  errorMessage?: string;
  /** Whether testConnection should succeed */
  connectionAvailable?: boolean;
}

export class MockCommunicationStrategy implements CommunicationStrategy {
  readonly type = 'mock';
  
  private readonly options: MockCommunicationOptions;
  private readonly executionHistory: CommunicationRequest[] = [];

  constructor(options: MockCommunicationOptions = {}) {
    this.options = {
      connectionAvailable: true,
      shouldFail: false,
      delay: 0,
      errorMessage: 'Mock communication failure',
      response: {
        status: 200,
        success: true,
        body: 'Mock response',
        duration: 100
      },
      ...options
    };
  }

  async execute(request: CommunicationRequest): Promise<CommunicationResponse> {
    // Record the request for testing
    this.executionHistory.push({ ...request });

    // Simulate delay if specified
    if (this.options.delay && this.options.delay > 0) {
      await new Promise(resolve => setTimeout(resolve, this.options.delay));
    }

    // Simulate failure if specified
    if (this.options.shouldFail) {
      throw new Error(this.options.errorMessage);
    }

    // Return mock response
    const defaultResponse: CommunicationResponse = {
      status: 200,
      success: true,
      body: 'Mock response',
      duration: this.options.delay || 0
    };

    return {
      ...defaultResponse,
      ...this.options.response
    };
  }

  async testConnection(): Promise<boolean> {
    return this.options.connectionAvailable ?? true;
  }

  /**
   * Get history of all execute calls for testing assertions
   */
  getExecutionHistory(): CommunicationRequest[] {
    return [...this.executionHistory];
  }

  /**
   * Get the last request made to this strategy
   */
  getLastRequest(): CommunicationRequest | undefined {
    return this.executionHistory[this.executionHistory.length - 1];
  }

  /**
   * Clear execution history
   */
  clearHistory(): void {
    this.executionHistory.length = 0;
  }

  /**
   * Update mock options for subsequent calls
   */
  updateOptions(options: Partial<MockCommunicationOptions>): void {
    Object.assign(this.options, options);
  }
}