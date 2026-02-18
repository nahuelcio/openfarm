import { defineConfig } from "tsup";

export default defineConfig([
	// Main library bundles
	{
		entry: ["src/index.ts"],
		format: ["cjs", "esm"],
		dts: false, // Skip DTS for now due to Tauri issues
		splitting: false,
		sourcemap: true,
		clean: true,
		bundle: true,
		minify: false,
		treeshake: true,
		// Bundle only essential workspace dependencies
		noExternal: [
			"@openfarm/core",
			"@openfarm/logger",
			"@openfarm/result",
			"@openfarm/utils",
			"@openfarm/config",
		],
		// Keep most dependencies external for smaller bundle
		external: [
			"better-sqlite3",
			"pino",
			"pino-pretty",
			"uuid",
			"zod",
			"js-yaml",
			"ai",
			"@tauri-apps/api/core",
			"@tauri-apps/api/event",
			// Keep workspace packages external for lazy loading
			"@openfarm/git-adapter",
			"@openfarm/github-adapter",
			"@openfarm/azure-adapter",
			"@openfarm/mcp-marketplace",
		],
		outDir: "dist",
		target: "node18",
	},
	// CLI bundle (ESM for Ink compatibility)
	{
		entry: ["src/cli.ts"],
		format: ["esm"],
		splitting: false,
		sourcemap: true,
		bundle: true,
		minify: false,
		treeshake: true,
		noExternal: [
			"@openfarm/core",
			"@openfarm/logger",
			"@openfarm/result",
			"@openfarm/utils",
			"@openfarm/config",
		],
		external: [
			"better-sqlite3",
			"pino",
			"pino-pretty",
			"uuid",
			"zod",
			"js-yaml",
			"ai",
			// Keep workspace packages external for lazy loading
			"@openfarm/git-adapter",
			"@openfarm/github-adapter",
			"@openfarm/azure-adapter",
			"@openfarm/mcp-marketplace",
		],
		outDir: "dist",
		target: "node18",
		outExtension: () => ({ js: ".mjs" }),
	},
]);
