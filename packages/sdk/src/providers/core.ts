/**
 * Provider System Simplificado - Extensible pero sin complejidad innecesaria
 *
 * ANTES: 3,262 líneas, 9 archivos, 5 patrones de diseño
 * DESPUÉS: ~150 líneas, 1 archivo, funciones simples
 */

import { spawn } from "node:child_process";

// ============================================================================
// UTILIDADES
// ============================================================================

function getProcessEnv(): Record<string, string> {
	if (typeof process !== "undefined" && process.env) {
		return process.env as Record<string, string>;
	}
	return {};
}

// ============================================================================
// TIPOS MÍNIMOS
// ============================================================================

export interface ExecuteRequest {
	task: string;
	workspace?: string;
	model?: string;
	timeout?: number;
	verbose?: boolean;
	onLog?: (chunk: string) => void;
}

export interface ExecuteResult {
	success: boolean;
	output: string;
	error?: string;
	duration: number;
	statistics?: {
		tokensInput?: number;
		tokensOutput?: number;
		toolCalls?: number;
		filesChanged?: number;
		creditsSpent?: number;
		processesCreated?: number;
		model?: string;
		requestId?: string;
		duration?: number;
	};
}

export interface Provider {
	readonly type: string;
	readonly name: string;
	execute(request: ExecuteRequest): Promise<ExecuteResult>;
	testConnection(): Promise<boolean>;
}

// ============================================================================
// REGISTRY SIMPLE
// ============================================================================

export class ProviderRegistry {
	private providers = new Map<string, Provider>();

	register(provider: Provider): void {
		this.providers.set(provider.type, provider);
	}

	get(type: string): Provider | undefined {
		return this.providers.get(type);
	}

	list(): string[] {
		return Array.from(this.providers.keys());
	}

	has(type: string): boolean {
		return this.providers.has(type);
	}
}

// ============================================================================
// HELPER: Spawn con streaming
// ============================================================================

interface SpawnResult {
	stdout: string;
	stderr: string;
	exitCode: number;
}

export async function spawnWithStreaming(
	command: string,
	args: string[],
	options: {
		cwd?: string;
		env?: Record<string, string>;
		timeout?: number;
		onLog?: (chunk: string) => void;
	} = {},
): Promise<SpawnResult> {
	return new Promise((resolve, reject) => {
		const child = spawn(command, args, {
			cwd: options.cwd,
			env: { ...getProcessEnv(), ...options.env },
			stdio: ["ignore", "pipe", "pipe"],
		});

		let stdout = "";
		let stderr = "";
		let killed = false;

		// Timeout
		const timeoutId = options.timeout
			? setTimeout(() => {
					killed = true;
					child.kill("SIGTERM");
				}, options.timeout)
			: null;

		// Streaming
		child.stdout?.setEncoding("utf8");
		child.stdout?.on("data", (chunk: string) => {
			stdout += chunk;
			options.onLog?.(chunk);
		});

		child.stderr?.setEncoding("utf8");
		child.stderr?.on("data", (chunk: string) => {
			stderr += chunk;
			options.onLog?.(chunk);
		});

		child.on("close", (code) => {
			if (timeoutId) clearTimeout(timeoutId);
			resolve({
				stdout: stdout.trim(),
				stderr: stderr.trim(),
				exitCode: killed ? 124 : (code ?? 1),
			});
		});

		child.on("error", reject);
	});
}

// ============================================================================
// PROVIDER: Claude
// ============================================================================

export class ClaudeProvider implements Provider {
	readonly type = "claude";
	readonly name = "Claude Code";

	async execute(request: ExecuteRequest): Promise<ExecuteResult> {
		const start = Date.now();

		// Validación inline
		if (!request.task?.trim()) {
			throw new Error("Task is required");
		}

		const args = [
			"-p",
			request.task,
			"--allowedTools",
			"Read,Edit,Write,Bash,Glob,Grep,LS,Task,URLFetch",
			...(request.verbose ? ["--verbose"] : []),
			...(request.model ? ["--model", request.model] : []),
		];

		const result = await spawnWithStreaming("claude", args, {
			cwd: request.workspace,
			timeout: request.timeout ?? 600_000,
			env: { CLAUDE_CODE_DISABLE_PROMPTS: "1" },
			onLog: request.onLog,
		});

		return {
			success: result.exitCode === 0,
			output: result.stdout || "Command completed",
			error: result.stderr || undefined,
			duration: Date.now() - start,
			statistics: this.extractStats(result.stdout),
		};
	}

