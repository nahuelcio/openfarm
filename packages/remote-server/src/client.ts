/**
 * Remote Client
 *
 * WebSocket client for connecting to remote OpenFarm instances.
 * Used by the TUI to control multiple machines.
 */

import WebSocket from "ws";
import type {
  ClientMessage,
  ConnectionState,
  RemoteClientConfig,
  RemoteClientHandlers,
  RemoteSystemInfo,
  ServerMessage,
} from "./types";
import type { TaskLoopSession } from "@openfarm/task-loop";

/**
 * OpenFarm Remote Client
 *
 * Usage:
 * ```typescript
 * const client = new RemoteClient({
 *   url: "ws://vps.example.com:8080",
 *   token: "secret"
 * });
 *
 * client.onConnect = () => {
 *   console.log("Connected!");
 *   client.startTaskLoop(config);
 * };
 *
 * client.onLog = (level, message) => {
 *   console.log(`[${level}] ${message}`);
 * };
 *
 * await client.connect();
 * ```
 */
export class RemoteClient {
  private ws?: WebSocket;
  private config: Required<RemoteClientConfig>;
  private state: ConnectionState;
  private handlers: RemoteClientHandlers;
  private reconnectTimer?: ReturnType<typeof setTimeout>;
  private pingInterval?: ReturnType<typeof setInterval>;

  constructor(config: RemoteClientConfig, handlers: RemoteClientHandlers = {}) {
    this.config = {
      autoReconnect: true,
      reconnectDelay: 5000,
      maxReconnects: 0, // Infinite
      connectionTimeout: 10000,
      token: "",
      ...config,
    };

    this.state = {
      status: "idle",
      reconnectAttempts: 0,
    };

    this.handlers = handlers;
  }

  /**
   * Connect to remote server
   */
  async connect(): Promise<void> {
    if (
      this.state.status === "connected" ||
      this.state.status === "connecting"
    ) {
      return;
    }

    return new Promise((resolve, reject) => {
      this.state.status = "connecting";

      const timeout = setTimeout(() => {
        this.ws?.close();
        this.state.status = "error";
        this.state.error = "Connection timeout";
        reject(new Error("Connection timeout"));
      }, this.config.connectionTimeout);

      try {
        this.ws = new WebSocket(this.config.url);

        this.ws.on("open", () => {
          clearTimeout(timeout);
          this.state.status = "connected";
          this.state.reconnectAttempts = 0;
          this.state.error = undefined;

          // Authenticate
          this.send({ type: "auth", token: this.config.token });

          // Start ping interval
          this.startPing();

          this.handlers.onConnect?.();
          resolve();
        });

        this.ws.on("message", (data) => {
          this.handleMessage(data.toString());
        });

        this.ws.on("close", (code, reason) => {
          clearTimeout(timeout);
          this.handleClose(code, reason.toString());
        });

        this.ws.on("error", (error) => {
          clearTimeout(timeout);
          this.handleError(error);
          reject(error);
        });
      } catch (error) {
        clearTimeout(timeout);
        this.handleError(error as Error);
        reject(error);
      }
    });
  }

  /**
   * Disconnect from server
   */
  disconnect(): void {
    this.state.status = "idle";
    this.clearTimers();

    if (this.ws) {
      this.ws.close();
      this.ws = undefined;
    }
  }

  /**
   * Start task loop on remote
   */
  startTaskLoop(config: unknown): void {
    this.send({ type: "command.start", config });
  }

  /**
   * Pause task loop on remote
   */
  pause(): void {
    this.send({ type: "command.pause" });
  }

  /**
   * Resume task loop on remote
   */
  resume(): void {
    this.send({ type: "command.resume" });
  }

  /**
   * Cancel task loop on remote
   */
  cancel(): void {
    this.send({ type: "command.cancel" });
  }

  /**
   * Request status update
   */
  getStatus(): void {
    this.send({ type: "command.getStatus" });
  }

  /**
   * Get current connection state
   */
  getState(): ConnectionState {
    return { ...this.state };
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return (
      this.state.status === "connected" &&
      this.ws?.readyState === WebSocket.OPEN
    );
  }

  /**
   * Handle incoming message
   */
  private handleMessage(data: string): void {
    try {
      const message = JSON.parse(data) as ServerMessage;

      switch (message.type) {
        case "auth.success":
          console.log(`[RemoteClient] Authenticated: ${message.instanceId}`);
          break;

        case "auth.error":
          this.state.error = message.error;
          this.handlers.onError?.(new Error(message.error));
          break;

        case "status":
          this.handlers.onStatusUpdate?.(
            message.session as TaskLoopSession,
            message.systemInfo as RemoteSystemInfo
          );
          break;

        case "log":
          this.handlers.onLog?.(message.level, message.message);
          break;

        case "event":
          this.handlers.onEvent?.(message.eventType, message.data);
          break;

        case "pong":
          this.state.lastPing = Date.now();
          this.state.latency = Date.now() - message.timestamp;
          break;

        case "error":
          this.handlers.onError?.(new Error(message.message));
          break;

        default:
          console.warn(
            "[RemoteClient] Unknown message type:",
            (message as any).type
          );
      }
    } catch (error) {
      console.error("[RemoteClient] Failed to parse message:", error);
    }
  }

  /**
   * Handle connection close
   */
  private handleClose(code: number, reason: string): void {
    console.log(`[RemoteClient] Connection closed: ${code} ${reason}`);
    this.clearTimers();

    if (this.state.status === "connected") {
      this.handlers.onDisconnect?.(reason);
    }

    // Attempt reconnection
    if (this.config.autoReconnect && this.state.status !== "idle") {
      this.scheduleReconnect();
    } else {
      this.state.status = "idle";
    }
  }

  /**
   * Handle connection error
   */
  private handleError(error: Error): void {
    console.error("[RemoteClient] Connection error:", error);
    this.state.error = error.message;
    this.handlers.onError?.(error);
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (
      this.config.maxReconnects > 0 &&
      this.state.reconnectAttempts >= this.config.maxReconnects
    ) {
      console.log("[RemoteClient] Max reconnects reached");
      this.state.status = "error";
      this.state.error = "Max reconnects reached";
      return;
    }

    this.state.status = "reconnecting";
    this.state.reconnectAttempts++;

    console.log(
      `[RemoteClient] Reconnecting in ${this.config.reconnectDelay}ms ` +
        `(attempt ${this.state.reconnectAttempts})`
    );

    this.reconnectTimer = setTimeout(() => {
      this.connect().catch(() => {
        // Error handled in connect()
      });
    }, this.config.reconnectDelay);
  }

  /**
   * Start ping interval
   */
  private startPing(): void {
    this.pingInterval = setInterval(() => {
      this.send({ type: "ping", timestamp: Date.now() });
    }, 30000);
  }

  /**
   * Clear all timers
   */
  private clearTimers(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = undefined;
    }
  }

  /**
   * Send message to server
   */
  private send(message: ClientMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }
}

export { WebSocket };
