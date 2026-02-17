import type { ExecutionRuntime, RuntimeSpawnOptions } from "./runtime";

// Mock spawn for browser compatibility
const mockSpawn = () => ({
	stdout: { on: () => {}, pipe: () => {} },
	stderr: { on: () => {}, pipe: () => {} },
	on: () => {},
	kill: () => {},
	pid: 12345,
});

let spawn: any;
const hasWindow =
	typeof globalThis !== "undefined" &&
	"window" in globalThis &&
	typeof (globalThis as { window?: unknown }).window !== "undefined";

if (hasWindow) {
	spawn = mockSpawn;
} else {
	// Dynamic import for Node.js environment
	try {
		const childProcess = require("node:child_process");
		spawn = childProcess.spawn;
	} catch {
		spawn = mockSpawn;
	}
}

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
