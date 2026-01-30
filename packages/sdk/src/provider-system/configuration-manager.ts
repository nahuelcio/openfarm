/**
 * Configuration manager implementation with JSON schema validation.
 *
 * This module provides robust configuration validation using Zod schemas,
 * support for provider-specific extensions, and descriptive error messages.
 */

import { z, type ZodSchema, type ZodError } from "zod";
import type { ConfigurationManager, ProviderConfig } from "./types";

/**
 * Base configuration schema that all provider configs must extend.
 */
export const BaseConfigSchema = z.object({
  type: z.string().min(1, "Provider type is required"),
  timeout: z.number().positive().optional().default(600_000), // 10 minutes
  retries: z.number().int().min(0).max(10).optional().default(3),
  verbose: z.boolean().optional().default(false),
});

/**
 * Configuration validation error with detailed information.
 */
export class ConfigurationValidationError extends Error {
  constructor(
    message: string,
    public readonly errors: string[],
    public readonly config: unknown
  ) {
    super(message);
    this.name = "ConfigurationValidationError";
  }
}

/**
 * Concrete implementation of ConfigurationManager using Zod for validation.
 * Provides schema validation, error reporting, and configuration merging.
 */
export class ZodConfigurationManager implements ConfigurationManager {
  private readonly schema: ZodSchema;
  private readonly defaults: Record<string, unknown>;

  /**
   * Create a new configuration manager with the given schema.
   * 
   * @param schema - Zod schema for validation (should extend BaseConfigSchema)
   * @param defaults - Default configuration values
   */
  constructor(
    schema: ZodSchema = BaseConfigSchema,
    defaults: Record<string, unknown> = {}
  ) {
    this.schema = schema;
    
    // Only get defaults from optional fields, not required ones
    try {
      // Try to parse with empty object to get defaults for optional fields only
      const parsedDefaults = BaseConfigSchema.partial().parse({});
      this.defaults = {
        ...parsedDefaults,
        ...defaults,
      };
    } catch (error) {
      // Fallback to just the provided defaults
      this.defaults = { ...defaults };
    }
  }

