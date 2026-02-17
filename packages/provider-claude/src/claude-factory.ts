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
import {
	CLAUDE_DEFAULT_TIMEOUT,
	createClaudeMetadata,
} from "./provider-definition";

/**
 * Factory for creating ClaudeProvider instances
 */
export class ClaudeProviderFactory implements ProviderFactory {
	private readonly metadata: ProviderMetadata = createClaudeMetadata();

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
			parsedConfig,
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
			timeout: CLAUDE_DEFAULT_TIMEOUT,
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
