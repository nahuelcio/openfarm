/**
 * MCP Marketplace Types
 *
 * Core types for the MCP Marketplace system.
 * Defines the structure for catalog entries and installed MCPs.
 */

/** Schema for MCP configuration */
export interface McpConfigSchema {
	[key: string]: {
		type: "string" | "number" | "boolean" | "array" | "object";
		required?: boolean;
		description?: string;
		default?: unknown;
	};
}

/** A single MCP entry in the catalog */
export interface McpCatalogEntry {
	/** Unique identifier (e.g., 'github', 'figma') */
	id: string;
	/** Display name (e.g., 'GitHub', 'Figma') */
	name: string;
	/** Human-readable description */
	description: string;
	/** Icon identifier (e.g., 'github', 'figma') */
	icon: string;
	/** NPM package name */
	npmPackage: string;
	/** Category for filtering (e.g., 'dev-tools', 'productivity') */
	category: string;
	/** Default command-line arguments */
	defaultArgs: string[];
	/** Default environment variables */
	defaultEnv: Record<string, string>;
	/** Configuration schema for this MCP */
	configSchema: McpConfigSchema;
	/** Whether this MCP is officially verified */
	verified?: boolean;
	/** URL to documentation */
	docsUrl?: string;
}

/** Catalog metadata */
export interface McpCatalogMetadata {
	version: string;
	lastUpdated: string;
}

/** Full catalog structure */
export interface McpCatalog {
	version: string;
	mcps: McpCatalogEntry[];
}

/** An MCP that has been installed by the user */
export interface InstalledMcp {
	/** Unique installation ID */
	id: string;
	/** Reference to catalog entry ID */
	catalogEntryId: string;
	/** Custom name (optional, defaults to catalog name) */
	displayName?: string;
	/** Actual command to execute */
	command: string;
	/** Command-line arguments */
	args: string[];
	/** Environment variables */
	env: Record<string, string>;
	/** Whether this MCP is enabled */
	enabled: boolean;
	/** When this MCP was installed */
	installedAt: string;
	/** User's custom config (overrides defaults) */
	configOverrides: Record<string, unknown>;
}

/** MCP installation result */
export interface McpInstallResult {
	success: boolean;
	installedMcp?: InstalledMcp;
	error?: string;
}

/** Errors */
export class McpCatalogError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "McpCatalogError";
	}
}

export class McpInstallError extends Error {
	constructor(
		message: string,
		public readonly cause?: string,
	) {
		super(message);
		this.name = "McpInstallError";
	}
}
