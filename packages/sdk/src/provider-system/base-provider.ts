/**
 * Abstract base provider class implementing common functionality.
 *
 * This class provides the template method pattern for provider execution,
 * standardized error handling, and common utilities that all providers can use.
 */

import type { ExecutionOptions, ExecutionResult } from "../types";
import type {
  CommunicationRequest,
  CommunicationStrategy,
  ConfigurationManager,
  Provider,
  ProviderCapabilities,
  ProviderError,
  ProviderErrorType,
  ResponseParser,
} from "./types";

/**
 * Abstract base class that all providers should extend.
 * Implements the template method pattern for consistent execution flow.
 */
export abstract class BaseProvider implements Provider {
  /** Provider type identifier - must be implemented by subclasses */
  abstract readonly type: string;

  /** Provider name - must be implemented by subclasses */
  abstract readonly name: string;

  protected readonly communicationStrategy: CommunicationStrategy;
  protected readonly responseParser: ResponseParser;
  protected readonly configManager: ConfigurationManager;

  constructor(
    communicationStrategy: CommunicationStrategy,
    responseParser: ResponseParser,
    configManager: ConfigurationManager
  ) {
    this.communicationStrategy = communicationStrategy;
    this.responseParser = responseParser;
    this.configManager = configManager;
  }

  /**
   * Template method implementing the standard execution flow.
   * Subclasses should not override this method - instead implement the abstract methods.
   */
  async execute(options: ExecutionOptions): Promise<ExecutionResult> {
    const startTime = Date.now();

    try {
      // Step 1: Validate configuration
      this.validateExecutionOptions(options);

      // Step 2: Prepare the communication request
      const request = await this.prepareRequest(options);

      // Step 3: Execute via communication strategy
      const response = await this.communicationStrategy.execute(request);

      // Step 4: Check if communication was successful
      if (!response.success) {
        throw this.createError(
          "communication",
          "COMMUNICATION_FAILED",
          `Communication failed with status ${response.status}`,
          { response }
        );
      }

      // Step 5: Parse the response
      const parsedResult = await this.responseParser.parse(response);

      // Step 6: Format the final result
      const result = await this.formatResult(
        parsedResult,
        response,
        Date.now() - startTime
      );

      return result;
    } catch (error) {
      return this.handleError(error, Date.now() - startTime);
    }
  }

  /**
   * Test connection using the communication strategy.
   * Can be overridden by subclasses for custom connection testing.
   */
  async testConnection(): Promise<boolean> {
    try {
      return await this.communicationStrategy.testConnection();
    } catch (error) {
      this.logError("Connection test failed", error);
      return false;
    }
  }

  /**
   * Validate configuration using the configuration manager.
   * Can be overridden by subclasses for additional validation.
   */
  validateConfig(config: unknown): boolean {
    try {
      return this.configManager.validate(config);
    } catch (error) {
      this.logError("Configuration validation failed", error);
      return false;
    }
  }

  /**
   * Get provider capabilities.
   * Should be implemented by subclasses to describe their capabilities.
   */
  abstract getCapabilities(): ProviderCapabilities;

  // Abstract methods that subclasses must implement

  /**
   * Prepare the communication request from execution options.
   * This is where provider-specific logic for request preparation goes.
   */
  protected abstract prepareRequest(
    options: ExecutionOptions
  ): Promise<CommunicationRequest>;

  /**
   * Format the parsed result into the final execution result.
   * This is where provider-specific result formatting logic goes.
   */
  protected abstract formatResult(
    parsedResult: unknown,
    response: any,
    duration: number
  ): Promise<ExecutionResult>;

  // Protected utility methods for subclasses

  /**
   * Validate execution options before processing.
   * Can be overridden by subclasses for additional validation.
   */
  protected validateExecutionOptions(options: ExecutionOptions): void {
    if (!options.task || options.task.trim().length === 0) {
      throw this.createError(
        "validation",
        "INVALID_TASK",
        "Task is required and cannot be empty"
      );
    }

    if (options.maxTokens && options.maxTokens < 1) {
      throw this.createError(
        "validation",
        "INVALID_MAX_TOKENS",
        "Max tokens must be positive"
      );
    }

    if (
      options.temperature &&
      (options.temperature < 0 || options.temperature > 2)
    ) {
      throw this.createError(
        "validation",
        "INVALID_TEMPERATURE",
        "Temperature must be between 0 and 2"
      );
    }
  }

  /**
   * Handle errors that occur during execution.
   * Provides standardized error formatting and logging.
   */
  protected handleError(error: unknown, duration: number): ExecutionResult {
    const providerError = this.normalizeError(error);

    this.logError("Execution failed", providerError);

    return {
      success: false,
      output: "",
      error: providerError.message,
      duration,
      // Include additional error details for debugging
      ...(providerError.details && { details: providerError.details }),
    };
  }

  /**
   * Create a standardized provider error.
   */
  protected createError(
    type: ProviderErrorType,
    code: string,
    message: string,
    details?: Record<string, unknown>,
    cause?: Error
  ): ProviderError {
    const error = new Error(message) as ProviderError;
    error.type = type;
    error.code = code;
    error.details = details;
    error.cause = cause;
    return error;
  }

  /**
   * Normalize any error into a ProviderError.
   */
  protected normalizeError(error: unknown): ProviderError {
    if (this.isProviderError(error)) {
      return error;
    }

    if (error instanceof Error) {
      return this.createError(
        "provider",
        "UNKNOWN_ERROR",
        error.message,
        undefined,
        error
      );
    }

    const message =
      typeof error === "string" ? error : "Unknown error occurred";
    return this.createError("provider", "UNKNOWN_ERROR", message);
  }

  /**
   * Type guard to check if an error is a ProviderError.
   */
  protected isProviderError(error: unknown): error is ProviderError {
    return error instanceof Error && "type" in error && "code" in error;
  }

  /**
   * Log error messages. Can be overridden by subclasses for custom logging.
   */
  protected logError(message: string, error: unknown): void {
    // In a real implementation, this would use a proper logging system
    console.error(`[${this.type}] ${message}:`, error);
  }

  /**
   * Log debug messages. Can be overridden by subclasses for custom logging.
   */
  protected logDebug(message: string, data?: unknown): void {
    // Only log in verbose mode or development
    if (process.env.NODE_ENV === "development") {
      console.debug(`[${this.type}] ${message}`, data || "");
    }
  }

  /**
   * Get configuration value with type safety.
   */
  protected getConfigValue<T>(key: string, defaultValue: T): T {
    try {
      const config = this.configManager.getDefaults();
      return (config[key] as T) ?? defaultValue;
    } catch {
      return defaultValue;
    }
  }

  /**
   * Merge execution options with provider defaults.
   */
  protected mergeWithDefaults(options: ExecutionOptions): ExecutionOptions {
    const defaults = {
      temperature: 0.7,
      maxTokens: 30_000,
      stream: false,
      verbose: false,
      retries: 3,
      timeout: 600_000, // 10 minutes
    };

    return {
      ...defaults,
      ...options,
    };
  }

  /**
   * Extract provider-specific options from execution options.
   */
  protected extractProviderOptions(
    options: ExecutionOptions
  ): Record<string, unknown> {
    // Extract any options that start with the provider type
    const providerPrefix = `${this.type}.`;
    const providerOptions: Record<string, unknown> = {};

    Object.entries(options).forEach(([key, value]) => {
      if (key.startsWith(providerPrefix)) {
        const optionKey = key.substring(providerPrefix.length);
        providerOptions[optionKey] = value;
      }
    });

    return providerOptions;
  }
}