	async testConnection(): Promise<boolean> {
		try {
			const result = await spawnWithStreaming("claude", ["--version"], {
				timeout: 5000,
			});
			return result.exitCode === 0;
		} catch {
			return false;
		}
	}

	private extractStats(output: string): ExecuteResult["statistics"] {
		// Parseo simple de estadísticas del output
		const tokensIn = output.match(/input[\s\w]*tokens?:\s*(\d+)/i)?.[1];
		const tokensOut = output.match(/output[\s\w]*tokens?:\s*(\d+)/i)?.[1];

		return {
			tokensInput: tokensIn ? Number.parseInt(tokensIn, 10) : undefined,
			tokensOutput: tokensOut ? Number.parseInt(tokensOut, 10) : undefined,
		};
	}
}

// ============================================================================
// PROVIDER: OpenCode
// ============================================================================

export class OpenCodeProvider implements Provider {
	readonly type = "opencode";
	readonly name = "OpenCode";

	async execute(request: ExecuteRequest): Promise<ExecuteResult> {
		const start = Date.now();

		if (!request.task?.trim()) {
			throw new Error("Task is required");
		}

		const args = [
			"run",
			request.task,
			...(request.model ? ["--model", request.model] : []),
		];

		const result = await spawnWithStreaming("opencode", args, {
			cwd: request.workspace,
			timeout: request.timeout ?? 600_000,
			onLog: request.onLog,
		});

		return {
			success: result.exitCode === 0,
			output: result.stdout,
			error: result.stderr || undefined,
			duration: Date.now() - start,
		};
	}

	async testConnection(): Promise<boolean> {
		try {
			const result = await spawnWithStreaming("opencode", ["--version"], {
				timeout: 5000,
			});
			return result.exitCode === 0;
		} catch {
			return false;
		}
	}
}

// ============================================================================
// PROVIDER: External Agent (para Codex u otros genéricos)
// ============================================================================

export class ExternalAgentProvider implements Provider {
	readonly type = "external-agent";
	readonly name = "External Agent";

	constructor(
		private options: {
			cli: string;
			defaultArgs?: string[];
			timeout?: number;
			env?: Record<string, string>;
		},
	) {}

	async execute(request: ExecuteRequest): Promise<ExecuteResult> {
		const start = Date.now();

		if (!request.task?.trim()) {
			throw new Error("Task is required");
		}

		const args = [
			...(this.options.defaultArgs || []),
			request.task,
			...(request.model ? ["--model", request.model] : []),
		];

		const result = await spawnWithStreaming(this.options.cli, args, {
			cwd: request.workspace,
			timeout: request.timeout ?? this.options.timeout ?? 600_000,
			env: this.options.env,
			onLog: request.onLog,
		});

		return {
			success: result.exitCode === 0,
			output: result.stdout,
			error: result.stderr || undefined,
			duration: Date.now() - start,
		};
	}

	async testConnection(): Promise<boolean> {
		try {
			const result = await spawnWithStreaming(this.options.cli, ["--version"], {
				timeout: 5000,
			});
			return result.exitCode === 0;
		} catch {
			return false;
		}
	}
}

// ============================================================================
// PROVIDER: Kimi (Moonshot AI CLI)
// ============================================================================

export class KimiProvider implements Provider {
	readonly type = "kimi";
	readonly name = "Kimi";

