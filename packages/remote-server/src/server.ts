/**
 * Remote Server
 *
 * WebSocket server that exposes OpenFarm functionality for remote control.
 * Allows controlling task loops from a central TUI.
 */

import type {
  TaskLoopOrchestrator,
  TaskLoopSession,
} from "@openfarm/task-loop";
import { WebSocketServer, type WebSocket } from "ws";
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
  private clients = new Map<WebSocket, ClientConnection>();
  private config: Required<RemoteServerConfig>;
  private orchestrator?: TaskLoopOrchestrator;
  private heartbeatInterval?: ReturnType<typeof setInterval>;

  constructor(config: RemoteServerConfig) {
    this.config = {
      host: "0.0.0.0",
      authToken: "",
      cors: true,
      maxConnections: 10,
      heartbeatInterval: 30000,
      heartbeatTimeout: 60000,
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
          console.error("[RemoteServer] WebSocket error:", error);
          reject(error);
        });

        this.wss.on("listening", () => {
          console.log(
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
        console.log(`[RemoteServer] Closing connection ${client.id}`);
        ws.close();
      }
      this.clients.clear();

      // Stop server
      if (this.wss) {
        this.wss.close(() => {
          console.log("[RemoteServer] Stopped");
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
      hostname: require("os").hostname(),
      platform: require("os").platform(),
      version: require("../package.json").version || "0.0.1",
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

    const clientId = `client-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const client: ClientConnection = {
      ws,
      id: clientId,
      authenticated: !this.config.authToken, // Auto-auth if no token configured
      lastPing: Date.now(),
    };

    this.clients.set(ws, client);
    console.log(`[RemoteServer] Client connected: ${clientId}`);

    // Send initial status
    this.sendStatus(client);

    ws.on("message", (data) => {
      const buffer = Buffer.isBuffer(data)
        ? data
        : Buffer.from(data as ArrayBuffer);
      this.handleMessage(client, buffer);
    });

    ws.on("close", () => {
      console.log(`[RemoteServer] Client disconnected: ${clientId}`);
      this.clients.delete(ws);
    });

    ws.on("error", (error) => {
      console.error(`[RemoteServer] Client error ${clientId}:`, error);
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
          this.send(client.ws, { type: "pong", timestamp: message.timestamp });
          break;

        default:
          this.send(client.ws, {
            type: "error",
            message: `Unknown command: ${(message as any).type}`,
          });
      }
    } catch (error) {
      console.error("[RemoteServer] Failed to parse message:", error);
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
    client.instanceId = `instance-${Date.now()}`;
    this.send(client.ws, {
      type: "auth.success",
      instanceId: client.instanceId,
    });
    console.log(`[RemoteServer] Client authenticated: ${client.id}`);
  }

  /**
   * Handle start command
   */
  private handleStart(_client: ClientConnection, _config: unknown): void {
    if (!this.orchestrator) {
      this.broadcast({
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
    });
  }

  /**
   * Handle pause command
   */
  private handlePause(_client: ClientConnection): void {
    if (!this.orchestrator) {
      this.broadcast({ type: "error", message: "No orchestrator configured" });
      return;
    }

    this.orchestrator.pause();
    this.broadcast({
      type: "log",
      level: "info",
      message: "Task loop paused",
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Handle resume command
   */
  private handleResume(_client: ClientConnection): void {
    // Would need resume functionality in orchestrator
    this.broadcast({
      type: "log",
      level: "info",
      message: "Resume not yet implemented",
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Handle cancel command
   */
  private handleCancel(_client: ClientConnection): void {
    if (!this.orchestrator) {
      this.broadcast({ type: "error", message: "No orchestrator configured" });
      return;
    }

    this.orchestrator.pause();
    this.broadcast({
      type: "log",
      level: "info",
      message: "Task loop cancelled",
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Send current status to client
   */
  private sendStatus(client: ClientConnection): void {
    // Get current session from orchestrator
    const session: TaskLoopSession | undefined = undefined; // this.orchestrator?.getSession();

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

      for (const [ws, client] of this.clients) {
        if (now - client.lastPing > timeout) {
          console.log(`[RemoteServer] Client ${client.id} timed out`);
          ws.close();
          this.clients.delete(ws);
        }
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

export { WebSocketServer };
