import type { AgentProvider } from "@/lib/store";

export interface McpServerConfig {
	id: string;
	name: string;
	command: string;
	args?: string[];
	env?: Record<string, string>;
	provider: AgentProvider;
	enabled: boolean;
}

export interface McpTool {
	name: string;
	description: string;
	inputSchema: any;
}

export interface McpResource {
	uri: string;
	name: string;
	description?: string;
	mimeType?: string;
}

export interface McpServer {
	config: McpServerConfig;
	tools: McpTool[];
	resources: McpResource[];
	connected: boolean;
	lastError?: string;
	process?: any; // Node.js child process
}

export class McpManager {
	private servers: Map<string, McpServer> = new Map();
	private initialized = false;

	constructor() {
		this.initialize();
	}

	async initialize() {
		if (this.initialized) return;
		this.initialized = true;
		console.log("🚀 MCP Manager initialized");
	}

	/**
	 * Load MCP servers from localStorage and configuration
	 */
	async loadServers(): Promise<void> {
		try {
			// Get installed MCPs from localStorage
			const installedData = localStorage.getItem('openfarm-installed-mcps');
			const installedMcps = installedData ? JSON.parse(installedData) : [];

			// Get MCP status (active/inactive)
			const statusData = localStorage.getItem('openfarm-mcp-status');
			const statusMap = statusData ? JSON.parse(statusData) : {};

			// Load real provider MCPs
			for (const mcp of installedMcps) {
				const key = `${mcp.id}-${mcp.provider}`;
				const isActive = statusMap[key] !== false; // Default to true

				if (isActive) {
					await this.addServer({
						id: mcp.id,
						name: mcp.id,
						command: this.getMcpCommand(mcp.id, mcp.provider),
						args: this.getMcpArgs(mcp.id, mcp.provider, mcp.config),
						env: this.getMcpEnv(mcp.id, mcp.provider, mcp.config),
						provider: mcp.provider,
						enabled: true,
					});
				}
			}

			console.log(`📦 Loaded ${this.servers.size} MCP servers`);
		} catch (error) {
			console.error("❌ Failed to load MCP servers:", error);
		}
	}

	/**
	 * Add a new MCP server
	 */
	async addServer(config: McpServerConfig): Promise<void> {
		try {
			console.log(`🔧 Adding MCP server: ${config.name}`);

			// For now, simulate the server connection
			// In the future, this will actually spawn the MCP process
			const server: McpServer = {
				config,
				tools: this.getMockTools(config.id),
				resources: this.getMockResources(config.id),
				connected: true,
			};

			this.servers.set(config.id, server);
			console.log(`✅ MCP server connected: ${config.name}`);

		} catch (error) {
			console.error(`❌ Failed to add MCP server ${config.name}:`, error);
			
			// Store error but don't throw
			const server: McpServer = {
				config,
				tools: [],
				resources: [],
				connected: false,
				lastError: error instanceof Error ? error.message : String(error),
			};
			this.servers.set(config.id, server);
		}
	}

	/**
	 * Remove an MCP server
	 */
	async removeServer(serverId: string): Promise<void> {
		const server = this.servers.get(serverId);
		if (server?.process) {
			try {
				server.process.kill();
			} catch (error) {
				console.error(`Error closing MCP server ${serverId}:`, error);
			}
		}
		this.servers.delete(serverId);
		console.log(`🗑️ Removed MCP server: ${serverId}`);
	}

	/**
	 * Get all servers for a specific provider
	 */
	getServersForProvider(provider: AgentProvider): McpServer[] {
		return Array.from(this.servers.values()).filter(
			server => server.config.provider === provider
		);
	}

	/**
	 * Get all available tools across all servers
	 */
	getAllTools(): McpTool[] {
		const tools: McpTool[] = [];
		for (const server of this.servers.values()) {
			if (server.connected) {
				tools.push(...server.tools);
			}
		}
		return tools;
	}

	/**
	 * Get all available resources across all servers
	 */
	getAllResources(): McpResource[] {
		const resources: McpResource[] = [];
		for (const server of this.servers.values()) {
			if (server.connected) {
				resources.push(...server.resources);
			}
		}
		return resources;
	}

	/**
	 * Execute a tool on a specific server (mock implementation)
	 */
	async callTool(serverId: string, toolName: string, args: any): Promise<any> {
		const server = this.servers.get(serverId);
		if (!server || !server.connected) {
			throw new Error(`Server ${serverId} not connected`);
		}

		try {
			// Mock implementation - in the future this will call the actual MCP
			console.log(`🔧 Calling tool ${toolName} on ${serverId} with args:`, args);
			
			// Simulate tool execution
			const result = {
				content: [
					{
						type: "text",
						text: `Mock result from ${toolName} with args: ${JSON.stringify(args)}`,
					},
				],
				isError: false,
			};
			
			return result;
		} catch (error) {
			console.error(`❌ Tool call failed ${toolName} on ${serverId}:`, error);
			throw error;
		}
	}

	/**
	 * Read a resource from a specific server (mock implementation)
	 */
	async readResource(serverId: string, uri: string): Promise<any> {
		const server = this.servers.get(serverId);
		if (!server || !server.connected) {
			throw new Error(`Server ${serverId} not connected`);
		}

		try {
			// Mock implementation - in the future this will call the actual MCP
			console.log(`📖 Reading resource ${uri} from ${serverId}`);
			
			const result = {
				contents: [
					{
						uri,
						mimeType: "text/plain",
						text: `Mock content from ${uri}`,
					},
				],
			};
			
			return result;
		} catch (error) {
			console.error(`❌ Resource read failed ${uri} on ${serverId}:`, error);
			throw error;
		}
	}

