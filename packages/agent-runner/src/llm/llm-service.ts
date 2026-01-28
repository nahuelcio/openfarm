import { MODEL_ALIASES } from "@openfarm/config";
import { generateText, type LanguageModel } from "ai";

function createOpenRouterModel(
  apiKey: string,
  baseUrl?: string
): LanguageModel {
  // OpenRouter is OpenAI-compatible, use dynamic import to avoid issues
  const { OpenAI } = require("@ai-sdk/openai");
  const base = baseUrl || "https://openrouter.ai/api/v1";
  return new OpenAI({
    apiKey,
    baseURL: base,
  })("openrouter");
}

function createAnthropicModel(apiKey: string): LanguageModel {
  const { Anthropic } = require("@ai-sdk/anthropic");
  return new Anthropic({ apiKey })("claude-sonnet-4-20250514");
}

function createOpenAIModel(apiKey: string, baseUrl?: string): LanguageModel {
  const { OpenAI } = require("@ai-sdk/openai");
  return new OpenAI({ apiKey, baseURL: baseUrl })("gpt-4o-mini");
}

function createZaiModel(apiKey: string): LanguageModel {
  const { OpenAI } = require("@ai-sdk/openai");
  return new OpenAI({
    apiKey,
    baseURL: "https://api.z.ai/api/paas/v4",
  })("zai");
}

function createCopilotModel(apiKey: string, apiBase?: string): LanguageModel {
  const { OpenAI } = require("@ai-sdk/openai");
  const base =
    apiBase || process.env.OPENCODE_API_BASE || "http://127.0.0.1:4096/v1";
  return new OpenAI({ apiKey, baseURL: base })("copilot");
}

/**
 * Get a model instance for the given provider configuration
 */
function getModel(config: {
  provider: string;
  model: string;
  apiKey?: string;
  apiBase?: string;
}): LanguageModel {
  const { provider, model, apiKey, apiBase } = config;

  // Map model names to the correct model IDs for each provider
  const _resolvedModel = MODEL_ALIASES[model] || model;

  switch (provider) {
    case "anthropic": {
      if (!apiKey) {
        throw new Error("Anthropic API key is required");
      }
      return createAnthropicModel(apiKey);
    }
    case "openrouter": {
      if (!apiKey) {
        throw new Error("OpenRouter API key is required");
      }
      return createOpenRouterModel(apiKey, apiBase);
    }
    case "openai": {
      if (!apiKey) {
        throw new Error("OpenAI API key is required");
      }
      return createOpenAIModel(apiKey, apiBase);
    }
    case "zai": {
      if (!apiKey) {
        throw new Error("Zai API key is required");
      }
      return createZaiModel(apiKey);
    }
    case "copilot":
    case "opencode": {
      // Copilot uses OpenCode local server, apiKey may not be needed if token is in env
      return createCopilotModel(apiKey || "", apiBase);
    }
    default: {
      throw new Error(
        `Unsupported provider: ${provider}. Supported providers: copilot, anthropic, openrouter, openai, zai`
      );
    }
  }
}

/**
 * LLM Service - Pure abstraction for text completion using Vercel AI SDK
 *
 * This service provides a clean interface for calling any LLM provider
 * using the Vercel AI SDK's standardized API.
 *
 * Usage:
 * ```typescript
 * const llm = new LlmService();
 *
 * const result = await llm.complete({
 *   prompt: "Hello, world!",
 *   systemPrompt: "You are a helpful assistant.",
 *   provider: { provider: "anthropic", model: "claude-sonnet-4", apiKey: "..." }
 * });
 *
 * console.log(result.text);
 * ```
 */
export class LlmService {
  /**
   * Generate a text completion for the given prompt
   */
  async complete(params: {
    /** The user prompt */
    prompt: string;
    /** System prompt to set behavior */
    systemPrompt?: string;
    /** Provider configuration */
    provider: {
      provider: string;
      model: string;
      apiKey?: string;
      apiBase?: string;
    };
    /** Temperature for generation (0-1), default 0.7 */
    temperature?: number;
    /** Abort signal for cancellation */
    abortSignal?: AbortSignal;
    /** Timeout in milliseconds, default 60000 */
    timeout?: number;
  }): Promise<{
    /** Generated text */
    text: string;
    /** Provider used */
    provider: string;
    /** Model used */
    model: string;
    /** Token usage information if available */
    usage?: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
  }> {
    const {
      prompt,
      systemPrompt,
      provider,
      temperature = 0.7,
      abortSignal,
      timeout,
    } = params;

    try {
      const model = getModel(provider);

      const result = await generateText({
        model,
        system: systemPrompt,
        prompt,
        temperature,
        abortSignal:
          abortSignal || (timeout ? AbortSignal.timeout(timeout) : undefined),
      });

      const usageResult = result.usage as
        | {
            promptTokens?: number;
            completionTokens?: number;
            totalTokens?: number;
          }
        | undefined;

      return {
        text: result.text,
        provider: provider.provider,
        model: provider.model,
        usage: usageResult
          ? {
              promptTokens: usageResult.promptTokens ?? 0,
              completionTokens: usageResult.completionTokens ?? 0,
              totalTokens: usageResult.totalTokens ?? 0,
            }
          : undefined,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new LlmError(
        `LLM request failed: ${message}`,
        provider.provider,
        provider.model,
        error
      );
    }
  }

  /**
   * Create a configured completion function for repeated calls
   * Useful when making multiple requests with the same configuration
   */
  createRunner(config: {
    provider: {
      provider: string;
      model: string;
      apiKey?: string;
      apiBase?: string;
    };
    systemPrompt?: string;
    temperature?: number;
    timeout?: number;
  }): (
    prompt: string,
    abortSignal?: AbortSignal
  ) => Promise<{
    text: string;
    provider: string;
    model: string;
    usage?: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
  }> {
    return async (prompt: string, abortSignal?: AbortSignal) => {
      return this.complete({
        prompt,
        systemPrompt: config.systemPrompt,
        provider: config.provider,
        temperature: config.temperature,
        abortSignal,
        timeout: config.timeout,
      });
    };
  }
}

/**
 * Error class for LLM operations with context
 */
export class LlmError extends Error {
  constructor(
    message: string,
    public readonly provider: string,
    public readonly model: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "LlmError";
  }
}

/**
 * Default instance for convenience
 */
export const llmService = new LlmService();
