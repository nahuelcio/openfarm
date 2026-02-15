import { MODEL_ALIASES } from "@openfarm/config";
import { generateText, type LanguageModel } from "ai";
import { StatisticsCollector } from "@openfarm/utils";

function createOpenRouterModel(
  apiKey: string,
  modelId: string,
  baseUrl?: string
): LanguageModel {
  // OpenRouter is OpenAI-compatible, use dynamic import to avoid issues
  const { createOpenAI } = require("@ai-sdk/openai");
  const base = baseUrl || "https://openrouter.ai/api/v1";
  return createOpenAI({
    apiKey,
    baseURL: base,
  })(modelId);
}

function createAnthropicModel(apiKey: string, modelId: string): LanguageModel {
  const { createAnthropic } = require("@ai-sdk/anthropic");
  return createAnthropic({ apiKey })(modelId);
}

function createOpenAIModel(
  apiKey: string,
  modelId: string,
  baseUrl?: string
): LanguageModel {
  const { createOpenAI } = require("@ai-sdk/openai");
  return createOpenAI({ apiKey, baseURL: baseUrl })(modelId);
}

function createZaiModel(apiKey: string, modelId: string): LanguageModel {
  const { createOpenAI } = require("@ai-sdk/openai");
  return createOpenAI({
    apiKey,
    baseURL: "https://api.z.ai/api/paas/v4",
  })(modelId);
}

function createCopilotModel(
  apiKey: string,
  modelId: string,
  apiBase?: string
): LanguageModel {
  const { createOpenAI } = require("@ai-sdk/openai");
  const base =
    apiBase || process.env.OPENCODE_API_BASE || "http://127.0.0.1:4096/v1";
  return createOpenAI({ apiKey, baseURL: base })(modelId);
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
  const resolvedModel = MODEL_ALIASES[model] || model;

  switch (provider) {
    case "anthropic": {
      if (!apiKey) {
        throw new Error("Anthropic API key is required");
      }
      const modelId = resolvedModel || "claude-sonnet-4-20250514";
      return createAnthropicModel(apiKey, modelId);
    }
    case "openrouter": {
      if (!apiKey) {
        throw new Error("OpenRouter API key is required");
      }
      const modelId = resolvedModel || "openai/gpt-4o-mini";
      return createOpenRouterModel(apiKey, modelId, apiBase);
    }
    case "openai": {
      if (!apiKey) {
        throw new Error("OpenAI API key is required");
      }
      const modelId = resolvedModel || "gpt-4o-mini";
      return createOpenAIModel(apiKey, modelId, apiBase);
    }
    case "zai": {
      if (!apiKey) {
        throw new Error("Zai API key is required");
      }
      const modelId = resolvedModel || "zai";
      return createZaiModel(apiKey, modelId);
    }
    case "copilot":
    case "opencode": {
      // Copilot uses OpenCode local server, apiKey may not be needed if token is in env
      const modelId = resolvedModel || "copilot";
      return createCopilotModel(apiKey || "", modelId, apiBase);
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
    /** Execution statistics */
    statistics?: {
      creditsSpent: number;
      toolCalls: number;
      model: string;
      filesChanged: number;
      terminalsCreated: number;
      requestId: string;
      tokensInput: number;
      tokensOutput: number;
      duration: number;
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

    // Initialize statistics collector
    const statsCollector = new StatisticsCollector(provider.model);

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

      const promptTokens = usageResult?.promptTokens ?? 0;
      const completionTokens = usageResult?.completionTokens ?? 0;
      
      const statistics = statsCollector.getStatistics(promptTokens, completionTokens);

      return {
        text: result.text,
        provider: provider.provider,
        model: provider.model,
        usage: usageResult
          ? {
              promptTokens,
              completionTokens,
              totalTokens: usageResult.totalTokens ?? 0,
            }
          : undefined,
        statistics,
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
    statistics?: {
      creditsSpent: number;
      toolCalls: number;
      model: string;
      filesChanged: number;
      terminalsCreated: number;
      requestId: string;
      tokensInput: number;
      tokensOutput: number;
      duration: number;
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
