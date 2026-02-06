#!/usr/bin/env bun
/**
 * Development server for Web UI
 *
 * Usa Vite para servir el frontend con HMR.
 * En producción, esto sería un build estático servido por nginx/etc.
 */

import { createServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

interface ServerConfig {
  port?: number;
  open?: boolean;
}

// biome-ignore lint/complexity/useArrowFunction: <explanation>
const __dirname = (function () {
  try {
    return path.dirname(fileURLToPath(import.meta.url));
  } catch {
    // Fallback para cuando no hay import.meta.url
    return process.cwd();
  }
})();

export async function startWebServer(config: ServerConfig = {}): Promise<{
  url: string;
  close: () => Promise<void>;
}> {
  const { port = 3000, open = true } = config;

  // Buscar el root del package (donde está index.html)
  const packageRoot = path.resolve(__dirname, "..");

  const server = await createServer({
    root: packageRoot,
    server: {
      port,
      open,
    },
  });

  await server.listen();

  const url = `http://localhost:${port}`;
  console.log(`🚀 OpenFarm Web UI running at ${url}`);

  return {
    url,
    close: () => server.close(),
  };
}

// Entry point directo
if (import.meta.main) {
  startWebServer().catch((error) => {
    console.error("Failed to start server:", error);
    process.exit(1);
  });
}
