import type {
	ProviderConfig,
	McpServerConfig,
	AgentConfig,
	HookConfig,
	SubAgentConfig,
	AgentProvider,
} from "@/lib/store";

export interface ProviderConfigManager {
	// MCP Server management
	addMcpServer(providerId: string, config: McpServerConfig): ProviderConfig;
	updateMcpServer(
		providerId: string,
		serverId: string,
		config: Partial<McpServerConfig>,
	): ProviderConfig;
	removeMcpServer(providerId: string, serverId: string): ProviderConfig;
	getMcpServers(providerId: string): McpServerConfig[];
	
	// Agent management
	addAgent(providerId: string, config: AgentConfig): ProviderConfig;
	updateAgent(providerId: string, agentId: string, config: Partial<AgentConfig>): ProviderConfig;
	removeAgent(providerId: string, agentId: string): ProviderConfig;
	getAgents(providerId: string): AgentConfig[];
	
	// Hook management
	addHook(providerId: string, config: HookConfig): ProviderConfig;
	updateHook(providerId: string, hookId: string, config: Partial<HookConfig>): ProviderConfig;
	removeHook(providerId: string, hookId: string): ProviderConfig;
	getHooks(providerId: string): HookConfig[];
	
	// Sub-Agent management
	addSubAgent(providerId: string, config: SubAgentConfig): ProviderConfig;
	updateSubAgent(
		providerId: string,
		subAgentId: string,
		config: Partial<SubAgentConfig>,
	): ProviderConfig;
	removeSubAgent(providerId: string, subAgentId: string): ProviderConfig;
	getSubAgents(providerId: string): SubAgentConfig[];

	// Custom settings
	updateCustomSettings(
		providerId: string,
		settings: Record<string, unknown>,
	): ProviderConfig;
	getCustomSettings(providerId: string): Record<string, unknown>;

	// Utility functions
	getProviderConfig(providerId: string): ProviderConfig | null;
	getAllProviders(): ProviderConfig[];
	getProviderSummary(providerId: string): {
		basic: {
			name: string;
			connected: boolean;
			apiKey: string;
			defaultModel: string;
		};
		advanced: {
			mcpServers: number;
			customAgents: number;
			hooks: number;
			subAgents: number;
			customSettings: number;
		};
	} | null;
	exportAllConfigs(): Record<string, ProviderConfig>;

	// Validation
	validateProviderConfig(config: ProviderConfig): {
		valid: boolean;
		errors: string[];
	};
}

