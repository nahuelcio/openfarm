import type {
  CommunicationStrategy,
  ConfigurationManager,
  Provider,
  ProviderFactory,
  ProviderMetadata,
} from "@openfarm/sdk";
import {
  CliCommunicationStrategy,
  createProviderConfigManager,
  HttpCommunicationStrategy,
} from "@openfarm/sdk";
import { OpenCodeProvider } from "./opencode-provider.js";

const _OpenCodeConfigSchema = {
  type: "object",
  properties: {
    mode: { type: "string", enum: ["local", "cloud"] },
    baseUrl: { type: "string" },
    password: { type: "string" },
    timeout: { type: "number", default: 600_000, minimum: 1000 },
  },
  required: [],
};

export class OpenCodeProviderFactory implements ProviderFactory {
  private readonly metadata: ProviderMetadata = {
    type: "opencode",
    name: "OpenCode",
    version: "1.0.0",
    description: "OpenCode AI coding assistant",
    packageName: "@openfarm/provider-opencode",
    supportedFeatures: [
      "code-generation",
      "code-editing",
      "debugging",
      "refactoring",
    ],
    requiresExternal: true,
  };

  getMetadata(): ProviderMetadata {
    return { ...this.metadata };
  }

  canCreate(type: string): boolean {
    return type === "opencode";
  }

  create(config?: unknown): Provider {
    const parsedConfig = this.parseConfig(config);
    const strategy = this.createCommunicationStrategy(parsedConfig);
    const configManager = this.createConfigManager(parsedConfig);

    return new OpenCodeProvider(strategy, null, configManager, parsedConfig);
  }

  private parseConfig(config?: unknown): {
    mode: "local" | "cloud";
    baseUrl?: string;
    password?: string;
    timeout: number;
  } {
    const defaults = {
      mode: "local" as const,
      timeout: 600_000,
    };

    if (!config || typeof config !== "object") {
      return defaults;
    }

    const c = config as Record<string, unknown>;
    return {
      mode: (c.mode as "local" | "cloud") || defaults.mode,
      baseUrl: c.baseUrl as string | undefined,
      password: c.password as string | undefined,
      timeout: (c.timeout as number) || defaults.timeout,
    };
  }

  private createCommunicationStrategy(config: {
    mode: "local" | "cloud";
    baseUrl?: string;
    password?: string;
    timeout: number;
  }): CommunicationStrategy {
    // LOCAL: usa opencode CLI directamente
    if (config.mode === "local") {
      return new CliCommunicationStrategy({
        executable: "opencode",
        timeout: config.timeout,
      });
    }

    // CLOUD: usa HTTP API
    if (!config.baseUrl) {
      throw new Error("baseUrl required for cloud mode");
    }

    return new HttpCommunicationStrategy({
      baseUrl: config.baseUrl,
      timeout: config.timeout,
      auth: config.password
        ? {
            type: "basic",
            username: "opencode",
            password: config.password,
          }
        : undefined,
    });
  }

  private createConfigManager(config: {
    timeout: number;
  }): ConfigurationManager {
    return createProviderConfigManager("opencode", undefined, {
      timeout: config.timeout,
    });
  }
}
