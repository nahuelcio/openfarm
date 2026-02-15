import { getCatalogEntries } from "../index.js";
import type { InstalledMcp, McpCatalogEntry } from "../types.js";
import { McpInstaller } from "./installer.js";

export class McpManager {
	private installer: McpInstaller;

	constructor() {
		this.installer = new McpInstaller();
	}

	listAvailable(): McpCatalogEntry[] {
		return getCatalogEntries();
	}

	listInstalled(): InstalledMcp[] {
		return this.installer.listInstalled();
	}

	getInstalled(mcpId: string): InstalledMcp | undefined {
		return this.installer.getInstalled(mcpId);
	}

	isInstalled(mcpId: string): boolean {
		return this.installer.isInstalled(mcpId);
	}

	async install(mcpId: string) {
		return this.installer.install(mcpId);
	}

	async uninstall(mcpId: string) {
		return this.installer.uninstall(mcpId);
	}

	async updateConfig(
		mcpId: string,
		config: Partial<InstalledMcp>,
	): Promise<{ success: boolean; error?: string }> {
		const updated = this.installer.updateConfig(mcpId, config);

		if (!updated) {
			return {
				success: false,
				error: `MCP '${mcpId}' is not installed`,
			};
		}

		return { success: true };
	}

	searchAvailable(query: string): McpCatalogEntry[] {
		const lowerQuery = query.toLowerCase();
		const entries = getCatalogEntries();

		return entries.filter(
			(entry) =>
				entry.name.toLowerCase().includes(lowerQuery) ||
				entry.description.toLowerCase().includes(lowerQuery) ||
				entry.category.toLowerCase().includes(lowerQuery),
		);
	}

	getByCategory(category: string): McpCatalogEntry[] {
		const entries = getCatalogEntries();
		return entries.filter((entry) => entry.category === category);
	}

	getCategories(): string[] {
		const entries = getCatalogEntries();
		const categories = new Set(entries.map((e) => e.category));
		return Array.from(categories);
	}

	setDryRun(enabled: boolean): void {
		this.installer.setDryRun(enabled);
	}
}

export const mcpManager = new McpManager();
