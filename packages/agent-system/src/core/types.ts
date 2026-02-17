import type { ChangesSummary } from "@openfarm/core/types/adapters";

export interface AgentPluginMeta {
	id: string;
	name: string;
	description: string;
	version: string;
	defaultCommand: string;
	supportsStreaming: boolean;
	supportsInterrupt: boolean;
	supportsFileContext: boolean;
	supportsSubagentTracing: boolean;
	structuredOutputFormat?: "json" | "jsonl";
}

export interface AgentDetectResult {
	available: boolean;
	version?: string;
	executablePath?: string;
	error?: string;
}

export interface AgentExecutionResult {
	executionId: string;
	status: "completed" | "failed" | "interrupted" | "timeout";
	exitCode?: number;
	stdout: string;
	stderr: string;
	durationMs: number;
	error?: string;
	changes?: ChangesSummary;
	cost?: { inputTokens?: number; outputTokens?: number; totalUSD?: number };
}

export interface AgentExecuteOptions {
	cwd?: string;
	timeout?: number;
	env?: Record<string, string>;
	flags?: string[];
	model?: string;
	contextFiles?: string[];
	onStdout?: (data: string) => void;
	onStderr?: (data: string) => void;
	onStart?: (executionId: string) => void;
	onEnd?: (result: AgentExecutionResult) => void;
	onChanges?: (changes: ChangesSummary) => void;
	onLog?: (message: string) => void;
	subagentTracing?: boolean;
}

export interface AgentExecutionHandle {
	executionId: string;
	promise: Promise<AgentExecutionResult>;
	interrupt(): void;
	isRunning(): boolean;
}

export interface AgentPlugin {
	readonly meta: AgentPluginMeta;

	initialize(config: Record<string, unknown>): Promise<void>;
	isReady(): Promise<boolean>;
	detect(): Promise<AgentDetectResult>;

	execute(prompt: string, options?: AgentExecuteOptions): AgentExecutionHandle;

	interrupt(executionId: string): boolean;
	interruptAll(): void;
	getCurrentExecution(): AgentExecutionHandle | undefined;
	validateModel(model: string): string | null;
	dispose(): Promise<void>;
}

export interface AgentPluginFactory {
	create(config?: Record<string, unknown>): AgentPlugin;
	getMeta(): AgentPluginMeta;
	canCreate(pluginId: string): boolean;
}

export interface AgentPluginConfig {
	id: string;
	config?: Record<string, unknown>;
}

export interface RegisteredPlugin {
	meta: AgentPluginMeta;
	factory: AgentPluginFactory;
	isBuiltin: boolean;
}
