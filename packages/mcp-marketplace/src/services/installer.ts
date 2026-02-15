import { execSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { getCatalogEntry } from "../index.js";
import type {
	InstalledMcp,
	McpCatalogEntry,
	McpInstallResult,
} from "../types.js";

export class McpInstaller {
	private installedMcps: Map<string, InstalledMcp> = new Map();
	private dryRun = false;

	setDryRun(enabled: boolean): void {
		this.dryRun = enabled;
	}

	async install(mcpId: string): Promise<McpInstallResult> {
		const catalogEntry = getCatalogEntry(mcpId);

		if (!catalogEntry) {
			return {
				success: false,
				error: `MCP '${mcpId}' not found in catalog`,
			};
		}

		if (this.installedMcps.has(mcpId)) {
			return {
				success: false,
				error: `MCP '${mcpId}' is already installed`,
			};
		}

		try {
			await this.installNpmPackage(catalogEntry);

			const installedMcp = this.createInstalledMcp(catalogEntry);
			this.installedMcps.set(mcpId, installedMcp);

			return {
				success: true,
				installedMcp,
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : "Unknown error",
			};
		}
	}

	async uninstall(
		mcpId: string,
	): Promise<{ success: boolean; error?: string }> {
		if (!this.installedMcps.has(mcpId)) {
			return {
				success: false,
				error: `MCP '${mcpId}' is not installed`,
			};
		}

		this.installedMcps.delete(mcpId);

		return { success: true };
	}

	isInstalled(mcpId: string): boolean {
		return this.installedMcps.has(mcpId);
	}

	getInstalled(mcpId: string): InstalledMcp | undefined {
		return this.installedMcps.get(mcpId);
	}

	listInstalled(): InstalledMcp[] {
		return Array.from(this.installedMcps.values());
	}

	updateConfig(
		mcpId: string,
		config: Partial<InstalledMcp>,
	): InstalledMcp | undefined {
		const existing = this.installedMcps.get(mcpId);
		if (!existing) {
			return undefined;
		}

		const updated: InstalledMcp = {
			...existing,
			...config,
		};

		this.installedMcps.set(mcpId, updated);
		return updated;
	}

	private async installNpmPackage(entry: McpCatalogEntry): Promise<void> {
		if (this.dryRun) {
			return;
		}

		const packageName = entry.npmPackage;

		try {
			execSync(`npm install -g ${packageName}`, {
				stdio: "pipe",
				encoding: "utf-8",
			});
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : "npm install failed";
			throw new Error(`Failed to install ${packageName}: ${errorMessage}`);
		}
	}

	private createInstalledMcp(entry: McpCatalogEntry): InstalledMcp {
		const command = this.detectCommand(entry.npmPackage);

		return {
			id: randomUUID(),
			catalogEntryId: entry.id,
			displayName: entry.name,
			command,
			args: [...entry.defaultArgs],
			env: { ...entry.defaultEnv },
			enabled: true,
			installedAt: new Date().toISOString(),
			configOverrides: {},
		};
	}

	private detectCommand(npmPackage: string): string {
		return `npx -y ${npmPackage}`;
	}
}

export const mcpInstaller = new McpInstaller();
