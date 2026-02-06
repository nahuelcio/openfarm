import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "runtime/index": "src/runtime/index.ts",
    "create-web-app": "src/create-web-app.tsx",
    server: "src/server.ts",
  },
  format: ["cjs", "esm"],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  external: ["react", "react-dom", "vite", "lightningcss"],
});
