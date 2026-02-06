import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { WebSocketServer } from "ws";
import { isLocalhost } from "./config.ts";
import { PtyManager } from "./pty-manager.ts";
import type { WebServerConfig, WebServerHandle } from "./types.ts";
import { WsHandler } from "./ws-handler.ts";

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

function getStaticDir(): string {
  // Resolve static dir relative to this file's location
  const thisDir = path.dirname(new URL(import.meta.url).pathname);
  // In dev: src/ → ../static/
  // In dist: dist/ → ../static/
  const candidates = [
    path.resolve(thisDir, "..", "static"),
    path.resolve(thisDir, "static"),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return candidates[0];
}

async function findAvailablePort(
  startPort: number,
  host: string
): Promise<number> {
  for (let port = startPort; port < startPort + 10; port++) {
    const available = await new Promise<boolean>((resolve) => {
      const server = http.createServer();
      server.listen(port, host, () => {
        server.close(() => resolve(true));
      });
      server.on("error", () => resolve(false));
    });
    if (available) {
      return port;
    }
  }
  return startPort;
}

export async function startWebServer(
  config: WebServerConfig
): Promise<WebServerHandle> {
  const staticDir = getStaticDir();
  const port = await findAvailablePort(config.port, config.host);

  if (port !== config.port) {
    console.log(`[web-ui] Port ${config.port} in use, using ${port} instead.`);
  }

  // Warn if binding to non-localhost
  if (!isLocalhost(config.host)) {
    console.warn(
      `\n⚠️  WARNING: Binding to ${config.host} exposes this server to the network.`
    );
    console.warn("   Anyone with network access can control your terminal.\n");
    if (config.token) {
      console.log(`   Security token: ${config.token}`);
      console.log(
        `   URL with token: http://${config.host}:${port}?token=${config.token}\n`
      );
    }
  }

  // Create PTY
  const pty = new PtyManager({
    command: config.command,
    cwd: config.cwd,
  });

  // Create WS handler with cleanup callback
  let serverHandle: { close: () => void } | null = null;
  const wsHandler = new WsHandler(pty, {
    onCleanup: () => {
      console.log("[web-ui] All clients disconnected. Shutting down...");
      serverHandle?.close();
    },
  });

  // Start PTY
  pty.start();

  // Create HTTP server
  const httpServer = http.createServer((req, res) => {
    const url = new URL(req.url ?? "/", `http://${req.headers.host}`);

    // Token validation for remote access
    if (config.token && !isLocalhost(config.host)) {
      const urlToken = url.searchParams.get("token");
      if (urlToken !== config.token && url.pathname !== "/api/status") {
        res.writeHead(403, { "Content-Type": "text/plain" });
        res.end("Forbidden: invalid or missing token");
        return;
      }
    }

    // API routes
    if (url.pathname === "/api/status") {
      const status = {
        version: "0.1.0",
        project: path.basename(config.cwd),
        uptime: process.uptime(),
        clients: wsHandler.getClientCount(),
        ptyAlive: pty.isAlive(),
      };
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(status));
      return;
    }

    // Static file serving
    let filePath = url.pathname === "/" ? "/index.html" : url.pathname;
    // If token is set, inject it into the HTML page URL
    filePath = path.join(staticDir, filePath);

    const ext = path.extname(filePath);
    const contentType = MIME_TYPES[ext] ?? "application/octet-stream";

    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("Not found");
        return;
      }
      res.writeHead(200, { "Content-Type": contentType });
      res.end(data);
    });
  });

  // Create WebSocket server
  const wss = new WebSocketServer({ server: httpServer });

  wss.on("connection", (ws, req) => {
    // Origin validation for localhost binding
    if (isLocalhost(config.host)) {
      const origin = req.headers.origin ?? "";
      const isValidOrigin =
        !origin ||
        origin.includes("localhost") ||
        origin.includes("127.0.0.1") ||
        origin.includes("[::1]");
      if (!isValidOrigin) {
        console.warn(`[web-ui] Rejected connection from origin: ${origin}`);
        ws.close(1008, "Invalid origin");
        return;
      }
    }

    // Token validation for remote access on WebSocket
    if (config.token && !isLocalhost(config.host)) {
      const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
      const urlToken = url.searchParams.get("token");
      if (urlToken !== config.token) {
        ws.close(1008, "Invalid token");
        return;
      }
    }

    wsHandler.handleConnection(ws);
  });

  // Start listening
  await new Promise<void>((resolve) => {
    httpServer.listen(port, config.host, () => resolve());
  });

  const url = `http://${config.host}:${port}`;
  console.log(`OpenFarm Web UI running at ${url}`);

  // Open browser
  if (config.open) {
    const openUrl = config.token ? `${url}?token=${config.token}` : url;
    try {
      const openCmd =
        process.platform === "darwin"
          ? "open"
          : process.platform === "win32"
            ? "start"
            : "xdg-open";
      const { spawn: spawnChild } = await import("node:child_process");
      const child = spawnChild(openCmd, [openUrl], {
        detached: true,
        stdio: "ignore",
      });
      child.unref();
    } catch {
      // Silently fail if browser can't be opened
    }
  }

  const close = () => {
    wsHandler.destroy();
    pty.kill();
    httpServer.close();
  };

  serverHandle = { close };

  return { url, token: config.token, close };
}
