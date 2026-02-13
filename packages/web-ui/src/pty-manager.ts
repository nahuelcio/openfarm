import type { ChildProcess } from "node:child_process";
import { execSync, spawn } from "node:child_process";
import path from "node:path";
import type { PtyManagerOptions } from "./types.ts";

const REPLAY_BUFFER_SIZE = 16_384; // 16KB of recent output
const MAX_RESTART_ATTEMPTS = 3;
const RESTART_DELAYS = [1000, 2000, 4000];

function resolveNodePath(): string {
  try {
    return execSync("which node", { encoding: "utf-8" }).trim();
  } catch {
    return "node";
  }
}

function resolveBridgePath(): string {
  const thisDir = path.dirname(new URL(import.meta.url).pathname);
  // Check both src/ (dev) and dist/ (built) locations
  const candidates = [
    path.resolve(thisDir, "pty-bridge.cjs"),
    path.resolve(thisDir, "..", "src", "pty-bridge.cjs"),
  ];
  for (const p of candidates) {
    try {
      const fs = require("node:fs");
      if (fs.existsSync(p)) {
        return p;
      }
    } catch {
      // continue
    }
  }
  return candidates[0];
}

interface BridgeMessage {
  type: "data" | "exit" | "ready";
  payload?: string;
  code?: number;
}

export class PtyManager {
  private bridge: ChildProcess | null = null;
  private replayBuffer: Buffer = Buffer.alloc(0);
  private restartCount = 0;
  private alive = false;
  private ready = false;
  private readonly dataCallbacks: Array<(data: Buffer) => void> = [];
  private readonly exitCallbacks: Array<(code: number | null) => void> = [];
  private readonly options: PtyManagerOptions;
  private cols: number;
  private rows: number;
  private lineBuffer = "";

  constructor(options: PtyManagerOptions) {
    this.options = options;
    this.cols = options.cols ?? 120;
    this.rows = options.rows ?? 40;
  }

  start(): void {
    if (this.alive) {
      return;
    }

    const nodePath = resolveNodePath();
    const bridgePath = resolveBridgePath();
    const [cmd, ...cmdArgs] = this.options.command;

    // Launch the PTY bridge under Node.js (node-pty requires Node, not Bun)
    this.bridge = spawn(
      nodePath,
      [
        bridgePath,
        this.options.cwd,
        String(this.cols),
        String(this.rows),
        cmd,
        ...cmdArgs,
      ],
      {
        cwd: this.options.cwd,
        env: process.env,
        stdio: ["pipe", "pipe", "pipe"],
      }
    );

    this.alive = true;
    this.restartCount = 0;
    this.lineBuffer = "";

    // Parse line-delimited JSON from bridge stdout
    this.bridge.stdout?.setEncoding("utf-8");
    this.bridge.stdout?.on("data", (chunk: string) => {
      this.lineBuffer += chunk;
      const lines = this.lineBuffer.split("\n");
      this.lineBuffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.trim()) {
          continue;
        }
        try {
          const msg: BridgeMessage = JSON.parse(line);
          this.handleBridgeMessage(msg);
        } catch {
          // Not JSON - might be raw output, treat as data
        }
      }
    });

    this.bridge.stderr?.on("data", (data: Buffer) => {
      // Log bridge errors for debugging
      console.error("[pty-bridge]", data.toString());
    });

    this.bridge.on("exit", (code) => {
      this.alive = false;
      this.ready = false;
      for (const cb of this.exitCallbacks) {
        cb(code);
      }
      this.maybeRestart();
    });

    this.bridge.on("error", (err) => {
      console.error("[pty-manager] Bridge error:", err.message);
      this.alive = false;
    });
  }

  write(data: string | Buffer): void {
    if (!(this.alive && this.bridge?.stdin && this.ready)) {
      return;
    }
    const str = Buffer.isBuffer(data) ? data.toString("utf-8") : data;
    const payload = Buffer.from(str, "utf-8").toString("base64");
    this.sendToBridge({ type: "data", payload });
  }

  resize(cols: number, rows: number): void {
    this.cols = cols;
    this.rows = rows;
    if (this.alive && this.ready) {
      this.sendToBridge({ type: "resize", cols, rows });
    }
  }

  kill(): void {
    this.restartCount = MAX_RESTART_ATTEMPTS; // Prevent restart
    if (this.bridge) {
      this.alive = false;
      this.ready = false;
      try {
        this.sendToBridge({ type: "kill" });
        // Force kill bridge after 2s
        setTimeout(() => {
          try {
            this.bridge?.kill("SIGKILL");
          } catch {
            // Already dead
          }
        }, 2000);
      } catch {
        // Already dead
      }
      this.bridge = null;
    }
  }

  onData(callback: (data: Buffer) => void): void {
    this.dataCallbacks.push(callback);
  }

  onExit(callback: (code: number | null) => void): void {
    this.exitCallbacks.push(callback);
  }

  isAlive(): boolean {
    return this.alive && this.ready;
  }

  getReplayBuffer(): Buffer {
    return this.replayBuffer;
  }

  private handleBridgeMessage(msg: BridgeMessage): void {
    switch (msg.type) {
      case "ready":
        this.ready = true;
        break;
      case "data": {
        if (msg.payload) {
          const buf = Buffer.from(msg.payload, "base64");
          this.appendToReplayBuffer(buf);
          for (const cb of this.dataCallbacks) {
            cb(buf);
          }
        }
        break;
      }
      case "exit":
        this.alive = false;
        this.ready = false;
        for (const cb of this.exitCallbacks) {
          cb(msg.code ?? null);
        }
        break;
    }
  }

  private sendToBridge(msg: Record<string, unknown>): void {
    try {
      this.bridge?.stdin?.write(`${JSON.stringify(msg)}\n`);
    } catch {
      // Bridge died
    }
  }

  private appendToReplayBuffer(data: Buffer): void {
    this.replayBuffer = Buffer.concat([this.replayBuffer, data]);
    if (this.replayBuffer.length > REPLAY_BUFFER_SIZE) {
      this.replayBuffer = this.replayBuffer.subarray(
        this.replayBuffer.length - REPLAY_BUFFER_SIZE
      );
    }
  }

  private maybeRestart(): void {
    if (this.restartCount >= MAX_RESTART_ATTEMPTS) {
      return;
    }

    const delay = RESTART_DELAYS[this.restartCount] ?? 4000;
    this.restartCount++;

    console.log(
      `[pty-manager] Process exited. Restarting in ${delay}ms (attempt ${this.restartCount}/${MAX_RESTART_ATTEMPTS})...`
    );

    setTimeout(() => {
      this.replayBuffer = Buffer.alloc(0);
      this.start();
    }, delay);
  }
}
