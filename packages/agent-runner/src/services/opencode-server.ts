import { type ChildProcess, spawn } from "node:child_process";
import { promisify } from "node:util";
import { OpenCodeConfigService } from "@openfarm/core";
import type { OpenCodeProvider } from "@openfarm/core/types/opencode-config";

const _execAsync = promisify(require("node:child_process").exec);

interface OpenCodeServerConfig {
  port: number;
  host: string;
  logLevel?: "debug" | "info" | "warn" | "error";
  healthCheckInterval?: number;
}

interface ServerStatus {
  running: boolean;
  port: number;
  pid?: number;
  healthy: boolean;
}

interface OpenCodeEnvConfig {
  provider?: OpenCodeProvider;
  defaultModel?: string;
  providers: {
    copilot?: { token?: string; apiBase?: string };
    anthropic?: { apiKey?: string; apiBase?: string };
    openrouter?: { apiKey?: string; apiBase?: string };
    zai?: { apiKey?: string; apiBase?: string };
  };
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function resolveProviderTokenKey(provider: OpenCodeProvider): string | null {
  if (provider === "copilot") {
    return "COPILOT_TOKEN";
  }
  if (provider === "anthropic") {
    return "ANTHROPIC_API_KEY";
  }
  if (provider === "openrouter") {
    return "OPENROUTER_API_KEY";
  }
  if (provider === "zai") {
    return "ZAI_API_KEY";
  }
  return null;
}

async function resolveOpenCodeEnvConfig(): Promise<OpenCodeEnvConfig> {
  const configService = await OpenCodeConfigService.create();
  const config = await configService.resolveOpenCodeConfig();

  const provider = config.server.defaultProvider;
  const defaultModel = config.server.defaultModel;

  return {
    provider,
    defaultModel,
    providers: {
      copilot: {
        token: config.providers.copilot.token,
        apiBase: config.providers.copilot.apiBase,
      },
      anthropic: {
        apiKey: config.providers.anthropic.apiKey,
        apiBase: config.providers.anthropic.apiBase,
      },
      openrouter: {
        apiKey: config.providers.openrouter.apiKey,
        apiBase: config.providers.openrouter.apiBase,
      },
      zai: {
        apiKey: config.providers.zai.apiKey,
        apiBase: config.providers.zai.apiBase,
      },
    },
  };
}

function applyEnvOverrides(config: OpenCodeEnvConfig): NodeJS.ProcessEnv {
  const env = { ...process.env };

  if (config.provider && !isNonEmptyString(env.OPENCODE_PROVIDER)) {
    env.OPENCODE_PROVIDER = config.provider;
  }

  if (config.defaultModel && !isNonEmptyString(env.OPENCODE_DEFAULT_MODEL)) {
    env.OPENCODE_DEFAULT_MODEL = config.defaultModel;
  }

  if (
    config.providers.copilot?.apiBase &&
    !isNonEmptyString(env.OPENAI_API_BASE)
  ) {
    env.OPENAI_API_BASE = config.providers.copilot.apiBase;
  }

  if (
    config.providers.anthropic?.apiBase &&
    !isNonEmptyString(env.ANTHROPIC_API_BASE)
  ) {
    env.ANTHROPIC_API_BASE = config.providers.anthropic.apiBase;
  }

  if (
    config.providers.openrouter?.apiBase &&
    !isNonEmptyString(env.OPENROUTER_API_BASE)
  ) {
    env.OPENROUTER_API_BASE = config.providers.openrouter.apiBase;
  }

  if (config.providers.zai?.apiBase && !isNonEmptyString(env.ZAI_API_BASE)) {
    env.ZAI_API_BASE = config.providers.zai.apiBase;
  }

  if (config.providers.copilot?.token && !isNonEmptyString(env.COPILOT_TOKEN)) {
    env.COPILOT_TOKEN = config.providers.copilot.token;
  }

  if (
    config.providers.anthropic?.apiKey &&
    !isNonEmptyString(env.ANTHROPIC_API_KEY)
  ) {
    env.ANTHROPIC_API_KEY = config.providers.anthropic.apiKey;
  }

  if (
    config.providers.openrouter?.apiKey &&
    !isNonEmptyString(env.OPENROUTER_API_KEY)
  ) {
    env.OPENROUTER_API_KEY = config.providers.openrouter.apiKey;
  }

  if (config.providers.zai?.apiKey && !isNonEmptyString(env.ZAI_API_KEY)) {
    env.ZAI_API_KEY = config.providers.zai.apiKey;
  }

  if (config.provider) {
    const providerKey = resolveProviderTokenKey(config.provider);
    if (
      providerKey &&
      env[providerKey] &&
      !isNonEmptyString(env.OPENCODE_API_KEY)
    ) {
      env.OPENCODE_API_KEY = env[providerKey];
    }
  }

  return env;
}

class OpenCodeServerManager {
  private process: ChildProcess | null = null;
  private readonly config: Required<OpenCodeServerConfig>;
  private healthCheckTimer: NodeJS.Timeout | null = null;
  private restartCount = 0;
  private readonly maxRestarts = 5;
  private readonly restartBackoffs = [1000, 2000, 4000, 8000, 16_000]; // Exponential backoff

  constructor(config: OpenCodeServerConfig) {
    this.config = {
      port: config.port,
      host: config.host,
      logLevel: config.logLevel || "info",
      healthCheckInterval: config.healthCheckInterval || 10_000,
    };
  }

  private log(level: string, message: string) {
    const timestamp = new Date().toISOString();
    const logLevels = ["debug", "info", "warn", "error"];
    const currentLevelIndex = logLevels.indexOf(this.config.logLevel);
    const messageLevelIndex = logLevels.indexOf(level);

    if (messageLevelIndex >= currentLevelIndex) {
      console.log(
        `[OpenCodeServer] [${timestamp}] [${level.toUpperCase()}] ${message}`
      );
    }
  }

