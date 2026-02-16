import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import type { AgentProvider } from "@/lib/store";
import { scanSystemMcpConfigs, getPlatformMcpCommand, getPlatformEnvironment } from "./mcp-system-scanner";

// Note: StdioClientTransport is not available in browser environment
// We'll need to use a different transport or implement browser-compatible MCP

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
	client: any; // Will be initialized by backend in browser environment
	config: McpServerConfig;
	tools: any[]; // Tool definitions
	resources: any[]; // Resource definitions
	connected: boolean;
	lastError?: string;
}

export class McpManager {
	public servers: Map<string, McpServer> = new Map();
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
	 * Load MCP servers from localStorage, system paths, and configuration
	 */
	async loadServers(): Promise<void> {
		try {
			console.log("🔍 Loading MCP servers from multiple sources...");

			// 1. Get installed MCPs from localStorage
			const installedData = localStorage.getItem("openfarm-installed-mcps");
			const installedMcps = installedData ? JSON.parse(installedData) : [];

			// 2. Scan system paths for MCP configurations
			const systemConfigs = await this.scanSystemConfigs();

			// 3. Get MCP status (active/inactive)
			const statusData = localStorage.getItem("openfarm-mcp-status");
			const statusMap = statusData ? JSON.parse(statusData) : {};

			// Load localStorage MCPs first
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

			// Load system MCP configurations
			for (const config of systemConfigs) {
				const key = `${config.id}-${config.provider}`;
				const isActive = statusMap[key] !== false; // Default to true

				if (isActive && !this.servers.has(config.id)) {
					await this.addServer({
						...config,
						env: {
							...getPlatformEnvironment(),
							...config.env,
						},
					});
				}
			}

			console.log(`📦 Loaded ${this.servers.size} MCP servers (${installedMcps.length} from localStorage, ${systemConfigs.length} from system)`);
		} catch (error) {
			console.error("❌ Failed to load MCP servers:", error);
		}
	}

	/**
	 * Scan system paths for MCP configurations
	 */
	private async scanSystemConfigs(): Promise<any[]> {
		try {
			const systemConfigs = await scanSystemMcpConfigs();
			console.log(`🔍 Found ${systemConfigs.length} MCP configurations in system paths`);
			return systemConfigs;
		} catch (error) {
			console.log("⚠️ Could not scan system MCP configurations:", error);
			return [];
		}
	}

	/**
	 * Add a new MCP server
	 */
	async addServer(config: McpServerConfig): Promise<void> {
		try {
			console.log(`🔧 Adding MCP server: ${config.name}`);

			// Browser environment - MCP servers run via Tauri backend
			// Store configuration for later use by backend
			const server: McpServer = {
				client: null as any, // Will be initialized by backend
				config,
				tools: [],
				resources: [],
				connected: false,
				lastError: "Browser environment - MCP server managed by backend",
			};

			this.servers.set(config.id, server);
			console.log(`✅ MCP server configuration stored: ${config.name}`);

		} catch (error) {
			console.error(`❌ Failed to add MCP server ${config.name}:`, error);
			
			// Store error but don't throw
			const server: McpServer = {
				client: null as any,
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
		if (server?.client) {
			try {
				// Browser environment - cleanup handled by backend
				console.log(`🗑️ Removing MCP server configuration: ${serverId}`);
			} catch (error) {
				console.error(`Error removing MCP server ${serverId}:`, error);
			}
		}
		this.servers.delete(serverId);
		console.log(`🗑️ Removed MCP server: ${serverId}`);
	}

	/**
	 * Get MCP command for a specific package
	 */
	private getMcpCommand(mcpId: string, provider: AgentProvider): string {
		// Use platform-specific command
		return getPlatformMcpCommand(mcpId);
	}

	/**
	 * Get MCP arguments for a specific package
	 */
	private getMcpArgs(mcpId: string, provider: AgentProvider, config: any): string[] {
		const packageMap: Record<string, string> = {
			context7: "@context7/mcp-server",
			filesystem: "@modelcontextprotocol/server-filesystem",
			git: "@modelcontextprotocol/server-git",
			fetch: "@modelcontextprotocol/server-fetch",
			"brave-search": "@modelcontextprotocol/server-brave-search",
			memory: "@modelcontextprotocol/server-memory",
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
	 * Get servers for a specific provider
	 */
	getServersForProvider(provider: AgentProvider): McpServer[] {
		return Array.from(this.servers.values()).filter(
			(server) => server.config.provider === provider,
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
	 * Execute a tool on a specific server
	 */
	async callTool(serverId: string, toolName: string, args: any): Promise<any> {
		const server = this.servers.get(serverId);
		if (!server || !server.connected) {
			throw new Error(`Server ${serverId} not connected`);
		}

		try {
			console.log(
				`🔧 Calling tool ${toolName} on ${serverId} with args:`,
				args,
			);
			const result = await server.client.callTool({
				name: toolName,
				arguments: args,
			});
			console.log(`✅ Tool ${toolName} executed successfully`);
			return result;
		} catch (error) {
			console.error(`❌ Tool call failed ${toolName} on ${serverId}:`, error);
			throw error;
		}
	}

	/**
	 * Read a resource from a specific server
	 */
	async readResource(serverId: string, uri: string): Promise<any> {
		const server = this.servers.get(serverId);
		if (!server || !server.connected) {
			throw new Error(`Server ${serverId} not connected`);
		}

		try {
			console.log(`📖 Reading resource ${uri} from ${serverId}`);
			const result = await server.client.readResource({ uri });
			console.log(`✅ Resource ${uri} read successfully`);
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
			serversByProvider: {} as Record<
				AgentProvider,
				{
					total: number;
					connected: number;
					tools: number;
					resources: number;
				}
			>,
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
				summary.serversByProvider[provider].resources +=
					server.resources.length;
			}
		}
		return summary;
	}

	/**
	 * Get environment variables for MCP
	 */
	private getMcpEnv(
		mcpId: string,
		provider: AgentProvider,
		config: any,
	): Record<string, string> {
		// Start with platform environment
		const env = getPlatformEnvironment();

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

		// MCP-specific environment variables
		if (mcpId === "brave-search") {
			env["BRAVE_API_KEY"] = config.braveApiKey || "";
		} else if (mcpId === "filesystem") {
			env["FILESYSTEM_ROOT"] = config.rootPath || env.HOME || "/";
		}

		return env;
	}

	/**
	 * Cleanup all servers
	 */
	async cleanup(): Promise<void> {
		console.log("🧹 Cleaning up MCP Manager...");
		for (const [serverId, server] of this.servers.entries()) {
			if (server.client) {
				try {
					// Browser environment - cleanup handled by backend
					console.log(`Cleaning up server configuration: ${serverId}`);
				} catch (error) {
					console.error(`Error cleaning up server ${serverId}:`, error);
				}
			}
		}
		this.servers.clear();
	}
}

// Global MCP Manager instance
export const mcpManager = new McpManager();
