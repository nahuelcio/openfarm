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

	async findContainer(namePatterns: string[]): Promise<string | null> {
		for (const name of namePatterns) {
			try {
				await this.exec("docker", ["inspect", name]);
				return name;
			} catch {
				// continue
			}
		}

		try {
			const child = spawn(
				"docker",
				[
					"ps",
					"--filter",
					`name=${namePatterns[0] || ""}`,
					"--format",
					"{{.Names}}",
				],
				{ stdio: ["ignore", "pipe", "ignore"] },
			);
			const output = await new Promise<string>((resolve) => {
				let out = "";
				child.stdout?.on("data", (data: Buffer) => {
					out += data.toString();
				});
				child.on("close", () => resolve(out.trim()));
			});
			const first = output.split("\n")[0];
			if (first) {
				return first;
			}
		} catch {
			// ignore
		}

		return null;
	}

	async detectNetwork(): Promise<string | null> {
		if (this.config.network) {
			return this.config.network;
		}
		if (process.env.CLAUDE_CODE_NETWORK) {
			return process.env.CLAUDE_CODE_NETWORK;
		}

		const container = this.config.containerName;
		if (container) {
			try {
				const child = spawn(
					"docker",
					[
						"inspect",
						container,
						"--format",
						"{{range $key, $value := .NetworkSettings.Networks}}{{$key}}{{end}}",
					],
					{ stdio: ["ignore", "pipe", "ignore"] },
				);
				const output = await new Promise<string>((resolve) => {
					let out = "";
					child.stdout?.on("data", (data: Buffer) => {
						out += data.toString();
					});
					child.on("close", () => resolve(out.trim()));
				});
				const first = output.split(/\s+/)[0];
				if (first) {
					return first;
				}
			} catch {
				// ignore
			}
		}

		return null;
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
					"DockerRuntime requires imageName when ephemeral is true",
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
				"DockerRuntime requires containerName when ephemeral is false",
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