	/**
	 * Get server status summary
	 */
	getStatusSummary(): Record<string, any> {
		const summary = {
			totalServers: this.servers.size,
			connectedServers: 0,
			totalTools: 0,
			totalResources: 0,
			serversByProvider: {} as Record<AgentProvider, {
				total: number;
				connected: number;
				tools: number;
				resources: number;
			}>,
		};

		for (const server of this.servers.values()) {
			if (server.connected) {
				summary.connectedServers++;
				summary.totalTools += server.tools.length;
				summary.totalResources += server.resources.length;
			}

			const provider = server.config.provider;
			if (!summary.serversByProvider[provider]) {
				summary.serversByProvider[provider] = {
					total: 0,
					connected: 0,
					tools: 0,
					resources: 0,
				};
			}
			summary.serversByProvider[provider].total++;
			if (server.connected) {
				summary.serversByProvider[provider].connected++;
				summary.serversByProvider[provider].tools += server.tools.length;
				summary.serversByProvider[provider].resources += server.resources.length;
			}
		}

		return summary;
	}

	/**
	 * Get mock tools for testing
	 */
	private getMockTools(mcpId: string): McpTool[] {
		const toolMap: Record<string, McpTool[]> = {
			context7: [
				{
					name: "search_docs",
					description: "Search through documentation",
					inputSchema: {
						type: "object",
						properties: {
							query: { type: "string", description: "Search query" },
							limit: { type: "number", description: "Result limit" },
						},
						required: ["query"],
					},
				},
			],
			filesystem: [
				{
					name: "read_file",
					description: "Read a file from the filesystem",
					inputSchema: {
						type: "object",
						properties: {
							path: { type: "string", description: "File path" },
						},
						required: ["path"],
					},
				},
				{
					name: "write_file",
					description: "Write content to a file",
					inputSchema: {
						type: "object",
						properties: {
							path: { type: "string", description: "File path" },
							content: { type: "string", description: "File content" },
						},
						required: ["path", "content"],
					},
				},
			],
			git: [
				{
					name: "git_status",
					description: "Get git repository status",
					inputSchema: {
						type: "object",
						properties: {
							path: { type: "string", description: "Repository path" },
						},
						required: ["path"],
					},
				},
			],
		};

		return toolMap[mcpId] || [];
	}

	/**
	 * Get mock resources for testing
	 */
	private getMockResources(mcpId: string): McpResource[] {
		const resourceMap: Record<string, McpResource[]> = {
			filesystem: [
				{
					uri: "file:///Users/nahuelcioffi/Proyectos/openfarm/README.md",
					name: "README.md",
					description: "Project README file",
					mimeType: "text/markdown",
				},
			],
			git: [
				{
					uri: "git://status",
					name: "Git Status",
					description: "Current git repository status",
				},
			],
		};

		return resourceMap[mcpId] || [];
	}

	/**
	 * Get command for MCP based on ID and provider
	 */
	private getMcpCommand(mcpId: string, provider: AgentProvider): string {
		// For now, use npx to run MCP packages
		// In the future, this could be more sophisticated
		return "npx";
	}

	/**
	 * Get arguments for MCP based on ID and provider
	 */
	private getMcpArgs(mcpId: string, provider: AgentProvider, config: any): string[] {
		const packageMap: Record<string, string> = {
			"context7": "@context7/mcp-server",
			"filesystem": "@modelcontextprotocol/server-filesystem",
			"git": "@modelcontextprotocol/server-git",
			"fetch": "@modelcontextprotocol/server-fetch",
			// Add more mappings as needed
		};

		const packageName = packageMap[mcpId] || mcpId;
		const args = [packageName];

		// Add provider-specific arguments
		if (provider === "claude-code") {
			args.push("--anthropic");
		} else if (provider === "codex") {
			args.push("--github");
		} else if (provider === "opencode") {
			args.push("--openai");
		}

		return args;
	}

	/**
	 * Get environment variables for MCP
	 */
	private getMcpEnv(mcpId: string, provider: AgentProvider, config: any): Record<string, string> {
		const env: Record<string, string> = {};

		// Add configuration as environment variables
		for (const [key, value] of Object.entries(config)) {
			env[`MCP_${key.toUpperCase()}`] = String(value);
		}

		// Add provider-specific environment variables
		if (provider === "claude-code") {
			env["ANTHROPIC_API_KEY"] = config.anthropicApiKey || "";
		} else if (provider === "codex") {
			env["GITHUB_TOKEN"] = config.githubToken || "";
		} else if (provider === "opencode") {
			env["OPENAI_API_KEY"] = config.openaiApiKey || "";
		}

		return env;
	}

	/**
	 * Cleanup all servers
	 */
	async cleanup(): Promise<void> {
		console.log("🧹 Cleaning up MCP Manager...");
		for (const [serverId, server] of this.servers.entries()) {
			if (server.process) {
				try {
					server.process.kill();
				} catch (error) {
					console.error(`Error closing server ${serverId}:`, error);
				}
			}
		}
		this.servers.clear();
	}
}

// Global MCP Manager instance
export const mcpManager = new McpManager();
