import { execFileSync, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import type {
	ExecutionRuntime,
	ExecutionRuntimeConfig,
	RuntimeSpawnOptions,
} from "./runtime";

export class WorktreeRuntime implements ExecutionRuntime {
	readonly type = "worktree" as const;
	private readonly config: ExecutionRuntimeConfig;

	constructor(config: ExecutionRuntimeConfig = { type: "worktree" }) {
		this.config = config;
	}

	async detectAvailable(): Promise<boolean> {
		try {
			execFileSync("git", ["rev-parse", "--git-dir"], { stdio: "ignore" });
			return true;
		} catch {
			return false;
		}
	}

	resolveWorkDir(repoPath: string): string {
		const worktreePath = this.config.worktreePath;
		if (!worktreePath) {
			throw new Error("WorktreeRuntime requires worktreePath");
		}

		if (!existsSync(worktreePath)) {
			this.createWorktree(repoPath, worktreePath);
		}

		return worktreePath;
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

	private createWorktree(repoPath: string, worktreePath: string): void {
		const baseBranch = this.config.baseBranch || "HEAD";
		const resolvedPath = resolve(worktreePath);
		execFileSync("git", ["worktree", "add", resolvedPath, baseBranch], {
			cwd: repoPath,
			stdio: "ignore",
		});
	}
}
