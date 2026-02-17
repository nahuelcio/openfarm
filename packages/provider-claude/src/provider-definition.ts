import type { ProviderMetadata } from "@openfarm/sdk";

export const CLAUDE_DEFAULT_TIMEOUT = 600_000;

export const CLAUDE_CONFIG_SCHEMA = {
	type: "object",
	properties: {
		timeout: {
			type: "number",
			default: CLAUDE_DEFAULT_TIMEOUT,
			minimum: 1000,
			description: "Timeout in milliseconds",
		},
	},
	required: [],
	additionalProperties: false,
};

const CLAUDE_SUPPORTED_FEATURES = [
	"code-generation",
	"code-editing",
	"refactoring",
	"debugging",
	"code-analysis",
	"file-operations",
	"bash-execution",
	"web-search",
] as const;

export function createClaudeMetadata(): ProviderMetadata {
	return {
		type: "claude",
		name: "Claude Code",
		version: "1.0.0",
		description:
			"Claude Code AI assistant with advanced code understanding and editing capabilities",
		packageName: "@openfarm/provider-claude",
		supportedFeatures: [...CLAUDE_SUPPORTED_FEATURES],
		configSchema: CLAUDE_CONFIG_SCHEMA,
		requiresExternal: true,
	};
}
