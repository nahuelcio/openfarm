import type { InstalledMcp } from "@openfarm/mcp-marketplace";
import { mcpManager } from "@openfarm/mcp-marketplace";

export interface McpServerConfig {
	name: string;
	command: string;
	args: string[];
	env?: Record<string, string>;
}

export function getInstalledMcpServers(): McpServerConfig[] {
	const installed = mcpManager.listInstalled();

	return installed
		.filter((mcp) => mcp.enabled)
		.map((mcp) => ({
			name: mcp.displayName || mcp.catalogEntryId,
			command: mcp.command,
			args: mcp.args,
			env: mcp.env,
		}));
}

export function getMcpServerIds(): string[] {
	const installed = mcpManager.listInstalled();
	return installed
		.filter((mcp) => mcp.enabled)
		.map((mcp) => mcp.catalogEntryId);
}

export function getMcpServerById(id: string): InstalledMcp | undefined {
	return mcpManager.getInstalled(id);
}

export function isMcpInstalled(id: string): boolean {
	return mcpManager.isInstalled(id);
}
