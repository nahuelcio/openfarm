import { type McpServer, mcpManager } from "@/lib/mcp-manager";
import type { AgentProvider } from "@/lib/store";
import { MemoryMcpIntegration, type MemoryMcpConfig } from "./memory-mcp-integration";

export interface ProviderMcpIntegration {
	provider: AgentProvider;
	initialize(): Promise<void>;
	getToolsForAgent(agentId: string): Promise<any[]>;
	executeTool(toolName: string, args: any, agentId: string): Promise<any>;
	cleanup(): Promise<void>;
}

export class ClaudeCodeMcpIntegration implements ProviderMcpIntegration {
	provider: AgentProvider = "claude-code";
	private initialized = false;
	private memoryIntegration: MemoryMcpIntegration;

	constructor() {
		this.memoryIntegration = new MemoryMcpIntegration({
			enabled: true,
			workspaceRoot: "/Users/nahuelcioffi/Proyectos/openfarm", // TODO: Get from context
			sharedBanks: [],
		});
	}

	async initialize(): Promise<void> {
		if (this.initialized) return;

		console.log("🔧 Initializing Claude Code MCP Integration...");

		// Load MCP servers for Claude Code
		await mcpManager.loadServers();

		// Initialize memory integration
		await this.memoryIntegration.initialize();

		this.initialized = true;
		console.log("✅ Claude Code MCP Integration initialized");
	}

	async getToolsForAgent(agentId: string): Promise<any[]> {
		if (!this.initialized) {
			await this.initialize();
		}

		const servers = mcpManager.getServersForProvider(this.provider);
		const allTools: any[] = [];

		for (const server of servers) {
			if (server.connected) {
				// Convert MCP tools to Claude Code format
				const claudeTools = server.tools.map((tool) => ({
					name: tool.name,
					description: tool.description,
					input_schema: tool.inputSchema,
					// Claude Code specific format
					type: "function",
					function: {
						name: tool.name,
						description: tool.description,
						parameters: tool.inputSchema,
					},
				}));
				allTools.push(...claudeTools);
			}
		}

		// Add memory tools
		const memoryTools = await this.memoryIntegration.getTools();
		const memoryClaudeTools = memoryTools.map((tool) => ({
			name: tool.name,
			description: tool.description,
			input_schema: tool.inputSchema,
			type: "function",
			function: {
				name: tool.name,
				description: tool.description,
				parameters: tool.inputSchema,
			},
		}));
		allTools.push(...memoryClaudeTools);

		console.log(
			`🔧 Found ${allTools.length} tools for Claude Code agent ${agentId}`,
		);
		return allTools;
	}

	async executeTool(
		toolName: string,
		args: any,
		agentId: string,
	): Promise<any> {
		if (!this.initialized) {
			await this.initialize();
		}

		const servers = mcpManager.getServersForProvider(this.provider);

		// Check if this is a memory tool
		const memoryTools = await this.memoryIntegration.getTools();
		if (memoryTools.some((tool) => tool.name === toolName)) {
			try {
				console.log(
					`🧠 Executing memory tool ${toolName} for Claude Code agent ${agentId}`,
				);
				const result = await this.memoryIntegration.callTool(toolName, args);
				return {
					type: "tool_result",
					tool_use_id: `tool_${Date.now()}`,
					content: result.content || [],
				};
			} catch (error) {
				console.error(`❌ Memory tool execution failed:`, error);
				return {
					type: "error",
					error: error instanceof Error ? error.message : "Unknown error",
				};
			}
		}

		// Find the server that has this tool
		for (const server of servers) {
			if (
				server.connected &&
				server.tools.some((tool) => tool.name === toolName)
			) {
				try {
					console.log(
						`🔧 Executing tool ${toolName} for Claude Code agent ${agentId}`,
					);
					const result = await mcpManager.callTool(
						server.config.id,
						toolName,
						args,
					);

					// Convert MCP result to Claude Code format
					return {
						type: "tool_result",
						tool_use_id: `tool_${Date.now()}`,
						content: result.content || [],
					};
				} catch (error) {
					console.error(`❌ Tool execution failed:`, error);
					return {
						type: "error",
						error: error instanceof Error ? error.message : "Unknown error",
					};
				}
			}
		}

		throw new Error(`Tool ${toolName} not found in any Claude Code MCP server`);
	}

	async cleanup(): Promise<void> {
		console.log("🧹 Cleaning up Claude Code MCP Integration...");
		await this.memoryIntegration.cleanup();
		this.initialized = false;
	}
}

export class CodexMcpIntegration implements ProviderMcpIntegration {
	provider: AgentProvider = "codex";
	private initialized = false;
	private memoryIntegration: MemoryMcpIntegration;

