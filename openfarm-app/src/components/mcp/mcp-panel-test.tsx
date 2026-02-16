"use client";

import { McpHeaderPanel } from "./mcp-header-panel";
import type { ProviderConfig } from "@/lib/store";
import type { McpServer } from "@/lib/mcp-manager";

// Test data para verificar el componente MCP
const mockProviders: ProviderConfig[] = [
	{
		id: "claude-code",
		name: "Claude Code",
		description: "Anthropic CLI agent",
		color: "#d97756",
		connected: true,
		apiKey: "",
		models: [
			{ id: "claude-sonnet-4", name: "Claude Sonnet 4", description: "Fast coding model" },
		],
		defaultModel: "claude-sonnet-4",
	},
	{
		id: "codex",
		name: "Codex",
		description: "OpenAI Codex CLI agent",
		color: "#10a37f",
		connected: true,
		apiKey: "",
		models: [
			{ id: "codex-mini", name: "Codex Mini", description: "Fast coding tasks" },
		],
		defaultModel: "codex-mini",
	},
];

const mockServers: McpServer[] = [
	{
		client: null,
		config: {
			id: "context7",
			name: "Context7",
			command: "npx",
			args: ["@context7/mcp-server"],
			env: {},
			provider: "claude-code",
			enabled: true,
		},
		tools: [
			{ name: "semantic-search", description: "Search code semantically", inputSchema: {} },
			{ name: "index-codebase", description: "Index codebase for search", inputSchema: {} },
		],
		resources: [
			{ uri: "codebase://index", name: "Codebase Index", description: "Indexed codebase" },
		],
		connected: true,
	},
	{
		client: null,
		config: {
			id: "github",
			name: "GitHub",
			command: "npx",
			args: ["@modelcontextprotocol/server-github"],
			env: { GITHUB_TOKEN: "test" },
			provider: "codex",
			enabled: true,
		},
		tools: [
			{ name: "create-issue", description: "Create GitHub issue", inputSchema: {} },
			{ name: "list-repos", description: "List repositories", inputSchema: {} },
		],
		resources: [],
		connected: true,
	},
];

export function McpPanelTest() {
	const enabledServers = new Set(["context7", "github"]);

	return (
		<div className="p-8 space-y-4">
			<h2 className="text-lg font-semibold">MCP Panel Test</h2>
			<div className="p-4 border rounded">
				<McpHeaderPanel
					providers={mockProviders}
					servers={mockServers}
					enabledServers={enabledServers}
					onToggleServer={(serverId) => console.log("Toggle:", serverId)}
					onOpenSettings={() => console.log("Open settings")}
					onOpenMarketplace={() => console.log("Open marketplace")}
				/>
			</div>
			<p className="text-sm text-muted-foreground">
				Haz clic en el ícono de base de datos para abrir el panel MCP
			</p>
		</div>
	);
}
