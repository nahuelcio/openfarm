import { execFile, spawn } from "node:child_process";
import { basename } from "node:path";
import type {
  ExecutionRuntime,
  ExecutionRuntimeConfig,
  RuntimeSpawnOptions,
} from "./runtime";

export class DockerRuntime implements ExecutionRuntime {
  readonly type = "docker" as const;
  private readonly config: ExecutionRuntimeConfig;

  constructor(config: ExecutionRuntimeConfig = { type: "docker" }) {
    this.config = config;
  }

  async detectAvailable(): Promise<boolean> {
    try {
      await this.exec("docker", ["info"]);
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
    const envArgs = this.buildEnvArgs(options.env);
    if (this.config.ephemeral) {
      const imageName = this.config.imageName;
      if (!imageName) {
        throw new Error(
          "DockerRuntime requires imageName when ephemeral is true"
        );
      }

      const args = [
        "run",
        "--rm",
        "-i",
        ...this.buildVolumeArgs(),
        ...envArgs,
        ...this.buildNetworkArgs(),
        ...this.buildWorkdirArgs(options.cwd),
        imageName,
        options.command,
        ...options.args,
      ];

      return { command: "docker", args };
    }

    const containerName = this.config.containerName;
    if (!containerName) {
      throw new Error(
        "DockerRuntime requires containerName when ephemeral is false"
      );
    }

    const args = [
      "exec",
      "-i",
      ...envArgs,
      ...this.buildWorkdirArgs(options.cwd),
      containerName,
      options.command,
      ...options.args,
    ];

    return { command: "docker", args };
  }

  spawn(options: RuntimeSpawnOptions) {
    const { command, args } = this.buildCommand(options);
    return spawn(command, args, {
      cwd: options.cwd,
      env: { ...process.env, ...options.env },
      stdio: ["pipe", "pipe", "pipe"],
    });
  }

  private buildVolumeArgs(): string[] {
    if (!this.config.volumes || this.config.volumes.length === 0) {
      return [];
    }
    return this.config.volumes.flatMap((volume) => ["-v", volume]);
  }

  private buildNetworkArgs(): string[] {
    if (!this.config.network) {
      return [];
    }
    return ["--network", this.config.network];
  }

  private buildEnvArgs(env?: Record<string, string>): string[] {
    if (!env) {
      return [];
    }
    return Object.entries(env).flatMap(([key, value]) => [
      "-e",
      `${key}=${value}`,
    ]);
  }

  private buildWorkdirArgs(cwd?: string): string[] {
    if (!cwd) {
      return [];
    }
    return ["-w", cwd];
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
