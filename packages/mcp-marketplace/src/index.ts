export { McpInstaller, mcpInstaller } from "./services/installer";
export { McpManager, mcpManager } from "./services/manager";
export * from "./types";

import type { McpCatalog, McpCatalogEntry } from "./types";

const catalogData: McpCatalog = {
	version: "1.0.0",
	mcps: [
		{
			id: "context7",
			name: "Context7",
			description: "Enhanced context awareness using VectorDB.",
			icon: "database",
			npmPackage: "@upstash/context7-mcp",
			category: "dev-tools",
			defaultArgs: [],
			defaultEnv: {},
			configSchema: { context7ApiKey: { type: "string", required: true } },
			verified: true,
		},
		{
			id: "figma",
			name: "Figma",
			description: "Access Figma designs and components.",
			icon: "figma",
			npmPackage: "@modelcontextprotocol/server-figma",
			category: "design",
			defaultArgs: [],
			defaultEnv: { FIGMA_ACCESS_TOKEN: "" },
			configSchema: { figmaToken: { type: "string", required: true } },
			verified: true,
		},
		{
			id: "github",
			name: "GitHub",
			description: "Manage issues, PRs, and repositories.",
			icon: "github",
			npmPackage: "@modelcontextprotocol/server-github",
			category: "dev-tools",
			defaultArgs: [],
			defaultEnv: { GITHUB_PERSONAL_ACCESS_TOKEN: "" },
			configSchema: { token: { type: "string", required: true } },
			verified: true,
		},
		{
			id: "linear",
			name: "Linear",
			description: "Issue tracking and project management.",
			icon: "linear",
			npmPackage: "@modelcontextprotocol/server-linear",
			category: "productivity",
			defaultArgs: [],
			defaultEnv: { LINEAR_API_KEY: "" },
			configSchema: { apiKey: { type: "string", required: true } },
			verified: true,
		},
		{
			id: "notion",
			name: "Notion",
			description: "Access and manage Notion pages and databases.",
			icon: "notion",
			npmPackage: "@notionhq/notion-mcp",
			category: "productivity",
			defaultArgs: [],
			defaultEnv: { NOTION_API_KEY: "" },
			configSchema: { apiKey: { type: "string", required: true } },
			verified: true,
		},
		{
			id: "playwright",
			name: "Playwright",
			description: "Browser automation and testing.",
			icon: "playwright",
			npmPackage: "@modelcontextprotocol/server-playwright",
			category: "testing",
			defaultArgs: [],
			defaultEnv: {},
			configSchema: { browserType: { type: "string", required: false } },
			verified: true,
		},
	],
};

export const mcpCatalog = catalogData;

export function getCatalogEntries(): McpCatalogEntry[] {
	return mcpCatalog.mcps;
}

export function getCatalogEntry(id: string): McpCatalogEntry | undefined {
	return mcpCatalog.mcps.find((mcp) => mcp.id === id);
}