  private async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(
        `http://${this.config.host}:${this.config.port}/global/health`,
        {
          method: "GET",
          signal: AbortSignal.timeout(5000),
        }
      );
      return response.ok;
    } catch (error) {
      this.log(
        "debug",
        `Health check failed: ${error instanceof Error ? error.message : String(error)}`
      );
      return false;
    }
  }

  private startHealthCheck() {
    this.healthCheckTimer = setInterval(async () => {
      if (this.process) {
        const healthy = await this.healthCheck();
        this.log(
          healthy ? "debug" : "warn",
          healthy ? "Health check passed" : "Health check failed"
        );
      }
    }, this.config.healthCheckInterval);
  }

  private stopHealthCheck() {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
  }

  private handleProcessOutput(data: Buffer, type: "stdout" | "stderr") {
    const message = data.toString().trim();
    if (!message) {
      return;
    }

    if (type === "stderr") {
      this.log("warn", message);
    } else {
      this.log("info", message);
    }
  }

  private handleProcessExit(
    code: number | null,
    signal: NodeJS.Signals | null
  ) {
    this.log(
      "warn",
      `OpenCode process exited with code: ${code}, signal: ${signal}`
    );

    if (this.restartCount < this.maxRestarts) {
      const backoff =
        this.restartBackoffs[
          Math.min(this.restartCount, this.restartBackoffs.length - 1)
        ];
      this.log(
        "info",
        `Restarting in ${backoff}ms (attempt ${this.restartCount + 1}/${this.maxRestarts})`
      );
      setTimeout(() => this.startProcess(), backoff);
      this.restartCount++;
    } else {
      this.log(
        "error",
        "Max restart attempts reached. OpenCode server will not restart automatically."
      );
    }
  }

  private async startProcess(): Promise<void> {
    const opencodeConfig = await resolveOpenCodeEnvConfig();
    const env = applyEnvOverrides(opencodeConfig);

    return new Promise((resolve, reject) => {
      try {
        const args = [
          "opencode-ai",
          "serve",
          "--port",
          String(this.config.port),
        ];

        this.log(
          "info",
          `Starting OpenCode server on ${this.config.host}:${this.config.port}`
        );

        this.process = spawn("bunx", args, {
          env: { ...env, NODE_ENV: "production" },
          stdio: ["pipe", "pipe", "pipe"],
        });

        if (!(this.process.stdout && this.process.stderr)) {
          reject(new Error("Failed to create process streams"));
          return;
        }

        this.process.stdout.on("data", (data) =>
          this.handleProcessOutput(data, "stdout")
        );
        this.process.stderr.on("data", (data) =>
          this.handleProcessOutput(data, "stderr")
        );

        this.process.on("exit", (code, signal) => {
          this.handleProcessExit(code, signal);
        });

        this.process.on("error", (error) => {
          this.log("error", `Process error: ${error.message}`);
          reject(error);
        });

        this.startHealthCheck();

        this.log(
          "info",
          `OpenCode server started with PID: ${this.process.pid}`
        );
        this.restartCount = 0;
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  async start(): Promise<void> {
    if (this.process && !this.process.killed) {
      this.log("warn", "OpenCode server is already running");
      return;
    }

    await this.startProcess();
  }

  async stop(): Promise<void> {
    this.stopHealthCheck();

    if (!this.process) {
      this.log("warn", "No OpenCode process to stop");
      return;
    }

    if (this.process.killed) {
      this.log("warn", "OpenCode process already killed");
      return;
    }

    this.log("info", "Stopping OpenCode server...");

    return new Promise<void>((resolve) => {
      const timeout = setTimeout(() => {
        if (this.process && !this.process.killed) {
          this.log("warn", "Force killing OpenCode process");
          this.process.kill("SIGKILL");
        }
        resolve();
      }, 5000);

      this.process?.once("exit", () => {
        clearTimeout(timeout);
        this.log("info", "OpenCode server stopped successfully");
        resolve();
      });

      this.process?.kill("SIGTERM");
    });
  }

  async getStatus(): Promise<ServerStatus> {
    const healthy = await this.healthCheck();

    return {
      running: this.process !== null && !this.process.killed,
      port: this.config.port,
      pid: this.process?.pid,
      healthy,
    };
  }

  async restart(): Promise<void> {
    this.log("info", "Restarting OpenCode server...");
    await this.stop();
    await this.start();
  }
}

let serverInstance: OpenCodeServerManager | null = null;

export async function startOpenCodeServer(
  config?: Partial<OpenCodeServerConfig>
): Promise<void> {
  const finalConfig: OpenCodeServerConfig = {
    port:
      config?.port || Number.parseInt(process.env.OPENCODE_PORT || "4096", 10),
    host: config?.host || process.env.OPENCODE_HOST || "127.0.0.1",
    logLevel: config?.logLevel || "info",
    healthCheckInterval: config?.healthCheckInterval || 10_000,
  };

  if (serverInstance) {
    throw new Error("OpenCode server is already running");
  }
  serverInstance = new OpenCodeServerManager(finalConfig);
  await serverInstance.start();
}

export async function stopOpenCodeServer(): Promise<void> {
  if (serverInstance) {
    await serverInstance.stop();
    serverInstance = null;
  }
}

export async function getOpenCodeServerStatus(): Promise<ServerStatus | null> {
  if (!serverInstance) {
    return null;
  }
  return await serverInstance.getStatus();
}

export function getOpenCodeServerUrl(): string {
  const port = process.env.OPENCODE_PORT || "4096";
  const host = process.env.OPENCODE_HOST || "127.0.0.1";
  return `http://${host}:${port}`;
}
