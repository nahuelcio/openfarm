// MCPs reales configurados por cada provider según su documentación oficial

export const REAL_PROVIDER_MCPS = {
	// Claude Code - Basado en modelcontextprotocol/servers
	"claude-code": [
		{
			id: "everything",
			name: "Everything",
			description: "Reference / test server with prompts, resources, and tools",
			icon: "database",
			category: "development",
			official: true,
			source: "modelcontextprotocol/servers",
			configSchema: {},
		},
		{
			id: "fetch",
			name: "Fetch",
			description:
				"Web content fetching and conversion for efficient LLM usage",
			icon: "globe",
			category: "network",
			official: true,
			source: "modelcontextprotocol/servers",
			configSchema: {},
		},
		{
			id: "filesystem",
			name: "Filesystem",
			description: "Secure file operations with configurable access controls",
			icon: "database",
			category: "system",
			official: true,
			source: "modelcontextprotocol/servers",
			configSchema: {
				allowedPaths: {
					type: "array",
					required: true,
					description: "Allowed file paths",
				},
			},
		},
		{
			id: "git",
			name: "Git",
			description: "Tools to read, search, and manipulate Git repositories",
			icon: "github",
			category: "development",
			official: true,
			source: "modelcontextprotocol/servers",
			configSchema: {
				repoPath: {
					type: "string",
					required: true,
					description: "Git repository path",
				},
			},
		},
		{
			id: "memory",
			name: "Memory",
			description: "Knowledge graph-based persistent memory system",
			icon: "database",
			category: "data",
			official: true,
			source: "modelcontextprotocol/servers",
			configSchema: {},
		},
		{
			id: "sequential-thinking",
			name: "Sequential Thinking",
			description:
				"Dynamic and reflective problem-solving through thought sequences",
			icon: "brain",
			category: "ai",
			official: true,
			source: "modelcontextprotocol/servers",
			configSchema: {},
		},
		{
			id: "time",
			name: "Time",
			description: "Time and timezone conversion capabilities",
			icon: "clock",
			category: "utility",
			official: true,
			source: "modelcontextprotocol/servers",
			configSchema: {},
		},
	],

	// GitHub Copilot - Basado en documentación oficial
	codex: [
		{
			id: "github",
			name: "GitHub",
			description:
				"GitHub integration for repositories, issues, and pull requests",
			icon: "github",
			category: "development",
			official: true,
			source: "github/copilot",
			configSchema: {
				token: {
					type: "string",
					required: true,
					description: "GitHub personal access token",
				},
			},
		},
		{
			id: "filesystem",
			name: "Filesystem",
			description: "Local file system access for Copilot",
			icon: "database",
			category: "system",
			official: true,
			source: "github/copilot",
			configSchema: {
				workspacePath: {
					type: "string",
					required: true,
					description: "Workspace directory path",
				},
			},
		},
	],

	// OpenCode - Basado en documentación oficial
	opencode: [
		{
			id: "context7",
			name: "Context7",
			description: "Search through documentation and knowledge bases",
			icon: "database",
			category: "search",
			official: true,
			source: "opencode.ai",
			configSchema: {
				context7ApiKey: {
					type: "string",
					required: false,
					description: "Context7 API key for higher rate limits",
				},
			},
			url: "https://mcp.context7.com/mcp",
		},
		{
			id: "sentry",
			name: "Sentry",
			description: "Interact with Sentry projects and issues",
			icon: "shield",
			category: "monitoring",
			official: true,
			source: "opencode.ai",
			configSchema: {
				oauth: {
					type: "object",
					required: true,
					description: "OAuth authentication configuration",
				},
			},
			url: "https://mcp.sentry.dev/mcp",
		},
		{
			id: "gh_grep",
			name: "Grep by Vercel",
			description: "Search through code snippets on GitHub",
			icon: "search",
			category: "search",
			official: true,
			source: "opencode.ai",
			configSchema: {},
			url: "https://mcp.grep.app",
		},
	],
} as const;

export type AgentProvider = keyof typeof REAL_PROVIDER_MCPS;
export interface RealMcpInfo {
	id: string;
	name: string;
	description: string;
	icon: string;
	category: string;
	official: boolean;
	source: string;
	configSchema: Record<string, any>;
	url?: string;
}
