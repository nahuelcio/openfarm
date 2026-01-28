/**
 * LLM Service - Pure abstraction for text completion using Vercel AI SDK
 *
 * @example
 * ```typescript
 * import { LlmService, LlmCompletionParams } from './llm';
 *
 * const llm = new LlmService();
 *
 * const result = await llm.complete({
 *   prompt: "Hello!",
 *   systemPrompt: "You are a helpful assistant.",
 *   provider: { provider: "anthropic", model: "claude-sonnet-4", apiKey: "..." }
 * });
 * ```
 */
export { LlmError, LlmService, llmService } from "./llm-service";
export type {
  LlmCompletionParams,
  LlmCompletionResult,
  LlmError as LlmErrorType,
  LlmProviderConfig,
} from "./types";
