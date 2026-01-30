import type { ConfigurationManager } from "../types.js";

export interface MockConfigurationManagerOptions {
  /** Whether validation should succeed */
  isValid?: boolean;
  /** Validation errors to return */
  validationErrors?: string[];
  /** Default configuration values */
  defaults?: Record<string, unknown>;
  /** Configuration schema */
  schema?: Record<string, unknown>;
}

export class MockConfigurationManager implements ConfigurationManager {
  private readonly options: MockConfigurationManagerOptions;
  private readonly validationHistory: unknown[] = [];

  constructor(options: MockConfigurationManagerOptions = {}) {
    this.options = {
      isValid: true,
      validationErrors: [],
      defaults: {},
      schema: {},
      ...options,
    };
  }

  validate(config: unknown): boolean {
    // Record the config for testing
    this.validationHistory.push(config);
    return this.options.isValid ?? true;
  }

  getValidationErrors(config: unknown): string[] {
    // Record the config for testing
    this.validationHistory.push(config);
    return this.options.validationErrors ?? [];
  }

  getDefaults(): Record<string, unknown> {
    return { ...this.options.defaults };
  }

  mergeWithDefaults(config: unknown): Record<string, unknown> {
    const defaults = this.getDefaults();

    if (!config || typeof config !== "object") {
      return defaults;
    }

    return {
      ...defaults,
      ...(config as Record<string, unknown>),
    };
  }

  getSchema(): Record<string, unknown> {
    return { ...this.options.schema };
  }

  /**
   * Get history of all validation calls for testing assertions
   */
  getValidationHistory(): unknown[] {
    return [...this.validationHistory];
  }

  /**
   * Get the last config validated by this manager
   */
  getLastValidatedConfig(): unknown {
    return this.validationHistory.at(-1);
  }

  /**
   * Clear validation history
   */
  clearHistory(): void {
    this.validationHistory.length = 0;
  }

  /**
   * Update mock options for subsequent calls
   */
  updateOptions(options: Partial<MockConfigurationManagerOptions>): void {
    Object.assign(this.options, options);
  }
}
