import type { ProviderMetadata } from "@openfarm/sdk";

export const AIDER_DEFAULT_TIMEOUT = 600_000;

export const AIDER_CONFIG_SCHEMA = {
  type: "object",
  properties: {
    timeout: {
      type: "number",
      default: AIDER_DEFAULT_TIMEOUT,
      minimum: 1000,
      description: "Timeout in milliseconds",
    },
  },
  required: [],
  additionalProperties: false,
};

const AIDER_SUPPORTED_FEATURES = [
  "code-generation",
  "code-editing",
  "refactoring",
  "debugging",
  "git-integration",
  "streaming",
] as const;

export function createAiderMetadata(): ProviderMetadata {
  return {
    type: "aider",
    name: "Aider",
    version: "1.0.0",
    description:
      "Aider AI pair programming assistant - works directly with your codebase",
    packageName: "@openfarm/provider-aider",
    supportedFeatures: [...AIDER_SUPPORTED_FEATURES],
    configSchema: AIDER_CONFIG_SCHEMA,
    requiresExternal: true,
  };
}
