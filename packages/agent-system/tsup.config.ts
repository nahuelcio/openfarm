import { defineConfig } from "tsup";

export default defineConfig({
	entry: ["src/index.ts"],
	format: ["cjs", "esm"],
	dts: {
		resolve: false,
	},
	clean: true,
	sourcemap: true,
	external: ["@openfarm/core", "@openfarm/logger", "@openfarm/result"],
});
