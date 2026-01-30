import type { Provider, ProviderMetadata } from '../types.js';
import type { ExecutionOptions, ExecutionResult } from '../../types.js';

export interface MockProviderOptions {
  /** Provider type identifier */
  type?: string;
  /** Provider name */
  name?: string;
  /** Mock execution result */
  executionResult?: ExecutionResult;
  /** Whether execution should fail */
  shouldFail?: boolean;
  /** Error message to throw if shouldFail is true */
  errorMessage?: string;
  /** Whether testConnection should succeed */
  connectionAvailable?: boolean;
  /** Whether config validation should succeed */
  configValid?: boolean;
  /** Delay in milliseconds before returning result */
  delay?: number;
  /** Provider metadata */
  metadata?: Partial<ProviderMetadata>;
}

export class MockProvider implements Provider {
  readonly type: string;
  readonly name: string;
  
  private readonly options: MockProviderOptions;
  private readonly executionHistory: ExecutionOptions[] = [];
  private readonly configValidationHistory: unknown[] = [];

  constructor(options: MockProviderOptions = {}) {
    this.options = {
      type: 'mock',
      name: 'Mock Provider',
      connectionAvailable: true,
      configValid: true,
      shouldFail: false,
      errorMessage: 'Mock provider failure',
      delay: 0,
      executionResult: {
        success: true,
        output: 'Mock execution completed successfully',
        duration: 100
      },
      metadata: {},
      ...options
    };

    this.type = this.options.type!;
    this.name = this.options.name!;
  }

  async execute(options: ExecutionOptions): Promise<ExecutionResult> {
    // Record the options for testing
    this.executionHistory.push({ ...options });

    // Simulate delay if specified
    if (this.options.delay && this.options.delay > 0) {
      await new Promise(resolve => setTimeout(resolve, this.options.delay));
    }

    // Simulate failure if specified
    if (this.options.shouldFail) {
      throw new Error(this.options.errorMessage);
    }

    // Return mock result
    return {
      ...this.options.executionResult!
    };
  }

  async testConnection(): Promise<boolean> {
    return this.options.connectionAvailable ?? true;
  }

  validateConfig(config: unknown): boolean {
    // Record the config for testing
    this.configValidationHistory.push(config);
    return this.options.configValid ?? true;
  }

  /**
   * Get provider metadata (for compatibility with some tests)
   */
  getMetadata(): ProviderMetadata {
    return {
      type: this.type,
      name: this.name,
      version: '1.0.0',
      description: 'Mock provider for testing',
      supportedFeatures: ['testing', 'mocking'],
      ...this.options.metadata
    };
  }

  /**
   * Get history of all execute calls for testing assertions
   */
  getExecutionHistory(): ExecutionOptions[] {
    return [...this.executionHistory];
  }

  /**
   * Get the last execution options used
   */
  getLastExecution(): ExecutionOptions | undefined {
    return this.executionHistory[this.executionHistory.length - 1];
  }

  /**
   * Get history of all config validation calls
   */
  getConfigValidationHistory(): unknown[] {
    return [...this.configValidationHistory];
  }

  /**
   * Clear all history
   */
  clearHistory(): void {
    this.executionHistory.length = 0;
    this.configValidationHistory.length = 0;
  }

  /**
   * Update mock options for subsequent calls
   */
  updateOptions(options: Partial<MockProviderOptions>): void {
    Object.assign(this.options, options);
  }
}