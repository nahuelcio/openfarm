import type { WebSocket } from "ws";
import type { PtyManager } from "./pty-manager.ts";
import { CONTROL_PREFIX, ControlMessage } from "./types.ts";

const HEARTBEAT_INTERVAL = 30_000; // 30s
const HEARTBEAT_TIMEOUT = 60_000; // 60s
const CLEANUP_TIMEOUT = 5 * 60_000; // 5 minutes

export class WsHandler {
  private readonly clients = new Set<WebSocket>();
  private readonly clientAlive = new Map<WebSocket, number>();
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private cleanupTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly onCleanup: (() => void) | null = null;

  constructor(
    private readonly pty: PtyManager,
    options?: { onCleanup?: () => void }
  ) {
    this.onCleanup = options?.onCleanup ?? null;

    // Forward PTY output to all connected clients
    this.pty.onData((data) => {
      this.broadcast(data);
    });

    this.startHeartbeat();
  }

  handleConnection(ws: WebSocket): void {
    this.clients.add(ws);
    this.clientAlive.set(ws, Date.now());

    // Cancel cleanup timer if a client reconnects
    if (this.cleanupTimer) {
      clearTimeout(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    // Send replay buffer so new client sees current state
    const replay = this.sanitizeReplayBuffer(this.pty.getReplayBuffer());
    if (replay.length > 0) {
      try {
        ws.send(replay);
      } catch {
        // Client may have disconnected immediately
      }
    }

    ws.on("message", (data: Buffer | string) => {
      this.clientAlive.set(ws, Date.now());
      const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
      this.handleMessage(buf);
    });

    ws.on("close", () => {
      this.removeClient(ws);
    });

    ws.on("error", () => {
      this.removeClient(ws);
    });
  }

  getClientCount(): number {
    return this.clients.size;
  }

  destroy(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.cleanupTimer) {
      clearTimeout(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    for (const ws of this.clients) {
      try {
        ws.close();
      } catch {
        // Ignore
      }
    }
    this.clients.clear();
    this.clientAlive.clear();
  }

  private handleMessage(data: Buffer): void {
    // Check for control messages (prefixed with \x00)
    if (data.length > 0 && data[0] === CONTROL_PREFIX) {
      const msg = data.subarray(1).toString("utf-8");
      this.handleControlMessage(msg);
      return;
    }

    // Regular data → forward to PTY as input
    this.pty.write(data);
  }

  private handleControlMessage(msg: string): void {
    if (msg.startsWith(ControlMessage.Resize)) {
      // Format: resize:cols:rows
      const parts = msg.split(":");
      if (parts.length === 3) {
        const cols = Number.parseInt(parts[1], 10);
        const rows = Number.parseInt(parts[2], 10);
        if (
          !(Number.isNaN(cols) || Number.isNaN(rows)) &&
          cols > 0 &&
          rows > 0
        ) {
          this.pty.resize(cols, rows);
        }
      }
    } else if (msg === ControlMessage.Ping) {
      // Respond with pong to all clients (or just the sender, but we don't track which sent it)
      const pong = Buffer.from([
        CONTROL_PREFIX,
        ...Buffer.from(ControlMessage.Pong),
      ]);
      this.broadcast(pong);
    }
  }

  private broadcast(data: Buffer): void {
    for (const ws of this.clients) {
      try {
        if (ws.readyState === ws.OPEN) {
          ws.send(data);
        }
      } catch {
        this.removeClient(ws);
      }
    }
  }

  private removeClient(ws: WebSocket): void {
    this.clients.delete(ws);
    this.clientAlive.delete(ws);
    try {
      ws.close();
    } catch {
      // Ignore
    }

    // If no clients remain, start cleanup timer
    if (this.clients.size === 0 && this.onCleanup) {
      console.log(
        `[ws-handler] No clients connected. Shutting down in ${CLEANUP_TIMEOUT / 1000}s if no reconnection...`
      );
      this.cleanupTimer = setTimeout(() => {
        if (this.clients.size === 0 && this.onCleanup) {
          console.log("[ws-handler] Cleanup timeout reached. Shutting down.");
          this.onCleanup();
        }
      }, CLEANUP_TIMEOUT);
    }
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      const now = Date.now();
      for (const [ws, lastSeen] of this.clientAlive) {
        if (now - lastSeen > HEARTBEAT_TIMEOUT) {
          console.log("[ws-handler] Client timed out, disconnecting.");
          this.removeClient(ws);
        } else {
          try {
            ws.ping();
          } catch {
            this.removeClient(ws);
          }
        }
      }
    }, HEARTBEAT_INTERVAL);
  }

  private sanitizeReplayBuffer(replay: Buffer): Buffer {
    if (replay.length === 0 || replay[0] !== 0x5b) {
      return replay;
    }

    const escIdx = replay.indexOf(0x1b);
    const lfIdx = replay.indexOf(0x0a);
    const crIdx = replay.indexOf(0x0d);
    const candidates: number[] = [];

    if (escIdx >= 0) {
      candidates.push(escIdx);
    }
    if (lfIdx >= 0 && lfIdx + 1 < replay.length) {
      candidates.push(lfIdx + 1);
    }
    if (crIdx >= 0 && crIdx + 1 < replay.length) {
      candidates.push(crIdx + 1);
    }

    if (candidates.length === 0) {
      return Buffer.alloc(0);
    }

    return replay.subarray(Math.min(...candidates));
  }
}
