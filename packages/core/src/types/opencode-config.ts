/**
 * OpenCode Configuration Types
 *
 * Defines the structure for OpenCode Server (LLM Gateway) and TUI (Code Execution) configuration.
 * Supports shared providers with per-context overrides.
 * @see https://opencode.ai/docs/providers
 */

/**
 * Supported LLM providers
 * Based on OpenCode's provider directory: https://opencode.ai/docs/providers
 */
export type OpenCodeProvider =
  | "copilot" // GitHub Copilot - uses device code OAuth
  | "anthropic" // Anthropic Claude - API key or Claude Pro/Max OAuth
  | "openai" // OpenAI - API key or ChatGPT Plus/Pro OAuth
  | "openrouter" // OpenRouter - multi-provider gateway
  | "opencode" // OpenCode Zen - curated models
  | "groq" // Groq - fast inference
  | "deepseek" // DeepSeek - reasoning models
  | "google-vertex" // Google Vertex AI
  | "amazon-bedrock" // Amazon Bedrock
  | "azure-openai" // Azure OpenAI
  | "fireworks" // Fireworks AI
  | "together" // Together AI
  | "ollama" // Ollama - local models
  | "cerebras" // Cerebras - fast inference
  | "xai" // xAI - Grok models
  | "zai"; // Z.AI - GLM-4.7 models

/** Configuration for a single provider */
export interface ProviderConfig {
  enabled: boolean;
  apiBase?: string;
  apiKey?: string;
  token?: string;
}

/** Provider status with connection info (for API responses) */
export interface ProviderStatus {
  enabled: boolean;
  apiBase?: string;
  hasApiKey: boolean;
  hasToken: boolean;
  connected?: boolean;
}

/** MCP server configuration */
export interface McpServerConfig {
  name: string;
  command: string;
  args: string[];
  enabled: boolean;
}

/** Server-specific configuration (LLM Gateway) */
export interface ServerConfig {
  defaultProvider: OpenCodeProvider;
  defaultModel: string;
  mcpServers?: McpServerConfig[];
  overrides?: {
    [provider in OpenCodeProvider]?: {
      apiKey?: string;
    };
  };
}

/** Server config for API responses (secrets masked) */
export interface ServerConfigStatus {
  defaultProvider: OpenCodeProvider;
  defaultModel: string;
  mcpServers?: McpServerConfig[];
  overrides?: {
    [provider in OpenCodeProvider]?: {
      hasApiKey: boolean;
    };
  };
}

/** TUI-specific configuration (Code Execution) */
export interface TuiConfig {
  defaultProvider: OpenCodeProvider;
  defaultModel: string;
  maxIterations: number;
  timeoutSeconds: number;
  mcpServers?: McpServerConfig[];
  overrides?: {
    [provider in OpenCodeProvider]?: {
      apiKey?: string;
    };
  };
}

/** TUI config for API responses (secrets masked) */
export interface TuiConfigStatus {
  defaultProvider: OpenCodeProvider;
  defaultModel: string;
  maxIterations: number;
  timeoutSeconds: number;
  mcpServers?: McpServerConfig[];
  overrides?: {
    [provider in OpenCodeProvider]?: {
      hasApiKey: boolean;
    };
  };
}

/** Complete OpenCode configuration */
export interface OpenCodeConfig {
  providers: Record<OpenCodeProvider, ProviderConfig>;
  server: ServerConfig;
  tui: TuiConfig;
}

/** Complete config for API responses (secrets masked) */
export interface OpenCodeConfigStatus {
  providers: Record<OpenCodeProvider, ProviderStatus>;
  server: ServerConfigStatus;
  tui: TuiConfigStatus;
}

/** Default configuration values */
export const OPENCODE_DEFAULTS = {
  server: {
    defaultProvider: "zai" as OpenCodeProvider,
    defaultModel: "zai/glm-4.7",
  },
  tui: {
    defaultProvider: "zai" as OpenCodeProvider,
    defaultModel: "zai/glm-4.7",
    maxIterations: 5,
    timeoutSeconds: 300,
  },
} as const;

/** All available providers for iteration */
export const ALL_PROVIDERS: OpenCodeProvider[] = [
  "copilot",
  "anthropic",
  "openai",
  "openrouter",
  "opencode",
  "groq",
  "deepseek",
  "google-vertex",
  "amazon-bedrock",
  "azure-openai",
  "fireworks",
  "together",
  "ollama",
  "cerebras",
  "xai",
  "zai",
];

/** Providers that use OAuth device code flow */
export const OAUTH_PROVIDERS: OpenCodeProvider[] = ["copilot"];

/** Providers that use API key authentication */
export const API_KEY_PROVIDERS: OpenCodeProvider[] = [
  "anthropic",
  "openai",
  "openrouter",
  "opencode",
  "groq",
  "deepseek",
  "fireworks",
  "together",
  "cerebras",
  "xai",
  "zai",
];

/** Providers that run locally (no auth needed) */
export const LOCAL_PROVIDERS: OpenCodeProvider[] = ["ollama"];

/** Providers that use cloud-specific auth (AWS/GCP/Azure) */
export const CLOUD_PROVIDERS: OpenCodeProvider[] = [
  "google-vertex",
  "amazon-bedrock",
  "azure-openai",
];

/** Human-readable provider names */
export const PROVIDER_NAMES: Record<OpenCodeProvider, string> = {
  copilot: "GitHub Copilot",
  anthropic: "Anthropic",
  openai: "OpenAI",
  openrouter: "OpenRouter",
  opencode: "OpenCode Zen",
  groq: "Groq",
  deepseek: "DeepSeek",
  "google-vertex": "Google Vertex AI",
  "amazon-bedrock": "Amazon Bedrock",
  "azure-openai": "Azure OpenAI",
  fireworks: "Fireworks AI",
  together: "Together AI",
  ollama: "Ollama",
  cerebras: "Cerebras",
  xai: "xAI",
  zai: "Z.AI",
};

/** Database config key prefixes */
export const CONFIG_KEY_PREFIXES = {
  providers: "providers",
  server: "server",
  tui: "tui",
} as const;

/** Input types for API requests */
export type UpdateProvidersInput = {
  [K in OpenCodeProvider]?: Partial<ProviderConfig>;
};

export interface UpdateServerConfigInput {
  defaultProvider?: OpenCodeProvider;
  defaultModel?: string;
  mcpServers?: McpServerConfig[];
  overrides?: {
    [provider in OpenCodeProvider]?: {
      apiKey?: string | null; // null to clear
    };
  };
}

export interface UpdateTuiConfigInput {
  defaultProvider?: OpenCodeProvider;
  defaultModel?: string;
  maxIterations?: number;
  timeoutSeconds?: number;
  mcpServers?: McpServerConfig[];
  overrides?: {
    [provider in OpenCodeProvider]?: {
      apiKey?: string | null; // null to clear
    };
  };
}

/** Test provider result */
export interface ProviderTestResult {
  success: boolean;
  provider: OpenCodeProvider;
  message: string;
  details?: {
    modelsAvailable?: number;
    responseTimeMs?: number;
  };
}
