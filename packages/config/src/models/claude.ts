/** Claude model definitions. */
export const CLAUDE_MODELS = {
  "claude-sonnet-4": {
    id: "claude-sonnet-4-20250514",
    name: "Claude Sonnet 4",
    provider: "anthropic",
  },
  "claude-opus-4": {
    id: "claude-opus-4-20250514",
    name: "Claude Opus 4",
    provider: "anthropic",
  },
  "claude-3-5-sonnet": {
    id: "claude-sonnet-4-20250514",
    name: "Claude 3.5 Sonnet",
    provider: "anthropic",
  },
} as const;

/** List of all Claude model IDs. */
export const CLAUDE_MODEL_IDS = Object.values(CLAUDE_MODELS).map((m) => m.id);

/** List of supported Claude models. */
export const CLAUDE_SUPPORTED_MODELS = [
  CLAUDE_MODELS["claude-sonnet-4"].id,
] as const;

/** Default Claude model. */
export const CLAUDE_DEFAULT_MODEL = CLAUDE_MODELS["claude-sonnet-4"].id;

/** Model alias mappings for Claude. */
export const CLAUDE_MODEL_ALIASES: Record<string, string> = {
  "claude-sonnet-4": CLAUDE_MODELS["claude-sonnet-4"].id,
  "claude-opus-4": CLAUDE_MODELS["claude-opus-4"].id,
  "claude-3-5-sonnet": CLAUDE_MODELS["claude-3-5-sonnet"].id,
};

export type ClaudeModelKey = keyof typeof CLAUDE_MODELS;
export type ClaudeModelId = (typeof CLAUDE_MODEL_IDS)[number];
