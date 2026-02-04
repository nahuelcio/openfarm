/**
 * Remote Server
 *
 * WebSocket server that exposes OpenFarm functionality for remote control.
 * Allows controlling task loops from a central TUI.
 */

import { randomUUID } from "node:crypto";
import { hostname, platform } from "node:os";
import { logger } from "@openfarm/logger";
import type {
  TaskLoopOrchestrator,
  TaskLoopSession,
} from "@openfarm/task-loop";
import { type WebSocket, WebSocketServer } from "ws";
import packageJson from "../package.json";
import type {
  ClientMessage,
  RemoteServerConfig,
  RemoteSystemInfo,
  ServerMessage,
} from "./types";

interface ClientConnection {
  ws: WebSocket;
  id: string;
  authenticated: boolean;
  lastPing: number;
  instanceId?: string;
}

/**
 * OpenFarm Remote Server
 *
 * Usage:
 * ```typescript
 * const server = new RemoteServer({
 *   port: 8080,
 *   authToken: "secret"
 * });
 *
 * await server.start();
 *
 * // Connect orchestrator
 * server.setOrchestrator(orchestrator);
 * ```
 */
export class RemoteServer {
  private wss?: WebSocketServer;
  private readonly clients = new Map<WebSocket, ClientConnection>();
  private readonly config: Required<RemoteServerConfig>;
  private orchestrator?: TaskLoopOrchestrator;
  private heartbeatInterval?: ReturnType<typeof setInterval>;

  constructor(config: RemoteServerConfig) {
    this.config = {
      host: "0.0.0.0",
      authToken: "",
      cors: true,
      maxConnections: 10,
      heartbeatInterval: 30_000,
      heartbeatTimeout: 60_000,
      ...config,
    };
  }

  /**
   * Start the WebSocket server
   */
  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.wss = new WebSocketServer({
          port: this.config.port,
          host: this.config.host,
        });

        this.wss.on("connection", (ws, req) => {
          this.handleConnection(ws, req);
        });

        this.wss.on("error", (error) => {
          logger.error({ error }, "[RemoteServer] WebSocket error");
          reject(error);
        });

