/**
 * Provider configuration for LLM service
 */
export interface LlmProviderConfig {
  /** Provider identifier (e.g., 'anthropic', 'openai', 'copilot') */
  provider: string;
  /** Model identifier (e.g., 'claude-sonnet-4', 'gpt-4o-mini') */
  model: string;
  /** API key for the provider */
  apiKey?: string;
  /** Base URL for API requests (useful for self-hosted providers) */
  apiBase?: string;
}

/**
 * Parameters for a text completion request
 */
export interface LlmCompletionParams {
  /** The user prompt */
  prompt: string;
  /** System prompt to set behavior */
  systemPrompt?: string;
  /** Provider configuration - can be resolved beforehand */
  provider?: LlmProviderConfig;
  /** Temperature for generation (0-1) */
  temperature?: number;
  /** Maximum tokens to generate */
  maxTokens?: number;
  /** Abort signal for cancellation */
  abortSignal?: AbortSignal;
  /** Timeout in milliseconds */
  timeout?: number;
}

/**
 * Result of a text completion
 */
export interface LlmCompletionResult {
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
}

/**
 * Error with context for LLM operations
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
