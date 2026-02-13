import type {
  Provider,
  ProviderFactory,
  ProviderMetadata,
} from "../provider-system/types.js";
import {
  type ExternalAgentConfig,
  ExternalAgentProvider,
} from "./external-agent-provider.js";

export class ExternalAgentProviderFactory implements ProviderFactory {
  getMetadata(): ProviderMetadata {
    return {
      type: "external-agent",
      name: "External Agent Provider",
      version: "1.0.0",
      description:
        "Connect external CLI agents (Claude, Codex, Aider) via output parsing",
      supportedFeatures: [
        "external-cli",
        "output-parsing",
        "inter-agent-messaging",
        "relay-compatibility",
      ],
      packageName: undefined, // Built-in provider
    };
  }

  canCreate(type: string): boolean {
    return type === "external-agent";
  }

  create(config?: unknown): Provider {
    // Provide default configuration if none provided
    const defaultConfig: ExternalAgentConfig = {
      type: "external-agent",
      cli: "claude",
      args: [],
      relayCompatibility: true,
      injectionMode: "auto",
      idleTimeout: 1500,
      pollInterval: 200,
    };

    // Merge with provided config, ensuring type is always set
    const finalConfig: ExternalAgentConfig = config
      ? {
          ...defaultConfig,
          ...(config as ExternalAgentConfig),
          type: "external-agent",
        }
      : defaultConfig;

    return new ExternalAgentProvider(finalConfig);
  }
}
