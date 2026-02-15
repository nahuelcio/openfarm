import type { AppSettings, ProviderConfig, AgentOption, Agent, AgentConfig } from "@/lib/store";
import { createProviderConfigManager } from "./provider-config-manager";
import { scanSystemMcpConfigs, getPlatformDefaults } from "./mcp-system-scanner";

/**
 * Read and display current provider configuration
 */
export async function readCurrentProviderConfiguration(settings: AppSettings) {
	const manager = createProviderConfigManager(settings.providers);
	
	console.group("📋 Current Provider Configuration");
	
	// Platform information
	const platformDefaults = getPlatformDefaults();
	console.log("\n🖥️ Platform Information:");
	console.log("  Platform:", navigator.platform || 'unknown');
	console.log("  Home Directory:", platformDefaults.home);
	console.log("  Config Paths:", platformDefaults.config);
	console.log("  Data Paths:", platformDefaults.data);
	
	// System MCP configurations
	console.log("\n🔍 System MCP Scan:");
	try {
		const systemConfigs = await scanSystemMcpConfigs();
		console.log(`  Found ${systemConfigs.length} system MCP configurations:`);
		systemConfigs.forEach((config, index) => {
			console.log(`    ${index + 1}. ${config.name} (${config.id})`);
			console.log(`       - Command: ${config.command}`);
			console.log(`       - Args: ${config.args?.join(' ') || 'none'}`);
			console.log(`       - Provider: ${config.provider}`);
			console.log(`       - Enabled: ${config.enabled}`);
		});
	} catch (error) {
		console.log("  Could not scan system MCP configurations:", error);
	}
	
	// Overall summary
	console.log("\n🏠 Overall Settings:");
	console.log("  Default Provider:", settings.defaultProvider);
	console.log("  Default Model:", settings.defaultModel);
	console.log("  Temperature:", settings.temperature);
	console.log("  Max Tokens:", settings.maxTokens);
	console.log("  Auto PR:", settings.autoPR);
	console.log("  Branch Convention:", settings.branchConvention);
	
	// Provider details
	settings.providers.forEach(provider => {
		const summary = manager.getProviderSummary(provider.id);
		if (summary) {
			console.log(`\n🔧 ${provider.name} (${provider.id})`);
			console.log("  Basic Configuration:");
			console.log("    - Name:", summary.basic.name);
			console.log("    - Connected:", summary.basic.connected);
			console.log("    - API Key:", summary.basic.apiKey);
			console.log("    - Default Model:", summary.basic.defaultModel);
			
			console.log("  Available Agents:");
			if (provider.agents && provider.agents.length > 0) {
				provider.agents.forEach((agent, index) => {
					console.log(`    ${index + 1}. ${agent.name} (${agent.id})`);
					console.log(`       - Description: ${agent.description}`);
					console.log(`       - Default: ${provider.defaultAgent === agent.id ? 'YES' : 'NO'}`);
				});
			} else {
				console.log("    - No agents configured");
			}
			
			console.log("  Advanced Configuration:");
			console.log("    - MCP Servers:", summary.advanced.mcpServers);
			console.log("    - Custom Agents:", summary.advanced.customAgents);
			console.log("    - Hooks:", summary.advanced.hooks);
			console.log("    - Sub-Agents:", summary.advanced.subAgents);
			console.log("    - Custom Settings:", summary.advanced.customSettings);
			
			// Detailed configuration
			const fullConfig = manager.getProviderConfig(provider.id);
			if (fullConfig) {
				if (fullConfig.mcpServers?.length) {
					console.log("  MCP Servers Details:");
					fullConfig.mcpServers.forEach((server, index) => {
						console.log(`    ${index + 1}. ${server.name} (${server.id})`);
						console.log(`       - Command: ${server.command}`);
						console.log(`       - Args: ${server.args?.join(' ') || 'none'}`);
						console.log(`       - Enabled: ${server.enabled}`);
						console.log(`       - Provider: ${server.provider}`);
					});
				}
				
				if (fullConfig.customAgents?.length) {
					console.log("  Custom Agents Details:");
					fullConfig.customAgents.forEach((agent, index) => {
						console.log(`    ${index + 1}. ${agent.name} (${agent.id})`);
						console.log(`       - Description: ${agent.description}`);
						console.log(`       - Mode: ${agent.mode || 'default'}`);
						console.log(`       - Enabled: ${agent.enabled}`);
						console.log(`       - Custom Settings:`, agent.customSettings);
					});
				}
				
				if (fullConfig.hooks?.length) {
					console.log("  Hooks Details:");
					fullConfig.hooks.forEach((hook, index) => {
						console.log(`    ${index + 1}. ${hook.name} (${hook.id})`);
						console.log(`       - Type: ${hook.type}`);
						console.log(`       - Trigger Events: ${hook.triggerEvents.join(', ')}`);
						console.log(`       - Enabled: ${hook.enabled}`);
						console.log(`       - Script Length: ${hook.script.length} chars`);
					});
				}
				
				if (fullConfig.subAgents?.length) {
					console.log("  Sub-Agents Details:");
					fullConfig.subAgents.forEach((subAgent, index) => {
						console.log(`    ${index + 1}. ${subAgent.name} (${subAgent.id})`);
						console.log(`       - Parent Agent: ${subAgent.parentAgent}`);
						console.log(`       - Capability: ${subAgent.capability}`);
						console.log(`       - Model: ${subAgent.model || 'parent default'}`);
						console.log(`       - Enabled: ${subAgent.enabled}`);
					});
				}
				
				if (Object.keys(fullConfig.customSettings || {}).length) {
					console.log("  Custom Settings Details:");
					Object.entries(fullConfig.customSettings || {}).forEach(([key, value]) => {
						console.log(`    - ${key}:`, value);
					});
				}
			}
		}
	});
	
	console.groupEnd();
	
	return {
		summary: {
			totalProviders: settings.providers.length,
			connectedProviders: settings.providers.filter(p => p.connected).length,
			totalMcpServers: settings.providers.reduce((acc, p) => acc + (p.mcpServers?.length || 0), 0),
			totalCustomAgents: settings.providers.reduce((acc, p) => acc + (p.customAgents?.length || 0), 0),
			totalHooks: settings.providers.reduce((acc, p) => acc + (p.hooks?.length || 0), 0),
			totalSubAgents: settings.providers.reduce((acc, p) => acc + (p.subAgents?.length || 0), 0),
			totalAgents: settings.providers.reduce((acc, p) => acc + (p.agents?.length || 0), 0),
		},
		providers: settings.providers.map(p => ({
			...manager.getProviderSummary(p.id),
			agents: p.agents || [],
			defaultAgent: p.defaultAgent,
		})),
		details: settings.providers.map(p => manager.getProviderConfig(p.id)),
	};
}

