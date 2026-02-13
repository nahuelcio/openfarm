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
import { OpenCodeProvider } from "./opencode-provider";
import {
  createOpenCodeMetadata,
  OPENCODE_DEFAULT_TIMEOUT,
} from "./provider-definition";

export class OpenCodeProviderFactory implements ProviderFactory {
  private readonly metadata: ProviderMetadata = createOpenCodeMetadata();

  getMetadata(): ProviderMetadata {
    return { ...this.metadata };
  }

  canCreate(type: string): boolean {
    return type === "opencode";
  }

  create(config?: unknown): Provider {
    if (config !== undefined && config !== null) {
      this.validateConfig(config);
    }

    const parsedConfig = this.parseConfig(config);
    const { communicationStrategy, commandLabel } =
      this.createCommunicationStrategy(parsedConfig);
    const responseParser = this.createResponseParser();
    const configManager = this.createConfigurationManager(parsedConfig);

    return new OpenCodeProvider(
      communicationStrategy,
      responseParser,
      configManager,
      parsedConfig,
      commandLabel
    );
  }

  private validateConfig(config: unknown): void {
    if (typeof config !== "object" || config === null) {
      throw new Error("Configuration must be an object");
    }

    const configObj = config as Record<string, unknown>;

    if (configObj.timeout !== undefined) {
      if (typeof configObj.timeout !== "number" || configObj.timeout < 1000) {
        throw new Error("Timeout must be a number >= 1000");
      }
    }
  }

  private parseConfig(config?: unknown): { timeout: number } {
    const defaults = {
      timeout: OPENCODE_DEFAULT_TIMEOUT,
    };

    if (!config || typeof config !== "object") {
      return defaults;
    }

    const configObj = config as Record<string, unknown>;

    return {
      timeout: (configObj.timeout as number) || defaults.timeout,
    };
  }

  private createCommunicationStrategy(config: { timeout: number }): {
    communicationStrategy: CommunicationStrategy;
    commandLabel: string;
  } {
    const command = process.env.OPENCODE_COMMAND || "bunx";
    const useBunx = command === "bunx";
    const defaultArgs = useBunx ? ["opencode-ai"] : [];
    const commandLabel = useBunx ? "bunx opencode-ai" : command;

    return {
      communicationStrategy: new CliCommunicationStrategy({
        executable: command,
        defaultArgs,
        timeout: config.timeout,
      }),
      commandLabel,
    };
  }

  private createResponseParser(): StreamResponseParser {
    return new StreamResponseParser();
  }

  private createConfigurationManager(config: {
    timeout: number;
  }): ConfigurationManager {
    return ConfigManagers.cli("opencode", {
      timeout: config.timeout,
    });
  }
}
