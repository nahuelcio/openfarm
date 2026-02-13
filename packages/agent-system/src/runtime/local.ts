import { spawn } from "node:child_process";
import type { ExecutionRuntime, RuntimeSpawnOptions } from "./runtime";

export class LocalRuntime implements ExecutionRuntime {
  readonly type = "local" as const;

  async detectAvailable(): Promise<boolean> {
    return true;
  }

  resolveWorkDir(repoPath: string): string {
    return repoPath;
  }

  buildCommand(options: RuntimeSpawnOptions): {
    command: string;
    args: string[];
  } {
    return { command: options.command, args: options.args };
  }

  spawn(options: RuntimeSpawnOptions) {
    const { command, args } = this.buildCommand(options);
    return spawn(command, args, {
      cwd: options.cwd,
      env: { ...process.env, ...options.env },
      stdio: ["pipe", "pipe", "pipe"],
    });
  }
}
