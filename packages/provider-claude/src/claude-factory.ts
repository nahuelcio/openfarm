import type {
  CommunicationStrategy,
  ConfigurationManager,
  Provider,
  ProviderFactory,
  ProviderMetadata,
} from "@openfarm/sdk";
import {
  CliCommunicationStrategy,
  ConfigManagers,
  StreamResponseParser,
} from "@openfarm/sdk";
import { ClaudeProvider } from "./claude-provider";

/**
 * Configuration schema for Claude provider
 */
const ClaudeConfigSchema = {
  type: "object",
  properties: {
    timeout: {
      type: "number",
      default: 600_000,
      minimum: 1000,
      description: "Timeout in milliseconds",
    },
  },
  required: [],
  additionalProperties: false,
};

/**
 * Factory for creating ClaudeProvider instances
 */
export class ClaudeProviderFactory implements ProviderFactory {
  private readonly metadata: ProviderMetadata = {
    type: "claude",
    name: "Claude Code",
    version: "1.0.0",
    description:
      "Claude Code AI assistant with advanced code understanding and editing capabilities",
    packageName: "@openfarm/provider-claude",
    supportedFeatures: [
      "code-generation",
      "code-editing",
      "refactoring",
      "debugging",
      "code-analysis",
      "file-operations",
      "bash-execution",
      "web-search",
    ],
    configSchema: ClaudeConfigSchema,
    requiresExternal: true,
  };

  getMetadata(): ProviderMetadata {
    return { ...this.metadata };
  }

  canCreate(type: string): boolean {
    return type === "claude";
  }

  create(config?: unknown): Provider {
    // Validate configuration
    if (config !== undefined && config !== null) {
      this.validateConfig(config);
    }

    // Create dependencies
    const parsedConfig = this.parseConfig(config);
    const communicationStrategy =
      this.createCommunicationStrategy(parsedConfig);
    const responseParser = this.createResponseParser();
    const configManager = this.createConfigurationManager(parsedConfig);

    // Create and return provider
    return new ClaudeProvider(
      communicationStrategy,
      responseParser,
      configManager,
      parsedConfig
    );
  }

  private validateConfig(config: unknown): void {
    if (typeof config !== "object" || config === null) {
      throw new Error("Configuration must be an object");
    }

    const configObj = config as Record<string, unknown>;

    // Validate timeout if provided
    if (configObj.timeout !== undefined) {
      if (typeof configObj.timeout !== "number" || configObj.timeout < 1000) {
        throw new Error("Timeout must be a number >= 1000");
      }
    }
  }

  private parseConfig(config?: unknown): {
    timeout: number;
  } {
    const defaults = {
      timeout: 600_000,
    };

    if (!config || typeof config !== "object") {
      return defaults;
    }

    const configObj = config as Record<string, unknown>;

    return {
      timeout: (configObj.timeout as number) || defaults.timeout,
    };
  }

  private createCommunicationStrategy(config: {
    timeout: number;
  }): CommunicationStrategy {
    return new CliCommunicationStrategy({
      executable: "claude",
      timeout: config.timeout,
    });
  }

  private createResponseParser(): StreamResponseParser {
    return new StreamResponseParser();
  }

  private createConfigurationManager(config: {
    timeout: number;
  }): ConfigurationManager {
    return ConfigManagers.cli("claude", {
      timeout: config.timeout,
    });
  }
}
