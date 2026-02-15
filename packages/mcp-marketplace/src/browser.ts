export interface McpCatalogEntry {
	id: string;
	name: string;
	description: string;
	icon: string;
	npmPackage: string;
	category: string;
	defaultArgs: string[];
	defaultEnv: Record<string, string>;
	configSchema: Record<string, unknown>;
	verified?: boolean;
	docsUrl?: string;
}

export interface InstalledMcp {
	id: string;
	catalogEntryId: string;
	displayName?: string;
	command: string;
	args: string[];
	env: Record<string, string>;
	enabled: boolean;
	installedAt: string;
	configOverrides: Record<string, unknown>;
}

const catalogData: { version: string; mcps: McpCatalogEntry[] } = {
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

export function getCatalogEntries(): McpCatalogEntry[] {
	return catalogData.mcps;
}

export function getCatalogEntry(id: string): McpCatalogEntry | undefined {
	return catalogData.mcps.find((mcp) => mcp.id === id);
}

export function searchAvailable(query: string): McpCatalogEntry[] {
	const lowerQuery = query.toLowerCase();
	return catalogData.mcps.filter(
		(entry) =>
			entry.name.toLowerCase().includes(lowerQuery) ||
			entry.description.toLowerCase().includes(lowerQuery) ||
			entry.category.toLowerCase().includes(lowerQuery),
	);
}

export function getByCategory(category: string): McpCatalogEntry[] {
	return catalogData.mcps.filter((entry) => entry.category === category);
}

export function getCategories(): string[] {
	const categories = new Set(catalogData.mcps.map((e) => e.category));
	return Array.from(categories);
}