	constructor() {
		this.memoryIntegration = new MemoryMcpIntegration({
			enabled: true,
			workspaceRoot: "/Users/nahuelcioffi/Proyectos/openfarm", // TODO: Get from context
			sharedBanks: [],
		});
	}

	async initialize(): Promise<void> {
		if (this.initialized) return;

		console.log("🔧 Initializing Codex MCP Integration...");
		await mcpManager.loadServers();
		await this.memoryIntegration.initialize(); // Initialize memory integration
		this.initialized = true;
		console.log("✅ Codex MCP Integration initialized");
	}

	async getToolsForAgent(agentId: string): Promise<any[]> {
		if (!this.initialized) {
			await this.initialize();
		}

		const servers = mcpManager.getServersForProvider(this.provider);
		const allTools: any[] = [];

		for (const server of servers) {
			try {
				// TODO: Fix MCP server tool discovery
				// const tools = await mcpManager.getServerTools(server.name);
				// const copilotTools = tools.map((tool: any) => ({
				// 	name: tool.name,
				// 	description: tool.description,
				// 	parameters: tool.inputSchema,
				// 	// GitHub Copilot specific format
				// 	function: {
				// 		name: tool.name,
				// 		description: tool.description,
				// 		parameters: tool.inputSchema,
				// 	},
				// }));
				const copilotTools: any[] = [];
				
				// Add tools to the provider
				// provider.addTools(copilotTools);
			} catch (error) {
				console.error(`Failed to get tools from server:`, error);
			}
		}

		// Add memory tools
		const memoryTools = await this.memoryIntegration.getTools();
		const memoryCopilotTools = memoryTools.map((tool) => ({
			name: tool.name,
			description: tool.description,
			parameters: tool.inputSchema,
			function: {
				name: tool.name,
				description: tool.description,
				parameters: tool.inputSchema,
			},
		}));
		allTools.push(...memoryCopilotTools);

		console.log(`🔧 Found ${allTools.length} tools for Codex agent ${agentId}`);
		return allTools;
	}

	async executeTool(
		toolName: string,
		args: any,
		agentId: string,
	): Promise<any> {
		if (!this.initialized) {
			await this.initialize();
		}

		const servers = mcpManager.getServersForProvider(this.provider);

		// Check if this is a memory tool
		const memoryTools = await this.memoryIntegration.getTools();
		if (memoryTools.some((tool) => tool.name === toolName)) {
			try {
				console.log(`🧠 Executing memory tool ${toolName} for Codex agent ${agentId}`);
				const result = await this.memoryIntegration.callTool(toolName, args);
				return {
					type: "tool_result",
					tool_use_id: `tool_${Date.now()}`,
					content: result.content || [],
				};
			} catch (error) {
				console.error(`Failed to execute memory tool ${toolName}:`, error);
				return {
					type: "tool_result",
					tool_use_id: `tool_${Date.now()}`,
					content: [
						{
							type: "text",
							text: `Error executing memory tool: ${error}`,
						},
					],
					is_error: true,
				};
			}
		}

		for (const server of servers) {
			try {
				// TODO: Fix MCP server tool calling
				// const result = await mcpManager.callTool(
				// 	server.name,
				// 	toolName,
				// 	args,
				// );
				const result: any = { content: [] };
				return {
					type: "tool_result",
					tool_use_id: `tool_${Date.now()}`,
					content: result.content || [],
				};
			} catch (error) {
				// Continue to next server if tool not found
				continue;
			}
		}

		throw new Error(`Tool ${toolName} not found in any Codex MCP server`);
	}

	async cleanup(): Promise<void> {
		console.log("🧹 Cleaning up Codex MCP Integration...");
		await this.memoryIntegration.cleanup(); // Cleanup memory integration
		this.initialized = false;
	}
}

export class OpenCodeMcpIntegration implements ProviderMcpIntegration {
	provider: AgentProvider = "opencode";
	private initialized = false;
	private memoryIntegration: MemoryMcpIntegration;

	constructor() {
		this.memoryIntegration = new MemoryMcpIntegration({
			enabled: true,
			workspaceRoot: "/Users/nahuelcioffi/Proyectos/openfarm", // TODO: Get from context
			sharedBanks: [],
		});
	}

	async initialize(): Promise<void> {
		if (this.initialized) return;

		console.log("🔧 Initializing OpenCode MCP Integration...");
		await mcpManager.loadServers();
		await this.memoryIntegration.initialize(); // Initialize memory integration
		this.initialized = true;
		console.log("✅ OpenCode MCP Integration initialized");
	}

