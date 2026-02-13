/**
 * AI Service for Chat
 *
 * Real AI integration using OpenFarm's provider system.
 * Supports OpenAI, Anthropic, and other providers.
 */

import { DirectApiProvider } from "../../providers/direct-api-provider";
import type { WarpMessage } from "@openfarm/core/db";

export type AIProvider = "openai" | "anthropic" | "openrouter" | "local";

export interface AIServiceConfig {
  provider: AIProvider;
  apiKey: string;
  model?: string;
  apiUrl?: string;
}

export interface ChatCompletionOptions {
  messages: Array<{ role: "user" | "assistant" | "system"; content: string }>;
  stream?: boolean;
  onChunk?: (chunk: string) => void;
}

/**
 * AI Service for streaming chat completions
 */
export class AIService {
  private provider: DirectApiProvider | null = null;
  private config: AIServiceConfig;

  constructor(config: AIServiceConfig) {
    this.config = config;
    this.initializeProvider();
  }

  private initializeProvider(): void {
    const { provider, apiKey, model, apiUrl } = this.config;

    // Provider-specific defaults
    const providerDefaults: Record<AIProvider, { url: string; model: string }> =
      {
        openai: {
          url: "https://api.openai.com",
          model: "gpt-4o-mini",
        },
        anthropic: {
          url: "https://api.anthropic.com",
          model: "claude-3-sonnet-20240229",
        },
        openrouter: {
          url: "https://openrouter.ai/api",
          model: "anthropic/claude-3.5-sonnet",
        },
        local: {
          url: "http://localhost:11434",
          model: "llama2",
        },
      };

    const defaults = providerDefaults[provider];

    this.provider = new DirectApiProvider({
      type: "direct-api",
      apiUrl: apiUrl || defaults.url,
      apiKey,
      model: model || defaults.model,
      headers:
        provider === "anthropic"
          ? { "anthropic-version": "2023-06-01" }
          : provider === "openrouter"
            ? {
                "HTTP-Referer": "https://openfarm.dev",
                "X-Title": "OpenFarm TUI",
              }
            : undefined,
    });
  }

  /**
   * Test connection to AI provider
   */
  async testConnection(): Promise<boolean> {
    if (!this.provider) return false;
    return this.provider.testConnection();
  }

  /**
   * Stream chat completion
   */
  async *streamChatCompletion(
    options: ChatCompletionOptions
  ): AsyncGenerator<string, void, unknown> {
    if (!this.provider) {
      throw new Error("AI provider not initialized");
    }

    const { messages, onChunk } = options;

    try {
      // For streaming, we need to use the provider's streaming capability
      // This is a simplified version - full implementation would use SSE
      const result = await this.provider.execute({
        task: messages[messages.length - 1]?.content || "",
        context: this.formatHistory(messages.slice(0, -1)),
        stream: true,
      });

      if (result.success && result.output) {
        // Simulate streaming by yielding chunks
        const output = result.output;
        const chunkSize = 10;

        for (let i = 0; i < output.length; i += chunkSize) {
          const chunk = output.slice(i, i + chunkSize);
          yield chunk;
          onChunk?.(chunk);

          // Small delay for streaming effect
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
      } else {
        throw new Error(result.error || "Unknown error");
      }
    } catch (error) {
      console.error("[AIService] Streaming error:", error);
      throw error;
    }
  }

  /**
   * Non-streaming chat completion
   */
  async chatComplete(options: ChatCompletionOptions): Promise<string> {
    if (!this.provider) {
      throw new Error("AI provider not initialized");
    }

    const { messages } = options;

    try {
      const result = await this.provider.execute({
        task: messages[messages.length - 1]?.content || "",
        context: this.formatHistory(messages.slice(0, -1)),
        stream: false,
      });

      if (result.success) {
        return result.output || "";
      }

      throw new Error(result.error || "Unknown error");
    } catch (error) {
      console.error("[AIService] Chat completion error:", error);
      throw error;
    }
  }

  /**
   * Convert WarpMessages to AI format and stream
   */
  async *streamFromMessages(
    messages: WarpMessage[],
    systemPrompt?: string,
    onChunk?: (chunk: string) => void
  ): AsyncGenerator<string, void, unknown> {
    const formattedMessages: Array<{
      role: "user" | "assistant" | "system";
      content: string;
    }> = [];

    if (systemPrompt) {
      formattedMessages.push({ role: "system", content: systemPrompt });
    }

    for (const msg of messages) {
      formattedMessages.push({
        role: msg.role,
        content: msg.content,
      });
    }

    yield* this.streamChatCompletion({
      messages: formattedMessages,
      onChunk,
    });
  }

  /**
   * Format message history for context
   */
  private formatHistory(
    messages: Array<{ role: "user" | "assistant" | "system"; content: string }>
  ): string {
    return messages.map((m) => `${m.role}: ${m.content}`).join("\n\n");
  }
}

/**
 * Create AI service from environment variables
 */
export function createAIServiceFromEnv(): AIService | null {
  const provider = (process.env.AI_PROVIDER as AIProvider) || "openai";
  const apiKey =
    process.env.AI_API_KEY ||
    process.env.OPENAI_API_KEY ||
    process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    console.warn(
      "[AIService] No API key found. Set AI_API_KEY environment variable."
    );
    return null;
  }

  return new AIService({
    provider,
    apiKey,
    model: process.env.AI_MODEL,
    apiUrl: process.env.AI_API_URL,
  });
}

/**
 * Simple mock service for testing without API keys
 */
export class MockAIService {
  async *streamChatCompletion(): AsyncGenerator<string, void, unknown> {
    const response =
      "This is a mock response. Set AI_API_KEY environment variable to use real AI.";

    for (const char of response) {
      yield char;
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  }

  async chatComplete(): Promise<string> {
    return "This is a mock response. Set AI_API_KEY environment variable to use real AI.";
  }

  async testConnection(): Promise<boolean> {
    return true;
  }
}
