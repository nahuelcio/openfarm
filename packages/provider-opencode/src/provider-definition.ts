import type { ProviderMetadata } from "@openfarm/sdk";

export const OPENCODE_DEFAULT_TIMEOUT = 600_000;

export const OPENCODE_CONFIG_SCHEMA = {
	type: "object",
	properties: {
		timeout: {
			type: "number",
			default: OPENCODE_DEFAULT_TIMEOUT,
			minimum: 1000,
			description: "Timeout in milliseconds",
		},
	},
	required: [],
	additionalProperties: false,
};

const OPENCODE_SUPPORTED_FEATURES = [
	"code-generation",
	"code-editing",
	"refactoring",
	"debugging",
	"file-operations",
	"streaming",
] as const;

export function createOpenCodeMetadata(): ProviderMetadata {
	return {
		type: "opencode",
		name: "OpenCode",
		version: "1.0.0",
		description: "OpenCode CLI agent via OpenCode server",
		packageName: "@openfarm/provider-opencode",
		supportedFeatures: [...OPENCODE_SUPPORTED_FEATURES],
		configSchema: OPENCODE_CONFIG_SCHEMA,
		requiresExternal: true,
	};
}
