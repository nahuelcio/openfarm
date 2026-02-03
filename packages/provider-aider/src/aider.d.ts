import type { Provider, ProviderMetadata } from "@openfarm/sdk";

export class AiderProviderFactory {
  constructor();
  getMetadata(): ProviderMetadata {
    return {
      type: "aider",
      name: "Aider",
      version: "1.0.0",
      description: "Aider AI pair programming assistant",
      packageName: "@openfarm/provider-aider",
      supportedFeatures: [
        "code-generation",
        "code-editing",
        "refactoring",
      ],
      requiresExternal: true,
    };
  }

  canCreate(type: string): boolean {
    return type === "aider";
  }

  create(config?: unknown): Provider {
    // Placeholder implementation
    // TODO: Implement actual Aider provider
    throw new Error("Aider provider not yet implemented");
  }
}