/**
 * List all agents from all providers
 */
export function listAllAgents(settings: AppSettings) {
	console.group("🤖 Available Agents by Provider");
	
	let totalAgents = 0;
	
	settings.providers.forEach(provider => {
		console.log(`\n🔧 ${provider.name} (${provider.id})`);
		console.log(`  Default Model: ${provider.defaultModel}`);
		
		if (provider.agents && provider.agents.length > 0) {
			console.log(`  Available Agents (${provider.agents.length}):`);
			provider.agents.forEach((agent, index) => {
				const isDefault = provider.defaultAgent === agent.id;
				console.log(`    ${index + 1}. ${agent.name} (${agent.id}) ${isDefault ? '⭐' : ''}`);
				console.log(`       - Description: ${agent.description}`);
				if (isDefault) {
					console.log(`       - Status: Default agent for this provider`);
				}
			});
			totalAgents += provider.agents.length;
		} else {
			console.log("  Available Agents: None configured");
		}
		
		// Show custom agents if any
		const customAgents = provider.customAgents || [];
		if (customAgents.length > 0) {
			console.log(`  Custom Agents (${customAgents.length}):`);
			customAgents.forEach((agent, index) => {
				console.log(`    C${index + 1}. ${agent.name} (${agent.id})`);
				console.log(`       - Description: ${agent.description}`);
				console.log(`       - Mode: ${agent.mode || 'default'}`);
				console.log(`       - Enabled: ${agent.enabled ? 'YES' : 'NO'}`);
			});
			totalAgents += customAgents.length;
		}
	});
	
	console.log(`\n📊 Summary: ${totalAgents} total agents across ${settings.providers.length} providers`);
	console.groupEnd();
	
	return {
		totalAgents,
		providers: settings.providers.map(p => ({
			id: p.id,
			name: p.name,
			defaultModel: p.defaultModel,
			defaultAgent: p.defaultAgent,
			builtInAgents: p.agents || [],
			customAgents: p.customAgents || [],
			totalAgents: (p.agents?.length || 0) + (p.customAgents?.length || 0),
		})),
	};
}