export function createProviderConfigManager(
	providers: ProviderConfig[],
): ProviderConfigManager {
	const getProvider = (providerId: string): ProviderConfig | null => {
		return providers.find((p) => p.id === providerId) || null;
	};

	const updateProvider = (
		providerId: AgentProvider,
		updater: (p: ProviderConfig) => ProviderConfig,
	) => {
		const index = providers.findIndex(p => p.id === providerId);
		if (index === -1) {
			throw new Error(`Provider ${providerId} not found`);
		}
		
		const updatedProvider = updater(providers[index]);
		providers[index] = updatedProvider;
		return updatedProvider;
	};

	return {
		// MCP Server management
		addMcpServer(providerId: string, config: McpServerConfig): ProviderConfig {
			return updateProvider(providerId as AgentProvider, (provider) => ({
				...provider,
				mcpServers: [...(provider.mcpServers || []), config],
			}));
		},

		updateMcpServer(
			providerId: string,
			serverId: string,
			config: Partial<McpServerConfig>,
		): ProviderConfig {
			return updateProvider(providerId as AgentProvider, (provider) => ({
				...provider,
				mcpServers: provider.mcpServers?.map(server =>
					server.id === serverId ? { ...server, ...config } : server
				) || [],
			}));
		},

		removeMcpServer(providerId: string, serverId: string): ProviderConfig {
			return updateProvider(providerId as AgentProvider, (provider) => ({
				...provider,
				mcpServers: provider.mcpServers?.filter(server => server.id !== serverId) || [],
			}));
		},

		getMcpServers(providerId: string): McpServerConfig[] {
			const provider = getProvider(providerId);
			return provider?.mcpServers || [];
		},

		// Agent management
		addAgent(providerId: string, config: AgentConfig): ProviderConfig {
			return updateProvider(providerId as AgentProvider, (provider) => ({
				...provider,
				customAgents: [...(provider.customAgents || []), config],
			}));
		},

		updateAgent(providerId: string, agentId: string, config: Partial<AgentConfig>): ProviderConfig {
			return updateProvider(providerId as AgentProvider, (provider) => ({
				...provider,
				customAgents: provider.customAgents?.map(agent =>
					agent.id === agentId ? { ...agent, ...config } : agent
				) || [],
			}));
		},

		removeAgent(providerId: string, agentId: string): ProviderConfig {
			return updateProvider(providerId as AgentProvider, (provider) => ({
				...provider,
				customAgents: provider.customAgents?.filter(agent => agent.id !== agentId) || [],
			}));
		},

		getAgents(providerId: string): AgentConfig[] {
			const provider = getProvider(providerId);
			return provider?.customAgents || [];
		},

		// Hook management
		addHook(providerId: string, config: HookConfig): ProviderConfig {
			return updateProvider(providerId as AgentProvider, (provider) => ({
				...provider,
				hooks: [...(provider.hooks || []), config],
			}));
		},

		updateHook(providerId: string, hookId: string, config: Partial<HookConfig>): ProviderConfig {
			return updateProvider(providerId as AgentProvider, (provider) => ({
				...provider,
				hooks: provider.hooks?.map(hook =>
					hook.id === hookId ? { ...hook, ...config } : hook
				) || [],
			}));
		},

		removeHook(providerId: string, hookId: string): ProviderConfig {
			return updateProvider(providerId as AgentProvider, (provider) => ({
				...provider,
				hooks: provider.hooks?.filter(hook => hook.id !== hookId) || [],
			}));
		},

		getHooks(providerId: string): HookConfig[] {
			const provider = getProvider(providerId);
			return provider?.hooks || [];
		},

		// Sub-Agent management
		addSubAgent(providerId: string, config: SubAgentConfig): ProviderConfig {
			return updateProvider(providerId as AgentProvider, (provider) => ({
				...provider,
				subAgents: [...(provider.subAgents || []), config],
			}));
		},

		updateSubAgent(
			providerId: string,
			subAgentId: string,
			config: Partial<SubAgentConfig>,
		): ProviderConfig {
			return updateProvider(providerId as AgentProvider, (provider) => ({
				...provider,
				subAgents: provider.subAgents?.map(subAgent =>
					subAgent.id === subAgentId ? { ...subAgent, ...config } : subAgent
				) || [],
			}));
		},

		removeSubAgent(providerId: string, subAgentId: string): ProviderConfig {
			return updateProvider(providerId as AgentProvider, (provider) => ({
				...provider,
				subAgents: provider.subAgents?.filter(subAgent => subAgent.id !== subAgentId) || [],
			}));
		},

		getSubAgents(providerId: string): SubAgentConfig[] {
			const provider = getProvider(providerId);
			return provider?.subAgents || [];
		},

		// Custom settings
		updateCustomSettings(
			providerId: string,
			settings: Record<string, unknown>,
		): ProviderConfig {
			return updateProvider(providerId as AgentProvider, (provider) => ({
				...provider,
				customSettings: { ...provider.customSettings, ...settings },
			}));
		},

		getCustomSettings(providerId: string): Record<string, unknown> {
			const provider = getProvider(providerId);
			return provider?.customSettings || {};
		},

		// Utility functions
		getProviderConfig(providerId: string): ProviderConfig | null {
			return getProvider(providerId);
		},

		getAllProviders(): ProviderConfig[] {
			return [...providers];
		},

		getProviderSummary(providerId: string): {
			basic: {
				name: string;
				connected: boolean;
				apiKey: string;
				defaultModel: string;
			};
			advanced: {
				mcpServers: number;
				customAgents: number;
				hooks: number;
				subAgents: number;
				customSettings: number;
			};
		} | null {
			const provider = getProvider(providerId);
			if (!provider) return null;

			return {
				basic: {
					name: provider.name,
					connected: provider.connected,
					apiKey: provider.apiKey ? "***" : "",
					defaultModel: provider.defaultModel,
				},
				advanced: {
					mcpServers: provider.mcpServers?.length || 0,
					customAgents: provider.customAgents?.length || 0,
					hooks: provider.hooks?.length || 0,
					subAgents: provider.subAgents?.length || 0,
					customSettings: Object.keys(provider.customSettings || {}).length,
				},
			};
		},

		exportAllConfigs(): Record<string, ProviderConfig> {
			const configs: Record<string, ProviderConfig> = {};
			for (const provider of providers) {
				configs[provider.id] = provider;
			}
			return configs;
		},

		// Validation
		validateProviderConfig(config: ProviderConfig): {
			valid: boolean;
			errors: string[];
		} {
			const errors: string[] = [];

			// Basic validation
			if (!config.id?.trim()) {
				errors.push("Provider ID is required");
			}
			if (!config.name?.trim()) {
				errors.push("Provider name is required");
			}
			if (!config.color?.trim()) {
				errors.push("Provider color is required");
			}

			// MCP Servers validation
			if (config.mcpServers) {
				config.mcpServers.forEach((server, index) => {
					if (!server.id?.trim()) {
						errors.push(`MCP Server ${index + 1}: ID is required`);
					}
					if (!server.name?.trim()) {
						errors.push(`MCP Server ${index + 1}: Name is required`);
					}
					if (!server.command?.trim()) {
						errors.push(`MCP Server ${index + 1}: Command is required`);
					}
				});
			}

			// Agents validation
			if (config.customAgents) {
				config.customAgents.forEach((agent, index) => {
					if (!agent.id?.trim()) {
						errors.push(`Agent ${index + 1}: ID is required`);
					}
					if (!agent.name?.trim()) {
						errors.push(`Agent ${index + 1}: Name is required`);
					}
				});
			}

			// Hooks validation
			if (config.hooks) {
				config.hooks.forEach((hook, index) => {
					if (!hook.id?.trim()) {
						errors.push(`Hook ${index + 1}: ID is required`);
					}
					if (!hook.name?.trim()) {
						errors.push(`Hook ${index + 1}: Name is required`);
					}
					if (!hook.script?.trim()) {
						errors.push(`Hook ${index + 1}: Script is required`);
					}
					if (!hook.triggerEvents || hook.triggerEvents.length === 0) {
						errors.push(`Hook ${index + 1}: At least one trigger event is required`);
					}
				});
			}

			// Sub-Agents validation
			if (config.subAgents) {
				config.subAgents.forEach((subAgent, index) => {
					if (!subAgent.id?.trim()) {
						errors.push(`Sub-Agent ${index + 1}: ID is required`);
					}
					if (!subAgent.name?.trim()) {
						errors.push(`Sub-Agent ${index + 1}: Name is required`);
					}
					if (!subAgent.parentAgent?.trim()) {
						errors.push(`Sub-Agent ${index + 1}: Parent agent is required`);
					}
					if (!subAgent.capability?.trim()) {
						errors.push(`Sub-Agent ${index + 1}: Capability is required`);
					}
				});
			}

			return {
				valid: errors.length === 0,
				errors,
			};
		},
	};
}

