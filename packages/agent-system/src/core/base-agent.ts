import type { ChildProcess } from "node:child_process";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import type { ChangesSummary } from "@openfarm/core/types/adapters";
import { LocalRuntime } from "../runtime/local";
import type { ExecutionRuntime } from "../runtime/runtime";
import type {
  AgentExecuteOptions,
  AgentExecutionHandle,
  AgentExecutionResult,
  AgentPlugin,
  AgentPluginMeta,
} from "./types";

interface RunningExecution {
  id: string;
  process: ChildProcess;
  startedAt: number;
  stdout: string;
  stderr: string;
  status: AgentExecutionResult["status"] | "running";
  timeoutId?: NodeJS.Timeout;
  resolve: (result: AgentExecutionResult) => void;
  promise: Promise<AgentExecutionResult>;
  interrupted: boolean;
}

export abstract class BaseAgentPlugin implements AgentPlugin {
  abstract readonly meta: AgentPluginMeta;

  protected config: Record<string, unknown> = {};
  protected ready = false;
  protected commandPath?: string;
  protected runtime: ExecutionRuntime;
  private readonly executions: Map<string, RunningExecution> = new Map();
  private currentExecutionId?: string;

  constructor(runtime?: ExecutionRuntime) {
    this.runtime = runtime ?? new LocalRuntime();
  }

  protected abstract buildArgs(
    prompt: string,
    options?: AgentExecuteOptions
  ): string[];

  protected abstract parseOutput(stdout: string): ChangesSummary | undefined;

  protected getStdinInput(
    _prompt: string,
    _options?: AgentExecuteOptions
  ): string | undefined {
    return undefined;
  }

  protected getCommand(): string {
    return this.commandPath ?? this.meta.defaultCommand;
  }

  async initialize(config: Record<string, unknown>): Promise<void> {
    this.config = config;
    if (config.commandPath && typeof config.commandPath === "string") {
      this.commandPath = config.commandPath;
    }
    if (config.runtime && typeof config.runtime === "object") {
      this.runtime = config.runtime as ExecutionRuntime;
    }
    this.ready = true;
  }

  async isReady(): Promise<boolean> {
    return this.ready;
  }

  execute(prompt: string, options?: AgentExecuteOptions): AgentExecutionHandle {
    const executionId = randomUUID();
    const startedAt = Date.now();
    const command = this.getCommand();
    const args = this.buildArgs(prompt, options);
    const flags = options?.flags ?? [];
    const cwd = options?.cwd
      ? this.runtime.resolveWorkDir(options.cwd)
      : undefined;
    const stdin = this.getStdinInput(prompt, options);

    const child = this.spawnProcess({
      command,
      args: [...args, ...flags],
      cwd,
      env: options?.env,
      stdin,
    });

    let resolvePromise: (result: AgentExecutionResult) => void = () => {};
    const promise = new Promise<AgentExecutionResult>((resolve) => {
      resolvePromise = resolve;
    });

    const running: RunningExecution = {
      id: executionId,
      process: child,
      startedAt,
      stdout: "",
      stderr: "",
      status: "running",
      resolve: resolvePromise,
      promise,
      interrupted: false,
    };

    this.executions.set(executionId, running);
    this.currentExecutionId = executionId;

    if (options?.onStart) {
      options.onStart(executionId);
    }

    if (options?.timeout && options.timeout > 0) {
      running.timeoutId = setTimeout(() => {
        if (running.status === "running") {
          running.status = "timeout";
          this.interrupt(executionId);
        }
      }, options.timeout);
    }

    child.stdout?.on("data", (data: Buffer) => {
      const chunk = data.toString();
      running.stdout += chunk;
      options?.onStdout?.(chunk);
    });

    child.stderr?.on("data", (data: Buffer) => {
      const chunk = data.toString();
      running.stderr += chunk;
      options?.onStderr?.(chunk);
    });

    child.on("error", (error) => {
      if (running.status === "running") {
        running.status = "failed";
      }
      this.finishExecution(
        running,
        {
          status: running.status === "timeout" ? "timeout" : "failed",
          exitCode: child.exitCode ?? undefined,
          error: error.message,
        },
        options
      );
    });

    child.on("close", (code) => {
      if (running.status === "running") {
        running.status = code === 0 ? "completed" : "failed";
      }

      const status =
        running.status === "timeout"
          ? "timeout"
          : running.interrupted
            ? "interrupted"
            : running.status === "completed"
              ? "completed"
              : "failed";

      this.finishExecution(
        running,
        {
          status,
          exitCode: code ?? undefined,
        },
        options
      );
    });

    return {
      executionId,
      promise,
      interrupt: () => {
        this.interrupt(executionId);
      },
      isRunning: () => this.executions.has(executionId),
    };
  }

