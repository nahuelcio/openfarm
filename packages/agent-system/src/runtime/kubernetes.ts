import { execFile, spawn } from "node:child_process";
import { basename } from "node:path";
import type {
  ExecutionRuntime,
  ExecutionRuntimeConfig,
  RuntimeSpawnOptions,
} from "./runtime";

export class KubernetesRuntime implements ExecutionRuntime {
  readonly type = "kubernetes" as const;
  private readonly config: ExecutionRuntimeConfig;

  constructor(config: ExecutionRuntimeConfig = { type: "kubernetes" }) {
    this.config = config;
  }

  async detectAvailable(): Promise<boolean> {
    try {
      await this.exec("kubectl", ["version", "--client"]);
      return true;
    } catch {
      return false;
    }
  }

  resolveWorkDir(repoPath: string): string {
    return `/workspace/${basename(repoPath)}`;
  }

  buildCommand(options: RuntimeSpawnOptions): {
    command: string;
    args: string[];
  } {
    if (!this.config.podName) {
      throw new Error("KubernetesRuntime requires podName");
    }

    const namespace = this.config.namespace || "default";
    const containerArgs = this.config.container
      ? ["-c", this.config.container]
      : [];

    const args = [
      "exec",
      this.config.podName,
      "-n",
      namespace,
      ...containerArgs,
      "--",
      options.command,
      ...options.args,
    ];

    return { command: "kubectl", args };
  }

  spawn(options: RuntimeSpawnOptions) {
    const { command, args } = this.buildCommand(options);
    return spawn(command, args, {
      cwd: options.cwd,
      env: { ...process.env, ...options.env },
      stdio: ["pipe", "pipe", "pipe"],
    });
  }

  private exec(command: string, args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      execFile(command, args, (error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  }
}
