import { defineConfig } from "tsup";

export default defineConfig([
	// Main library bundles
	{
		entry: ["src/index.ts"],
		format: ["cjs", "esm"],
		dts: true,
		splitting: false,
		sourcemap: true,
		clean: true,
		bundle: true,
		minify: false,
		treeshake: true,
		// Bundle all workspace dependencies
		noExternal: [
			"@openfarm/core",
			"@openfarm/types",
			"@openfarm/logger",
			"@openfarm/result",
			"@openfarm/utils",
			"@openfarm/config",
			"@openfarm/agent-runner",
			"@openfarm/workflow-engine",
			"@openfarm/analysis",
			"@openfarm/coding-engines",
			"@openfarm/git-adapter",
			"@openfarm/github-adapter",
			"@openfarm/azure-adapter",
		],
		// Keep external npm dependencies external
		external: [
			"better-sqlite3",
			"pino",
			"pino-pretty",
			"uuid",
			"zod",
			"js-yaml",
			"ai",
		],
		outDir: "dist",
		target: "node18",
	},
	// CLI bundle (separate to add shebang)
	{
		entry: ["src/cli.ts"],
		format: ["cjs"],
		splitting: false,
		sourcemap: true,
		bundle: true,
		minify: false,
		treeshake: true,
		noExternal: [
			"@openfarm/core",
			"@openfarm/types",
			"@openfarm/logger",
			"@openfarm/result",
			"@openfarm/utils",
			"@openfarm/config",
			"@openfarm/agent-runner",
			"@openfarm/workflow-engine",
			"@openfarm/analysis",
			"@openfarm/coding-engines",
			"@openfarm/git-adapter",
			"@openfarm/github-adapter",
			"@openfarm/azure-adapter",
		],
		external: [
			"better-sqlite3",
			"pino",
			"pino-pretty",
			"uuid",
			"zod",
			"js-yaml",
			"ai",
		],
		outDir: "dist",
		target: "node18",
		esbuildOptions(options) {
			options.banner = {
				js: "#!/usr/bin/env node",
			};
		},
	},
]);
