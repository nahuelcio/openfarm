import type { Provider, ProviderMetadata } from "@openfarm/sdk";

export class ClaudeProviderFactory {
  constructor();
  getMetadata(): ProviderMetadata {
    return {
      type: "claude",
      name: "Claude",
      version: "1.0.0",
      description: "Claude Code assistant",
      packageName: "@openfarm/provider-claude",
      supportedFeatures: [
        "code-generation",
        "code-editing",
        "refactoring",
        "debugging",
      ],
      requiresExternal: true,
    };
  }

  canCreate(type: string): boolean {
    return type === "claude";
  }

  create(config?: unknown): Provider {
    // Placeholder implementation
    // TODO: Implement actual Claude provider
    throw new Error("Claude provider not yet implemented");
  }
}