	async execute(request: ExecuteRequest): Promise<ExecuteResult> {
		const start = Date.now();

		if (!request.task?.trim()) {
			throw new Error("Task is required");
		}

		const args = [
			"run",
			"--prompt",
			request.task,
			...(request.model ? ["--model", request.model] : []),
			...(request.verbose ? ["--verbose"] : []),
		];

		const result = await spawnWithStreaming("kimi", args, {
			cwd: request.workspace,
			timeout: request.timeout ?? 600_000,
			env: { KIMI_DISABLE_PROMPTS: "1" },
			onLog: request.onLog,
		});

		return {
			success: result.exitCode === 0,
			output: result.stdout,
			error: result.stderr || undefined,
			duration: Date.now() - start,
			statistics: this.extractStats(result.stdout),
		};
	}

	async testConnection(): Promise<boolean> {
		try {
			const result = await spawnWithStreaming("kimi", ["--version"], {
				timeout: 5000,
			});
			return result.exitCode === 0;
		} catch {
			return false;
		}
	}

	private extractStats(output: string): ExecuteResult["statistics"] {
		const tokensIn = output.match(/input[\s\w]*tokens?:\s*(\d+)/i)?.[1];
		const tokensOut = output.match(/output[\s\w]*tokens?:\s*(\d+)/i)?.[1];

		return {
			tokensInput: tokensIn ? Number.parseInt(tokensIn, 10) : undefined,
			tokensOutput: tokensOut ? Number.parseInt(tokensOut, 10) : undefined,
		};
	}
}

// ============================================================================
// PROVIDER: Codex (usa @openai/codex-sdk)
// ============================================================================

export class CodexProvider implements Provider {
	readonly type = "codex";
	readonly name = "Codex";

