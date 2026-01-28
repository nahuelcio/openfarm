/** OpenCode/Copilot model definitions. */
export const OPENCODE_MODELS = {
  // Primary models
  "gpt-5-mini": {
    id: "gpt-4o-mini",
    name: "GPT-5 Mini",
    provider: "openai",
  },
  "gpt-4o-mini": {
    id: "gpt-4o-mini",
    name: "GPT-4o Mini",
    provider: "openai",
  },
  "gpt-4o": {
    id: "gpt-4o",
    name: "GPT-4o",
    provider: "openai",
  },

  // OpenCode specific
  "gpt-5-nano": {
    id: "opencode/gpt-5-nano",
    name: "GPT-5 Nano (OpenCode)",
    provider: "opencode",
  },
  "grok-code-fast": {
    id: "opencode/grok-code-fast-1",
    name: "Grok Code Fast",
    provider: "opencode",
  },

  // ZAI models
  "glm-4-7": {
    id: "zai/glm-4.7",
    name: "GLM 4.7",
    provider: "zai",
  },
  "glm-4-flash": {
    id: "zai/glm-4-flash",
    name: "GLM 4 Flash",
    provider: "zai",
  },
} as const;

/** List of all OpenCode model IDs. */
export const OPENCODE_MODEL_IDS = Object.values(OPENCODE_MODELS).map(
  (m) => m.id
);

/** List of supported OpenCode models. */
export const OPENCODE_SUPPORTED_MODELS = [
  OPENCODE_MODELS["gpt-5-nano"].id,
] as const;

/** List of ZAI fallback models. */
export const ZAI_FALLBACK_MODELS = [
  OPENCODE_MODELS["glm-4-7"].id,
  OPENCODE_MODELS["glm-4-flash"].id,
] as const;

/** Default OpenCode model. */
export const OPENCODE_DEFAULT_MODEL = OPENCODE_MODELS["grok-code-fast"].id;

/** Model alias mappings for OpenCode. */
export const OPENCODE_MODEL_ALIASES: Record<string, string> = {
  "gpt-5-mini": OPENCODE_MODELS["gpt-4o-mini"].id,
  "gpt-4o-mini": OPENCODE_MODELS["gpt-4o-mini"].id,
  "gpt-4o": OPENCODE_MODELS["gpt-4o"].id,
};

export type OpenCodeModelKey = keyof typeof OPENCODE_MODELS;
export type OpenCodeModelId = (typeof OPENCODE_MODEL_IDS)[number];
