/**
 * Direct API Provider for OpenFarm Provider System.
 *
 * Handles direct communication with AI provider APIs (OpenAI, Anthropic, etc.)
 * using HTTP requests. This is a simple provider that stays in the core SDK.
 */

import { z } from "zod";
import { JsonResponseParser } from "../parsers/json-parser";
import { BaseProvider } from "../provider-system/base-provider";
import { ZodConfigurationManager } from "../provider-system/configuration-manager";
import type {
  CommunicationRequest,
  CommunicationResponse,
  ProviderCapabilities,
  ProviderConfig,
} from "../provider-system/types";
import { HttpCommunicationStrategy } from "../strategies/http-strategy";
import type { ExecutionOptions, ExecutionResult } from "../types";

/**
 * Configuration interface for Direct API Provider.
 */
export interface DirectApiConfig extends ProviderConfig {
  type: "direct-api";

  /** API endpoint URL */
  apiUrl: string;

  /** API key for authentication */
  apiKey?: string;

  /** Default model to use */
  model?: string;

  /** API version */
  version?: string;

  /** Custom headers */
  headers?: Record<string, string>;
}

/**
 * Direct API Provider implementation.
 *
 * Provides direct communication with AI APIs using HTTP requests.
 * Supports various AI providers through configurable endpoints and authentication.
 */
export class DirectApiProvider extends BaseProvider {
  readonly type = "direct-api";
  readonly name = "Direct API Provider";

  private readonly config: DirectApiConfig;

  constructor(config: DirectApiConfig) {
    // Create HTTP strategy with API configuration
    const httpStrategy = new HttpCommunicationStrategy({
      baseUrl: config.apiUrl,
      defaultHeaders: {
        "Content-Type": "application/json",
        ...(config.apiKey && { Authorization: `Bearer ${config.apiKey}` }),
        ...config.headers,
      },
      timeout: config.timeout || 30_000,
      retries: config.retries || 3,
      auth: config.apiKey
        ? {
            type: "bearer",
            token: config.apiKey,
          }
        : undefined,
    });

    // Create JSON parser for API responses
    const jsonParser = new JsonResponseParser();

    // Create configuration manager
    const configManager = new ZodConfigurationManager(
      z.object({
        type: z.literal("direct-api"),
        apiUrl: z.string().url("Must be a valid URL"),
        apiKey: z.string().optional(),
        model: z.string().optional(),
        version: z.string().optional(),
        headers: z.record(z.string(), z.string()).optional(),
        timeout: z.number().min(1000).optional(),
        retries: z.number().min(0).max(10).optional(),
      })
    );

    super(httpStrategy, jsonParser, configManager);
    this.config = config;
  }

  /**
   * Prepare HTTP request for AI API execution.
   */
  protected async prepareRequest(
    options: ExecutionOptions
  ): Promise<CommunicationRequest> {
    // Build the request payload for AI API
    const payload = {
      model: options.model || this.config.model || "gpt-3.5-turbo",
      messages: [
        {
          role: "user",
          content: this.buildPrompt(options),
        },
      ],
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 30_000,
      stream: options.stream ?? false,
    };

    // Determine the endpoint based on API type
    const endpoint = this.getExecutionEndpoint();

    return {
      endpoint,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(this.config.version && { "OpenAI-Version": this.config.version }),
      },
      body: payload,
      timeout: this.config.timeout,
    };
  }

  /**
   * Format the API response into ExecutionResult.
   */
  protected async formatResult(
    parsedResult: any,
    response: CommunicationResponse,
    duration: number
  ): Promise<ExecutionResult> {
    try {
      // Handle different API response formats
      const output = this.extractOutput(parsedResult);
      const tokens = this.extractTokenUsage(parsedResult);

      return {
        success: true,
        output,
        duration,
        tokens,
      };
    } catch (error) {
      return {
        success: false,
        output: "",
        error: `Failed to format result: ${error instanceof Error ? error.message : "Unknown error"}`,
        duration,
      };
    }
  }

  /**
   * Get provider capabilities.
   */
  getCapabilities(): ProviderCapabilities {
    return {
      executionModes: ["direct-api", "streaming"],
      fileTypes: ["*"], // Can handle any file type through context
      supportsStreaming: true,
      supportsLocal: false, // Requires API access
      requiresInternet: true,
      features: [
        "chat-completion",
        "code-generation",
        "text-analysis",
        "streaming-response",
      ],
    };
  }

  /**
   * Test connection to the API endpoint.
   */
  async testConnection(): Promise<boolean> {
    try {
      // Try a simple request to test connectivity
      const testRequest: CommunicationRequest = {
        endpoint: this.getHealthEndpoint(),
        method: "GET",
        timeout: 5000,
      };

      const response = await this.communicationStrategy.execute(testRequest);
      return response.success || response.status < 500;
    } catch (error) {
      this.logError("Connection test failed", error);
      return false;
    }
  }

  /**
   * Build the prompt from execution options.
   */
  private buildPrompt(options: ExecutionOptions): string {
    let prompt = options.task;

    if (options.context) {
      prompt = `Context:\n${options.context}\n\nTask:\n${prompt}`;
    }

    if (options.workspace) {
      prompt = `Working in: ${options.workspace}\n\n${prompt}`;
    }

    return prompt;
  }

  /**
   * Get the execution endpoint based on API configuration.
   */
  private getExecutionEndpoint(): string {
    // Default to OpenAI-compatible chat completions endpoint
    return "/v1/chat/completions";
  }

  /**
   * Get the health check endpoint.
   */
  private getHealthEndpoint(): string {
    return "/v1/models";
  }

  /**
   * Extract output text from API response.
   */
  private extractOutput(response: any): string {
    // Handle OpenAI-style response
    if (
      response.choices &&
      Array.isArray(response.choices) &&
      response.choices.length > 0
    ) {
      const choice = response.choices[0];

      // Handle chat completion format
      if (choice.message?.content) {
        return choice.message.content;
      }

      // Handle legacy completion format
      if (choice.text) {
        return choice.text;
      }
    }

    // Handle Anthropic-style response
    if (
      response.content &&
      Array.isArray(response.content) &&
      response.content.length > 0
    ) {
      const content = response.content[0];
      if (content.text) {
        return content.text;
      }
    }

    // Handle simple text response
    if (typeof response === "string") {
      return response;
    }

    // Handle direct text field
    if (response.text) {
      return response.text;
    }

    // Fallback to JSON string
    return JSON.stringify(response, null, 2);
  }

  /**
   * Extract token usage from API response.
   */
  private extractTokenUsage(response: any): number | undefined {
    // OpenAI format
    if (response.usage?.total_tokens) {
      return response.usage.total_tokens;
    }

    // Anthropic format
    if (response.usage?.input_tokens && response.usage.output_tokens) {
      return response.usage.input_tokens + response.usage.output_tokens;
    }

    return undefined;
  }

  /**
   * Log error with provider context.
   */
  protected logError(message: string, error: unknown): void {
    console.error(`[DirectApiProvider] ${message}:`, error);
  }
}
