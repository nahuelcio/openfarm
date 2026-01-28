export {
  CLAUDE_SUPPORTED_MODELS,
  CLAUDE_DEFAULT_MODEL,
  CLAUDE_MODEL_ALIASES,
  CLAUDE_MODEL_IDS,
  CLAUDE_MODELS,
  type ClaudeModelId,
  type ClaudeModelKey,
} from "./claude";

export {
  OPENCODE_DEFAULT_MODEL,
  OPENCODE_MODEL_ALIASES,
  OPENCODE_MODEL_IDS,
  OPENCODE_MODELS,
  OPENCODE_SUPPORTED_MODELS,
  type OpenCodeModelId,
  type OpenCodeModelKey,
  ZAI_FALLBACK_MODELS,
} from "./opencode";

/** Combined model aliases for all providers. */
export const MODEL_ALIASES: Record<string, string> = {
  // Claude aliases
  "claude-sonnet-4": "claude-sonnet-4-20250514",
  "claude-opus-4": "claude-opus-4-20250514",
  "claude-3-5-sonnet": "claude-sonnet-4-20250514",

  // OpenAI aliases
  "gpt-5-mini": "gpt-4o-mini",
  "gpt-4o-mini": "gpt-4o-mini",
  "gpt-4o": "gpt-4o",
};

/** Default fallback model for LLM operations (gpt-4o-mini). */
export const DEFAULT_FALLBACK_LLM_MODEL = "gpt-4o-mini";

/** Resolve a model alias to its full ID. */
export function resolveModelAlias(model: string): string {
  return MODEL_ALIASES[model] ?? model;
}
