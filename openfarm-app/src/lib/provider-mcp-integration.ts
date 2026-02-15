import type { AgentProvider } from "@/lib/store";
import { mcpManager, type McpServer } from "@/lib/mcp-manager";

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

	async initialize(): Promise<void> {
		if (this.initialized) return;
		
		console.log("🔧 Initializing Claude Code MCP Integration...");
		
		// Load MCP servers for Claude Code
		await mcpManager.loadServers();
		
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
				const claudeTools = server.tools.map(tool => ({
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

		console.log(`🔧 Found ${allTools.length} tools for Claude Code agent ${agentId}`);
		return allTools;
	}

	async executeTool(toolName: string, args: any, agentId: string): Promise<any> {
		if (!this.initialized) {
			await this.initialize();
		}

		const servers = mcpManager.getServersForProvider(this.provider);
		
		// Find the server that has this tool
		for (const server of servers) {
			if (server.connected && server.tools.some(tool => tool.name === toolName)) {
				try {
					console.log(`🔧 Executing tool ${toolName} for Claude Code agent ${agentId}`);
					const result = await mcpManager.callTool(server.config.id, toolName, args);
					
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
		// MCP Manager cleanup is handled globally
		this.initialized = false;
	}
}

export class CodexMcpIntegration implements ProviderMcpIntegration {
	provider: AgentProvider = "codex";
	private initialized = false;

	async initialize(): Promise<void> {
		if (this.initialized) return;
		
		console.log("🔧 Initializing Codex MCP Integration...");
		await mcpManager.loadServers();
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
			if (server.connected) {
				// Convert MCP tools to GitHub Copilot format
				const copilotTools = server.tools.map(tool => ({
					name: tool.name,
					description: tool.description,
					parameters: tool.inputSchema,
					// GitHub Copilot specific format
					function: {
						name: tool.name,
						description: tool.description,
						parameters: tool.inputSchema,
					},
				}));
				allTools.push(...copilotTools);
			}
		}

		console.log(`🔧 Found ${allTools.length} tools for Codex agent ${agentId}`);
		return allTools;
	}

	async executeTool(toolName: string, args: any, agentId: string): Promise<any> {
		if (!this.initialized) {
			await this.initialize();
		}

		const servers = mcpManager.getServersForProvider(this.provider);
		
		for (const server of servers) {
			if (server.connected && server.tools.some(tool => tool.name === toolName)) {
				try {
					console.log(`🔧 Executing tool ${toolName} for Codex agent ${agentId}`);
					const result = await mcpManager.callTool(server.config.id, toolName, args);
					
					// Convert MCP result to GitHub Copilot format
					return {
						tool_call_id: `tool_${Date.now()}`,
						result: result.content || [],
					};
				} catch (error) {
					console.error(`❌ Tool execution failed:`, error);
					return {
						error: error instanceof Error ? error.message : "Unknown error",
					};
				}
			}
		}

		throw new Error(`Tool ${toolName} not found in any Codex MCP server`);
	}

	async cleanup(): Promise<void> {
		console.log("🧹 Cleaning up Codex MCP Integration...");
		this.initialized = false;
	}
}

export class OpenCodeMcpIntegration implements ProviderMcpIntegration {
	provider: AgentProvider = "opencode";
	private initialized = false;

	async initialize(): Promise<void> {
		if (this.initialized) return;
		
		console.log("🔧 Initializing OpenCode MCP Integration...");
		await mcpManager.loadServers();
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
				const openCodeTools = server.tools.map(tool => ({
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

		console.log(`🔧 Found ${allTools.length} tools for OpenCode agent ${agentId}`);
		return allTools;
	}

	async executeTool(toolName: string, args: any, agentId: string): Promise<any> {
		if (!this.initialized) {
			await this.initialize();
		}

		const servers = mcpManager.getServersForProvider(this.provider);
		
		for (const server of servers) {
			if (server.connected && server.tools.some(tool => tool.name === toolName)) {
				try {
					console.log(`🔧 Executing tool ${toolName} for OpenCode agent ${agentId}`);
					const result = await mcpManager.callTool(server.config.id, toolName, args);
					
					// Convert MCP result to OpenCode format
					return {
						tool_call_id: `tool_${Date.now()}`,
						content: result.content || [],
					};
				} catch (error) {
					console.error(`❌ Tool execution failed:`, error);
					return {
						content: [{
							type: "text",
							text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
						}],
					};
				}
			}
		}

		throw new Error(`Tool ${toolName} not found in any OpenCode MCP server`);
	}

	async cleanup(): Promise<void> {
		console.log("🧹 Cleaning up OpenCode MCP Integration...");
		this.initialized = false;
	}
}

// Registry for provider integrations
export class ProviderMcpRegistry {
	private static integrations = new Map<AgentProvider, ProviderMcpIntegration>();

	static {
		// Register all provider integrations
		this.integrations.set("claude-code", new ClaudeCodeMcpIntegration());
		this.integrations.set("codex", new CodexMcpIntegration());
		this.integrations.set("opencode", new OpenCodeMcpIntegration());
	}

	static getIntegration(provider: AgentProvider): ProviderMcpIntegration {
		const integration = this.integrations.get(provider);
		if (!integration) {
			throw new Error(`No MCP integration found for provider: ${provider}`);
		}
		return integration;
	}

	static async initializeAll(): Promise<void> {
		console.log("🚀 Initializing all provider MCP integrations...");
		
		for (const [provider, integration] of this.integrations.entries()) {
			try {
				await integration.initialize();
			} catch (error) {
				console.error(`❌ Failed to initialize ${provider} MCP integration:`, error);
			}
		}
		
		console.log("✅ All provider MCP integrations initialized");
	}

	static async cleanupAll(): Promise<void> {
		console.log("🧹 Cleaning up all provider MCP integrations...");
		
		for (const [provider, integration] of this.integrations.entries()) {
			try {
				await integration.cleanup();
			} catch (error) {
				console.error(`❌ Failed to cleanup ${provider} MCP integration:`, error);
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