	async execute(request: ExecuteRequest): Promise<ExecuteResult> {
		const start = Date.now();

		if (!request.task?.trim()) {
			throw new Error("Task is required");
		}

		const workspace = request.workspace ?? process.cwd();
		const selectedModel = request.model;

		const commandExecutionIds = new Set<string>();
		const toolCallIds = new Set<string>();
		const changedFilePaths = new Set<string>();
		const requestId = `codex-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

		let toolCalls = 0;
		let tokensInput = 0;
		let tokensOutput = 0;
		let finalResponse = "";
		let failureMessage = "";

		const buildStatistics = (): ExecuteResult["statistics"] => ({
			creditsSpent: 0,
			toolCalls,
			model: selectedModel || "default",
			filesChanged: changedFilePaths.size,
			processesCreated: commandExecutionIds.size,
			requestId,
			tokensInput,
			tokensOutput,
			duration: Date.now() - start,
		});

		const markToolCall = (key: string) => {
			if (!toolCallIds.has(key)) {
				toolCallIds.add(key);
				toolCalls += 1;
			}
		};

		try {
			// @ts-expect-error - Optional dependency, only available if installed
			const { Codex } = await import("@openai/codex-sdk");
			const codex = new Codex();
			const threadOptions: {
				workingDirectory: string;
				modelReasoningEffort: string;
				model?: string;
			} = {
				workingDirectory: workspace,
				modelReasoningEffort: "medium",
			};
			if (selectedModel) {
				threadOptions.model = selectedModel;
			}
			const thread = codex.startThread(threadOptions);
			const { events } = await thread.runStreamed(request.task);

			for await (const event of events as AsyncGenerator<
				Record<string, unknown>
			>) {
				request.onLog?.(JSON.stringify(event));
				const eventType = typeof event.type === "string" ? event.type : "";

				if (eventType === "turn.completed") {
					const usage =
						event.usage && typeof event.usage === "object"
							? (event.usage as Record<string, unknown>)
							: null;
					const nextInput =
						usage && typeof usage.input_tokens === "number"
							? usage.input_tokens
							: 0;
					const nextOutput =
						usage && typeof usage.output_tokens === "number"
							? usage.output_tokens
							: 0;
					tokensInput = Math.max(tokensInput, nextInput);
					tokensOutput = Math.max(tokensOutput, nextOutput);
					continue;
				}

				if (eventType === "turn.failed") {
					const errorValue =
						event.error && typeof event.error === "object"
							? (event.error as Record<string, unknown>)
							: null;
					failureMessage =
						(errorValue && typeof errorValue.message === "string"
							? errorValue.message
							: "") || "Codex turn failed";
					continue;
				}

				if (eventType === "error") {
					failureMessage =
						(typeof event.message === "string" && event.message) ||
						"Codex stream error";
					continue;
				}

				if (
					eventType !== "item.started" &&
					eventType !== "item.updated" &&
					eventType !== "item.completed"
				) {
					continue;
				}

				const item =
					event.item && typeof event.item === "object"
						? (event.item as Record<string, unknown>)
						: null;
				if (!item) continue;

				const itemType = typeof item.type === "string" ? item.type : "";
				const itemId = typeof item.id === "string" ? item.id : "";

				if (itemType === "agent_message") {
					const text = typeof item.text === "string" ? item.text.trim() : "";
					if (text.length > 0) {
						finalResponse = text;
					}
					continue;
				}

				if (itemType === "command_execution") {
					const fallbackKey =
						typeof item.command === "string"
							? item.command
							: `cmd-${Date.now()}`;
					const commandKey = itemId || fallbackKey;
					if (!commandExecutionIds.has(commandKey)) {
						commandExecutionIds.add(commandKey);
						markToolCall(`command:${commandKey}`);
					}
					continue;
				}

				if (itemType === "mcp_tool_call" || itemType === "web_search") {
					markToolCall(itemId || `${itemType}:${Date.now()}`);
					continue;
				}

				if (itemType === "file_change") {
					const changes = Array.isArray(item.changes) ? item.changes : [];
					for (const change of changes) {
						if (!change || typeof change !== "object") continue;
						const path = (change as Record<string, unknown>).path;
						if (typeof path === "string" && path.trim().length > 0) {
							changedFilePaths.add(path);
						}
					}
					continue;
				}

				if (itemType === "error" && !failureMessage) {
					failureMessage =
						(typeof item.message === "string" && item.message) ||
						"Codex item error";
				}
			}

			const duration = Date.now() - start;
			const hasFailure = failureMessage.trim().length > 0;

			return {
				success: !hasFailure,
				output:
					finalResponse || (hasFailure ? "" : "Task completed successfully"),
				error: hasFailure ? failureMessage : undefined,
				duration,
				statistics: buildStatistics(),
			};
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			const duration = Date.now() - start;
			return {
				success: false,
				output: finalResponse,
				error: failureMessage || message,
				duration,
				statistics: buildStatistics(),
			};
		}
	}

	async testConnection(): Promise<boolean> {
		try {
			// @ts-expect-error - Optional dependency, only available if installed
			await import("@openai/codex-sdk");
			return true;
		} catch {
			return false;
		}
	}
}

// ============================================================================
// FACTORY: Crear registry con providers por defecto
// ============================================================================

export function createDefaultRegistry(): ProviderRegistry {
	const registry = new ProviderRegistry();
	registry.register(new ClaudeProvider());
	registry.register(new OpenCodeProvider());
	registry.register(new KimiProvider());
	registry.register(new CodexProvider());
	return registry;
}

// ============================================================================
// OPENFARM API SIMPLIFICADA
// ============================================================================

export interface OpenFarmConfig {
	defaultProvider?: string;
	defaultTimeout?: number;
}

export class OpenFarm {
	private registry: ProviderRegistry;
	private config: OpenFarmConfig;

	constructor(config: OpenFarmConfig = {}) {
		this.config = config;
		this.registry = createDefaultRegistry();
	}

	async execute(
		options: ExecuteRequest & { provider?: string },
	): Promise<ExecuteResult> {
		const providerType =
			options.provider ?? this.config.defaultProvider ?? "claude";
		const provider = this.registry.get(providerType);

		if (!provider) {
			const available = this.registry.list().join(", ");
			throw new Error(
				`Provider '${providerType}' not found. Available: ${available}`,
			);
		}

		return provider.execute({
			...options,
			timeout: options.timeout ?? this.config.defaultTimeout,
		});
	}

	async testConnection(provider?: string): Promise<boolean> {
		const providerType = provider ?? this.config.defaultProvider ?? "claude";
		const p = this.registry.get(providerType);
		if (!p) return false;
		return p.testConnection();
	}

	getRegistry(): ProviderRegistry {
		return this.registry;
	}

	registerProvider(provider: Provider): void {
		this.registry.register(provider);
	}
}