  interrupt(executionId: string): boolean {
    const execution = this.executions.get(executionId);
    if (!execution) {
      return false;
    }

    execution.interrupted = true;
    execution.process.kill("SIGTERM");

    setTimeout(() => {
      if (!execution.process.killed) {
        execution.process.kill("SIGKILL");
      }
    }, 2000);

    return true;
  }

  interruptAll(): void {
    for (const executionId of this.executions.keys()) {
      this.interrupt(executionId);
    }
  }

  getCurrentExecution(): AgentExecutionHandle | undefined {
    const executionId = this.currentExecutionId;
    if (!executionId) {
      return undefined;
    }
    const execution = this.executions.get(executionId);
    if (!execution) {
      return undefined;
    }
    return {
      executionId,
      promise: execution.promise,
      interrupt: () => this.interrupt(executionId),
      isRunning: () => this.executions.has(executionId),
    };
  }

  validateModel(_model: string): string | null {
    return null;
  }

  async detect(): Promise<{
    available: boolean;
    version?: string;
    executablePath?: string;
    error?: string;
  }> {
    const command = this.getCommand();
    try {
      const whichCommand = process.platform === "win32" ? "where" : "which";
      const pathResult = spawn(whichCommand, [command], {
        stdio: ["ignore", "pipe", "ignore"],
      });

      const executablePath = await new Promise<string>((resolve, reject) => {
        let output = "";
        pathResult.stdout?.on("data", (data: Buffer) => {
          output += data.toString();
        });
        pathResult.on("close", (code) => {
          if (code === 0 && output.trim()) {
            resolve(output.trim().split("\n")[0] || command);
          } else {
            reject(new Error("Command not found"));
          }
        });
      });

      const versionResult = spawn(command, ["--version"], {
        stdio: ["ignore", "pipe", "ignore"],
      });

      const version = await new Promise<string>((resolve) => {
        let output = "";
        versionResult.stdout?.on("data", (data: Buffer) => {
          output += data.toString();
        });
        versionResult.on("close", () => {
          resolve(output.trim());
        });
      });

      return { available: true, version, executablePath };
    } catch (error) {
      return {
        available: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async dispose(): Promise<void> {
    this.interruptAll();
    this.executions.clear();
    this.currentExecutionId = undefined;
  }

  private spawnProcess(options: {
    command: string;
    args: string[];
    cwd?: string;
    env?: Record<string, string>;
    stdin?: string;
  }): ChildProcess {
    const child = this.runtime.spawn({
      command: options.command,
      args: options.args,
      cwd: options.cwd,
      env: options.env,
      stdin: options.stdin,
    });

    if (options.stdin && child.stdin) {
      child.stdin.write(options.stdin);
      child.stdin.end();
    } else if (child.stdin) {
      child.stdin.end();
    }

    return child;
  }

  private finishExecution(
    execution: RunningExecution,
    final: {
      status: AgentExecutionResult["status"];
      exitCode?: number;
      error?: string;
    },
    options?: AgentExecuteOptions
  ): void {
    if (execution.timeoutId) {
      clearTimeout(execution.timeoutId);
    }

    const durationMs = Date.now() - execution.startedAt;
    const changes = this.parseOutput(execution.stdout);

    const result: AgentExecutionResult = {
      executionId: execution.id,
      status: final.status,
      exitCode: final.exitCode,
      stdout: execution.stdout,
      stderr: execution.stderr,
      durationMs,
      error: final.error,
      changes,
    };

    if (changes && options?.onChanges) {
      options.onChanges(changes);
    }

    if (options?.onEnd) {
      options.onEnd(result);
    }

    execution.resolve(result);
    this.executions.delete(execution.id);
    if (this.currentExecutionId === execution.id) {
      this.currentExecutionId = undefined;
    }
  }
}