/**
 * Get agents for a specific provider
 */
export function getProviderAgents(settings: AppSettings, providerId: string) {
	const provider = settings.providers.find(p => p.id === providerId);
	if (!provider) {
		console.log(`❌ Provider ${providerId} not found`);
		return null;
	}
	
	console.group(`🤖 Agents for ${provider.name} (${providerId})`);
	console.log(`  Default Model: ${provider.defaultModel}`);
	console.log(`  Default Agent: ${provider.defaultAgent || 'None'}`);
	
	const allAgents: (AgentOption | AgentConfig)[] = [];
	
	// Built-in agents
	if (provider.agents && provider.agents.length > 0) {
		console.log(`\n  Built-in Agents (${provider.agents.length}):`);
		provider.agents.forEach((agent, index) => {
			const isDefault = provider.defaultAgent === agent.id;
			console.log(`    ${index + 1}. ${agent.name} (${agent.id}) ${isDefault ? '⭐' : ''}`);
			console.log(`       - Description: ${agent.description}`);
			if (isDefault) {
				console.log(`       - Status: Default agent for this provider`);
			}
			allAgents.push(agent);
		});
	} else {
		console.log("  Built-in Agents: None");
	}
	
	// Custom agents
	const customAgents = provider.customAgents || [];
	if (customAgents.length > 0) {
		console.log(`\n  Custom Agents (${customAgents.length}):`);
		customAgents.forEach((agent, index) => {
			console.log(`    C${index + 1}. ${agent.name} (${agent.id})`);
			console.log(`       - Description: ${agent.description}`);
			console.log(`       - Mode: ${agent.mode || 'default'}`);
			console.log(`       - Enabled: ${agent.enabled ? 'YES' : 'NO'}`);
			console.log(`       - Custom Settings:`, agent.customSettings);
			allAgents.push(agent);
		});
	} else {
		console.log("  Custom Agents: None");
	}
	
	console.log(`\n📊 Total: ${allAgents.length} agents (${provider.agents?.length || 0} built-in, ${customAgents.length} custom)`);
	console.groupEnd();
	
	return {
		provider: {
			id: provider.id,
			name: provider.name,
			defaultModel: provider.defaultModel,
			defaultAgent: provider.defaultAgent,
		},
		agents: allAgents,
		builtInAgents: provider.agents || [],
		customAgents: customAgents,
	};
}

/**
 * Get configuration as JSON for export
 */
export function exportConfigurationAsJson(settings: AppSettings): string {
	const manager = createProviderConfigManager(settings.providers);
	const configs = manager.exportAllConfigs();
	
	return JSON.stringify({
		timestamp: new Date().toISOString(),
		settings: {
			defaultProvider: settings.defaultProvider,
			defaultModel: settings.defaultModel,
			temperature: settings.temperature,
			maxTokens: settings.maxTokens,
			systemPrompt: settings.systemPrompt,
			autoPR: settings.autoPR,
			branchConvention: settings.branchConvention,
		},
		providers: configs,
	}, null, 2);
}

/**
 * Validate all provider configurations
 */
export function validateAllConfigurations(settings: AppSettings) {
	const manager = createProviderConfigManager(settings.providers);
	const results: Record<string, { valid: boolean; errors: string[] }> = {};
	
	settings.providers.forEach(provider => {
		const validation = manager.validateProviderConfig(provider);
		results[provider.id] = validation;
	});
	
	return results;
}