  /**
   * Validate configuration against the schema.
   * Returns true if valid, false otherwise.
   */
  validate(config: unknown): boolean {
    try {
      this.schema.parse(config);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get detailed validation errors for invalid configuration.
   * Returns array of human-readable error messages.
   */
  getValidationErrors(config: unknown): string[] {
    try {
      this.schema.parse(config);
      return [];
    } catch (error) {
      if (error instanceof z.ZodError) {
        return this.formatZodErrors(error);
      }
      return [`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`];
    }
  }

  /**
   * Get default configuration values.
   */
  getDefaults(): Record<string, unknown> {
    return { ...this.defaults };
  }

  /**
   * Merge configuration with defaults, applying validation.
   * Throws ConfigurationValidationError if the merged config is invalid.
   */
  mergeWithDefaults(config: unknown): Record<string, unknown> {
    const merged = {
      ...this.defaults,
      ...(typeof config === 'object' && config !== null ? config : {}),
    };

    const errors = this.getValidationErrors(merged);
    if (errors.length > 0) {
      throw new ConfigurationValidationError(
        `Configuration validation failed: ${errors.join(', ')}`,
        errors,
        merged
      );
    }

    // Parse with schema to get proper types and defaults
    return this.schema.parse(merged) as Record<string, unknown>;
  }

  /**
   * Get the configuration schema.
   */
  getSchema(): Record<string, unknown> {
    // Convert Zod schema to JSON Schema-like representation
    return this.zodSchemaToJsonSchema(this.schema);
  }

  /**
   * Create a new configuration manager with extended schema.
   * Useful for provider-specific configuration extensions.
   */
  extend(extensionSchema: ZodSchema, additionalDefaults?: Record<string, unknown>): ZodConfigurationManager {
    // Merge the base schema with the extension
    const extendedSchema = this.schema.and(extensionSchema);
    
    const extendedDefaults = {
      ...this.defaults,
      ...(additionalDefaults || {}),
    };

    return new ZodConfigurationManager(extendedSchema, extendedDefaults);
  }

  /**
   * Validate and parse configuration, throwing detailed errors on failure.
   */
  validateAndParse<T = Record<string, unknown>>(config: unknown): T {
    try {
      return this.schema.parse(config) as T;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = this.formatZodErrors(error);
        throw new ConfigurationValidationError(
          `Configuration validation failed: ${errors.join(', ')}`,
          errors,
          config
        );
      }
      throw error;
    }
  }

  /**
   * Format Zod validation errors into human-readable messages.
   */
  private formatZodErrors(error: ZodError): string[] {
    return error.issues.map((err: any) => {
      const path = err.path.length > 0 ? err.path.join('.') : 'root';
      
      switch (err.code) {
        case 'invalid_type':
          return `${path}: Expected ${err.expected}, received ${err.received}`;
        
        case 'too_small':
          if (err.type === 'string') {
            return `${path}: Must be at least ${err.minimum} characters long`;
          }
          if (err.type === 'number') {
            return `${path}: Must be at least ${err.minimum}`;
          }
          return `${path}: Value is too small (minimum: ${err.minimum})`;
        
        case 'too_big':
          if (err.type === 'string') {
            return `${path}: Must be at most ${err.maximum} characters long`;
          }
          if (err.type === 'number') {
            return `${path}: Must be at most ${err.maximum}`;
          }
          return `${path}: Value is too big (maximum: ${err.maximum})`;
        
        case 'invalid_string':
          return `${path}: Invalid string format (${err.validation})`;
        
        case 'custom':
          return `${path}: ${err.message}`;
        
        default:
          return `${path}: ${err.message}`;
      }
    });
  }

  /**
   * Convert Zod schema to a JSON Schema-like representation.
   * This is a simplified conversion for basic schema introspection.
   */
  private zodSchemaToJsonSchema(schema: ZodSchema): Record<string, unknown> {
    // This is a simplified implementation
    // In a production system, you might want to use a library like zod-to-json-schema
    
    if (schema instanceof z.ZodObject) {
      const shape = schema.shape;
      const properties: Record<string, unknown> = {};
      const required: string[] = [];

      for (const [key, value] of Object.entries(shape)) {
        properties[key] = this.zodTypeToJsonSchema(value as ZodSchema);
        
        // Check if field is required (not optional)
        if (!(value as any).isOptional()) {
          required.push(key);
        }
      }

      return {
        type: 'object',
        properties,
        required: required.length > 0 ? required : undefined,
      };
    }

    return this.zodTypeToJsonSchema(schema);
  }

  /**
   * Convert individual Zod types to JSON Schema representation.
   */
  private zodTypeToJsonSchema(schema: ZodSchema): Record<string, unknown> {
    if (schema instanceof z.ZodString) {
      return { type: 'string' };
    }
    
    if (schema instanceof z.ZodNumber) {
      return { type: 'number' };
    }
    
    if (schema instanceof z.ZodBoolean) {
      return { type: 'boolean' };
    }
    
    if (schema instanceof z.ZodArray) {
      return {
        type: 'array',
        items: this.zodTypeToJsonSchema((schema as any).element),
      };
    }
    
    if (schema instanceof z.ZodOptional) {
      return this.zodTypeToJsonSchema((schema as any).unwrap());
    }
    
    if (schema instanceof z.ZodDefault) {
      const inner = this.zodTypeToJsonSchema((schema as any).removeDefault());
      return {
        ...inner,
        default: (schema as any)._def.defaultValue(),
      };
    }

    // Fallback for unknown types
    return { type: 'unknown' };
  }
}

/**
 * Create a configuration manager for a specific provider type.
 * Provides a convenient factory function with type safety.
 */
export function createProviderConfigManager<T extends ProviderConfig>(
  providerType: string,
  extensionSchema?: ZodSchema,
  defaults?: Partial<T>
): ZodConfigurationManager {
  // Create base schema with provider type validation
  const baseSchema = BaseConfigSchema.extend({
    type: z.literal(providerType),
  });

  // Extend with provider-specific schema if provided
  const finalSchema = extensionSchema 
    ? baseSchema.and(extensionSchema)
    : baseSchema;

  const finalDefaults = {
    type: providerType,
    ...defaults,
  };

  return new ZodConfigurationManager(finalSchema, finalDefaults);
}

/**
 * Common configuration schemas for different provider types.
 */
export const CommonSchemas = {
  /**
   * Schema for HTTP-based providers.
   */
  http: z.object({
    baseUrl: z.string().url("Must be a valid URL"),
    apiKey: z.string().min(1, "API key is required").optional(),
    headers: z.record(z.string(), z.string()).optional().default({}),
    timeout: z.number().positive().optional(),
  }),

  /**
   * Schema for CLI-based providers.
   */
  cli: z.object({
    executable: z.string().min(1, "Executable path is required"),
    args: z.array(z.string()).optional().default([]),
    workingDirectory: z.string().optional(),
    env: z.record(z.string(), z.string()).optional().default({}),
  }),

  /**
   * Schema for providers that support both local and cloud modes.
   */
  hybrid: z.object({
    mode: z.enum(['local', 'cloud'], {
      message: "Mode must be either 'local' or 'cloud'"
    }),
    // Local mode settings
    executable: z.string().optional(),
    // Cloud mode settings  
    baseUrl: z.string().url().optional(),
    apiKey: z.string().optional(),
  }).refine(
    (data) => {
      if (data.mode === 'local') {
        return !!data.executable;
      }
      if (data.mode === 'cloud') {
        return !!data.baseUrl;
      }
      return true;
    },
    {
      message: "Local mode requires 'executable', cloud mode requires 'baseUrl'",
      path: ['mode'],
    }
  ),
};

/**
 * Pre-configured configuration managers for common provider types.
 */
export const ConfigManagers = {
  /**
   * Configuration manager for HTTP-based providers.
   */
  http: (providerType: string, defaults?: Record<string, unknown>) =>
    createProviderConfigManager(providerType, CommonSchemas.http, defaults),

  /**
   * Configuration manager for CLI-based providers.
   */
  cli: (providerType: string, defaults?: Record<string, unknown>) =>
    createProviderConfigManager(providerType, CommonSchemas.cli, defaults),

  /**
   * Configuration manager for hybrid (local/cloud) providers.
   */
  hybrid: (providerType: string, defaults?: Record<string, unknown>) =>
    createProviderConfigManager(providerType, CommonSchemas.hybrid, defaults),

  /**
   * Basic configuration manager with only base schema.
   */
  basic: (providerType: string, defaults?: Record<string, unknown>) =>
    createProviderConfigManager(providerType, undefined, defaults),
};