        this.wss.on("listening", () => {
          logger.info(
            `[RemoteServer] Listening on ${this.config.host}:${this.config.port}`
          );
          this.startHeartbeat();
          resolve();
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Stop the server
   */
  async stop(): Promise<void> {
    return new Promise((resolve) => {
      // Clear heartbeat
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
      }

      // Close all client connections
      for (const [ws, client] of this.clients) {
        logger.info(`[RemoteServer] Closing connection ${client.id}`);
        ws.close();
      }
      this.clients.clear();

      // Stop server
      if (this.wss) {
        this.wss.close(() => {
          logger.info("[RemoteServer] Stopped");
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Set the task loop orchestrator to control
   */
  setOrchestrator(orchestrator: TaskLoopOrchestrator): void {
    this.orchestrator = orchestrator;

    // Subscribe to orchestrator events
    // This would need to be implemented in the orchestrator
    // orchestrator.onEvent((event) => this.broadcast({ type: "event", ... }));
  }

  /**
   * Get system information
   */
  private getSystemInfo(): RemoteSystemInfo {
    return {
      hostname: hostname(),
      platform: platform(),
      version: packageJson.version || "0.0.1",
    };
  }

  /**
   * Handle new WebSocket connection
   */
  private handleConnection(ws: WebSocket, _req: unknown): void {
    // Check max connections
    if (this.clients.size >= this.config.maxConnections) {
      this.send(ws, { type: "error", message: "Max connections reached" });
      ws.close();
      return;
    }

    const clientId = `client-${randomUUID()}`;
    const client: ClientConnection = {
      ws,
      id: clientId,
      authenticated: !this.config.authToken, // Auto-auth if no token configured
      lastPing: Date.now(),
    };

    this.clients.set(ws, client);
    logger.info(`[RemoteServer] Client connected: ${clientId}`);

    // Send initial status
    this.sendStatus(client);

    ws.on("message", (data) => {
      let buffer: Buffer | null = null;
      if (Buffer.isBuffer(data)) {
        buffer = data;
      } else if (typeof data === "string") {
        buffer = Buffer.from(data);
      } else if (data instanceof ArrayBuffer) {
        buffer = Buffer.from(data);
      } else if (Array.isArray(data)) {
        buffer = Buffer.concat(data);
      }

      if (!buffer) {
        this.send(client.ws, {
          type: "error",
          message: "Unsupported message format",
        });
        return;
      }

      this.handleMessage(client, buffer);
    });

    ws.on("close", () => {
      logger.info(`[RemoteServer] Client disconnected: ${clientId}`);
      this.clients.delete(ws);
    });

    ws.on("error", (error) => {
      logger.error({ error }, `[RemoteServer] Client error ${clientId}`);
      this.clients.delete(ws);
    });
  }

  /**
   * Handle incoming message from client
   */
  private handleMessage(client: ClientConnection, data: Buffer): void {
    try {
      const message = JSON.parse(data.toString()) as ClientMessage;

      // Check authentication
      if (!client.authenticated && message.type !== "auth") {
        this.send(client.ws, {
          type: "auth.error",
          error: "Authentication required",
        });
        return;
      }

      switch (message.type) {
        case "auth":
          this.handleAuth(client, message.token);
          break;

        case "command.start":
          this.handleStart(client, message.config);
          break;

        case "command.pause":
          this.handlePause(client);
          break;

        case "command.resume":
          this.handleResume(client);
          break;

        case "command.cancel":
          this.handleCancel(client);
          break;

        case "command.getStatus":
          this.sendStatus(client);
          break;

        case "ping":
          client.lastPing = Date.now();
          this.send(client.ws, { type: "pong", timestamp: message.timestamp });
          break;

        default:
          this.send(client.ws, {
            type: "error",
            message: `Unknown command: ${(message as any).type}`,
          });
      }
    } catch (error) {
      logger.error({ error }, "[RemoteServer] Failed to parse message");
      this.send(client.ws, {
        type: "error",
        message: "Invalid message format",
      });
    }
  }

  /**
   * Handle authentication
   */
  private handleAuth(client: ClientConnection, token: string): void {
    if (this.config.authToken && token !== this.config.authToken) {
      this.send(client.ws, { type: "auth.error", error: "Invalid token" });
      return;
    }

    client.authenticated = true;
    client.instanceId = `instance-${randomUUID()}`;
    this.send(client.ws, {
      type: "auth.success",
      instanceId: client.instanceId,
    });
    logger.info(`[RemoteServer] Client authenticated: ${client.id}`);
  }

  /**
   * Handle start command
   */
  private handleStart(client: ClientConnection, _config: unknown): void {
    if (!this.orchestrator) {
      this.send(client.ws, {
        type: "error",
        message: "No orchestrator configured",
      });
      return;
    }

    // Start the task loop
    // this.orchestrator.run(config);

    this.broadcast({
      type: "log",
      level: "info",
      message: "Task loop started",
      timestamp: new Date().toISOString(),
      sourceClientId: client.id,
    });
  }

  /**
   * Handle pause command
   */
  private handlePause(client: ClientConnection): void {
    if (!this.orchestrator) {
      this.send(client.ws, {
        type: "error",
        message: "No orchestrator configured",
      });
      return;
    }

    this.orchestrator.pause();
    this.broadcast({
      type: "log",
      level: "info",
      message: "Task loop paused",
      timestamp: new Date().toISOString(),
      sourceClientId: client.id,
    });
  }

  /**
   * Handle resume command
   */
  private handleResume(client: ClientConnection): void {
    this.send(client.ws, {
      type: "error",
      message: "Resume is not supported by the remote server",
    });
  }

  /**
   * Handle cancel command
   */
  private handleCancel(client: ClientConnection): void {
    if (!this.orchestrator) {
      this.send(client.ws, {
        type: "error",
        message: "No orchestrator configured",
      });
      return;
    }

    this.orchestrator.pause();
    this.broadcast({
      type: "log",
      level: "info",
      message: "Task loop cancelled",
      timestamp: new Date().toISOString(),
      sourceClientId: client.id,
    });
  }

  /**
   * Send current status to client
   */
  private sendStatus(client: ClientConnection): void {
    // Get current session from orchestrator
    const session: TaskLoopSession | undefined =
      this.orchestrator?.getSession() ?? undefined;

    this.send(client.ws, {
      type: "status",
      session,
      systemInfo: this.getSystemInfo(),
    });
  }

  /**
   * Send message to specific client
   */
  private send(ws: WebSocket, message: ServerMessage): void {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  /**
   * Broadcast message to all connected clients
   */
  private broadcast(message: ServerMessage): void {
    const data = JSON.stringify(message);
    for (const [ws, client] of this.clients) {
      if (client.authenticated && ws.readyState === ws.OPEN) {
        ws.send(data);
      }
    }
  }

  /**
   * Start heartbeat check
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();
      const timeout = this.config.heartbeatTimeout;
      const clientsToRemove: WebSocket[] = [];

      for (const [ws, client] of this.clients) {
        if (now - client.lastPing > timeout) {
          logger.info(`[RemoteServer] Client ${client.id} timed out`);
          ws.close();
          clientsToRemove.push(ws);
        }
      }

      // Delete after iteration completes to avoid race condition
      for (const ws of clientsToRemove) {
        this.clients.delete(ws);
      }
    }, this.config.heartbeatInterval);
  }

  /**
   * Get number of connected clients
   */
  getConnectionCount(): number {
    return this.clients.size;
  }

  /**
   * Check if server is running
   */
  isRunning(): boolean {
    return this.wss !== undefined && this.wss.address() !== null;
  }
}
