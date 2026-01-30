import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"],
  dts: false, // Disable auto dts generation, use tsc manually if needed
  splitting: false,
  sourcemap: true,
  clean: true,
  bundle: true,
  external: [],
  outDir: "dist",
  target: "node18",
});
