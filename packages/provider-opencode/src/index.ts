export { OpenCodeProviderFactory } from "./opencode-factory";
export { OpenCodeProvider } from "./opencode-provider";
export type { OpenCodeConfig } from "./types";

export function getAvailableModels(): string[] {
  return [
    "opencode/gpt-5-nano",
    "opencode/grok-code-fast-1",
    "gpt-5-mini",
    "gpt-4o",
    "gpt-4o-mini",
    "zai/glm-4.7",
    "zai/glm-4-flash",
  ];
}
