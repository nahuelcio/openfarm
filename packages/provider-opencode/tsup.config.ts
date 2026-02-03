import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  bundle: true,
  minify: false,
  external: ["@openfarm/sdk", "@openfarm/core"],
  outDir: "dist",
  target: "node18",
});