	async getToolsForAgent(agentId: string): Promise<any[]> {
		if (!this.initialized) {
			await this.initialize();
		}

		const servers = mcpManager.getServersForProvider(this.provider);
		const allTools: any[] = [];

		for (const server of servers) {
			if (server.connected) {
				// Convert MCP tools to OpenCode/OpenAI format
				const openCodeTools = server.tools.map((tool) => ({
					type: "function",
					function: {
						name: tool.name,
						description: tool.description,
						parameters: tool.inputSchema,
					},
				}));
				allTools.push(...openCodeTools);
			}
		}

		// Add memory tools
		const memoryTools = await this.memoryIntegration.getTools();
		const memoryOpenCodeTools = memoryTools.map((tool) => ({
			type: "function",
			function: {
				name: tool.name,
				description: tool.description,
				parameters: tool.inputSchema,
			},
		}));
		allTools.push(...memoryOpenCodeTools);

		console.log(
			`🔧 Found ${allTools.length} tools for OpenCode agent ${agentId}`,
		);
		return allTools;
	}

	async executeTool(
		toolName: string,
		args: any,
		agentId: string,
	): Promise<any> {
		if (!this.initialized) {
			await this.initialize();
		}

		const servers = mcpManager.getServersForProvider(this.provider);

		// Check if this is a memory tool
		const memoryTools = await this.memoryIntegration.getTools();
		if (memoryTools.some((tool) => tool.name === toolName)) {
			try {
				console.log(`🧠 Executing memory tool ${toolName} for OpenCode agent ${agentId}`);
				const result = await this.memoryIntegration.callTool(toolName, args);
				return {
					type: "tool_result",
					tool_use_id: `tool_${Date.now()}`,
					content: result.content || [],
				};
			} catch (error) {
				console.error(`Failed to execute memory tool ${toolName}:`, error);
				return {
					type: "tool_result",
					tool_use_id: `tool_${Date.now()}`,
					content: [
						{
							type: "text",
							text: `Error executing memory tool: ${error}`,
						},
					],
					is_error: true,
				};
			}
		}

		for (const server of servers) {
			try {
				// TODO: Fix MCP server tool calling
				// const result = await mcpManager.callTool(
				// 	server.name,
				// 	toolName,
				// 	arguments,
				// );
				const result: any = { content: [] };
				
				if (result.is_error) {
					return {
						content: [
							{
								type: "text",
								text: `Error calling tool ${toolName}: ${result.content}`,
							},
						],
						is_error: true,
					};
				}
				
				return result;
			} catch (error) {
				console.error(`Failed to call tool ${toolName} on server:`, error);
				return {
					content: [
						{
							type: "text",
							text: `Error calling tool ${toolName}: ${error}`,
						},
					],
					is_error: true,
				};
			}
		}

		throw new Error(`Tool ${toolName} not found in any OpenCode MCP server`);
	}

	async cleanup(): Promise<void> {
		console.log("🧹 Cleaning up OpenCode MCP Integration...");
		await this.memoryIntegration.cleanup(); // Cleanup memory integration
		this.initialized = false;
	}
}

// Registry for provider integrations
export class ProviderMcpRegistry {
	private static integrations = new Map<
		AgentProvider,
		ProviderMcpIntegration
	>();

	static {
		// Register all provider integrations
		ProviderMcpRegistry.integrations.set(
			"claude-code",
			new ClaudeCodeMcpIntegration(),
		);
		ProviderMcpRegistry.integrations.set("codex", new CodexMcpIntegration());
		ProviderMcpRegistry.integrations.set(
			"opencode",
			new OpenCodeMcpIntegration(),
		);
	}

	static getIntegration(provider: AgentProvider): ProviderMcpIntegration {
		const integration = ProviderMcpRegistry.integrations.get(provider);
		if (!integration) {
			throw new Error(`No MCP integration found for provider: ${provider}`);
		}
		return integration;
	}

	static async initializeAll(): Promise<void> {
		console.log("🚀 Initializing all provider MCP integrations...");

		for (const [
			provider,
			integration,
		] of ProviderMcpRegistry.integrations.entries()) {
			try {
				await integration.initialize();
			} catch (error) {
				console.error(
					`❌ Failed to initialize ${provider} MCP integration:`,
					error,
				);
			}
		}

		console.log("✅ All provider MCP integrations initialized");
	}

	static async cleanupAll(): Promise<void> {
		console.log("🧹 Cleaning up all provider MCP integrations...");

		for (const [
			provider,
			integration,
		] of ProviderMcpRegistry.integrations.entries()) {
			try {
				await integration.cleanup();
			} catch (error) {
				console.error(
					`❌ Failed to cleanup ${provider} MCP integration:`,
					error,
				);
			}
		}

		console.log("✅ All provider MCP integrations cleaned up");
	}
}

// Export convenience functions
export const getProviderMcpIntegration = (provider: AgentProvider) =>
	ProviderMcpRegistry.getIntegration(provider);

export const initializeProviderMcpIntegrations = () =>
	ProviderMcpRegistry.initializeAll();

export const cleanupProviderMcpIntegrations = () =>
	ProviderMcpRegistry.cleanupAll();