// Utility functions for working with provider configurations
export class ProviderConfigUtils {
	// Migration utilities
	static migrateFromOldConfig(oldConfig: Record<string, unknown>): ProviderConfig {
		const config = oldConfig as unknown as ProviderConfig;
		return {
			...config,
			mcpServers: config.mcpServers || [],
			customAgents: config.customAgents || [],
			hooks: config.hooks || [],
			subAgents: config.subAgents || [],
			endpoints: config.endpoints || [],
			customSettings: config.customSettings || {},
		};
	}

	// Export/Import utilities
	static exportProviderConfig(config: ProviderConfig): string {
		return JSON.stringify(config, null, 2);
	}

	static importProviderConfig(jsonString: string): ProviderConfig {
		try {
			return JSON.parse(jsonString) as ProviderConfig;
		} catch (error) {
			throw new Error("Invalid JSON format");
		}
	}

	// Template utilities
	static createMcpServerTemplate(
		id: string,
		name: string,
		provider: string,
	): McpServerConfig {
		return {
			id,
			name,
			command: "npx",
			args: [],
			env: {},
			enabled: true,
			provider: provider as AgentProvider,
			installedAt: new Date().toISOString(),
		};
	}

	static createAgentTemplate(
		id: string,
		name: string,
		description: string,
	): AgentConfig {
		return {
			id,
			name,
			description,
			enabled: true,
			customSettings: {},
		};
	}

	static createHookTemplate(id: string, name: string, type: "before" | "after" | "error"): HookConfig {
		return {
			id,
			name,
			type,
			script: "// Hook script here",
			enabled: true,
			triggerEvents: [],
			customSettings: {},
		};
	}

	static createSubAgentTemplate(
		id: string,
		name: string,
		parentAgent: string,
		capability: string,
	): SubAgentConfig {
		return {
			id,
			name,
			description: "",
			parentAgent,
			capability,
			enabled: true,
			customSettings: {},
		};
	}
}
