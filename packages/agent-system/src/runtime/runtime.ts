import type { ChildProcess } from "node:child_process";

export interface ExecutionRuntimeConfig {
	type: "local" | "docker" | "kubernetes" | "worktree";
	containerName?: string;
	imageName?: string;
	network?: string;
	volumes?: string[];
	ephemeral?: boolean;
	podName?: string;
	namespace?: string;
	container?: string;
	worktreePath?: string;
	baseBranch?: string;
}

export interface RuntimeSpawnOptions {
	command: string;
	args: string[];
	cwd?: string;
	env?: Record<string, string>;
	stdin?: string;
}

export interface ExecutionRuntime {
	readonly type: ExecutionRuntimeConfig["type"];

	detectAvailable(): Promise<boolean>;
	resolveWorkDir(repoPath: string): string;

	spawn(options: RuntimeSpawnOptions): ChildProcess;
	buildCommand(options: RuntimeSpawnOptions): {
		command: string;
		args: string[];
	};
}
