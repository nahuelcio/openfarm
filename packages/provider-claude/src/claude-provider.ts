import type {
	CommunicationRequest,
	CommunicationStrategy,
	ConfigurationManager,
	ExecutionOptions,
	ExecutionResult,
	Provider,
	ProviderMetadata,
	StreamResponseParser,
} from "@openfarm/sdk";
import {
	CLAUDE_DEFAULT_TIMEOUT,
	createClaudeMetadata,
} from "./provider-definition";
import { StatisticsCollector } from "./statistics-collector";

const INPUT_TOKEN_KEYS = new Set([
	"input_tokens",
	"inputTokens",
	"prompt_tokens",
	"promptTokens",
	"tokens_input",
	"tokensInput",
]);
const OUTPUT_TOKEN_KEYS = new Set([
	"output_tokens",
	"outputTokens",
	"completion_tokens",
	"completionTokens",
	"tokens_output",
	"tokensOutput",
]);
const CREDIT_KEYS = new Set([
	"credits_spent",
	"creditsSpent",
	"total_usd",
	"totalUSD",
	"cost_usd",
	"costUSD",
	"total_cost",
	"totalCost",
	"cost",
]);
const FILE_PATH_KEYS = new Set(["filePath", "file_path", "path", "targetPath"]);
const COMMAND_KEYS = new Set(["command", "cmd"]);

interface RuntimeStatsAccumulator {
	tokensInput: number;
	tokensOutput: number;
	creditsSpent: number;
	seenFiles: Set<string>;
	seenCommands: Set<string>;
}

/**
 * Claude provider implementation
 */
export class ClaudeProvider implements Provider {
	readonly type = "claude";
	readonly name = "Claude Code";

	private readonly config: { timeout: number };
	private readonly communicationStrategy: CommunicationStrategy;
	private readonly responseParser: StreamResponseParser;
	private readonly configManager: ConfigurationManager;

	constructor(
		communicationStrategy: CommunicationStrategy,
		responseParser: StreamResponseParser,
		configManager: ConfigurationManager,
		config: { timeout?: number } = {},
	) {
		this.communicationStrategy = communicationStrategy;
		this.responseParser = responseParser;
		this.configManager = configManager;

		this.config = {
			timeout: CLAUDE_DEFAULT_TIMEOUT,
			...config,
		};
	}

	getMetadata(): ProviderMetadata {
		return createClaudeMetadata();
	}

	async execute(options: ExecutionOptions): Promise<ExecutionResult> {
		const startTime = Date.now();
		const onLog = options.onLog;

		// Initialize statistics collector
		const statsCollector = new StatisticsCollector(
			options.model || "claude-code",
		);
		const runtimeStats: RuntimeStatsAccumulator = {
			tokensInput: 0,
			tokensOutput: 0,
			creditsSpent: 0,
			seenFiles: new Set<string>(),
			seenCommands: new Set<string>(),
		};

		const log = (msg: string) => {
			if (onLog) {
				onLog(msg);
			}
		};
		const buildStatistics = (duration: number) =>
			statsCollector.getStatistics(
				runtimeStats.tokensInput,
				runtimeStats.tokensOutput,
				{
					creditsSpent: runtimeStats.creditsSpent,
					duration,
				},
			);

		try {
			// Validate options
			if (!options.task?.trim()) {
				throw new Error("Task is required and cannot be empty");
			}

			const isAvailable = await this.testConnection();
			if (!isAvailable) {
				const error =
					"Claude Code CLI not found. Install: npm install -g @anthropic-ai/claude-code";
				log(`❌ ${error}`);
				return {
					success: false,
					output: error,
					duration: Date.now() - startTime,
					error,
				};
			}

			const args = this.buildCliArgs(options);
			log(
				`🚀 claude ${args.map((a) => (a.includes(" ") ? `"${a}"` : a)).join(" ")}`,
			);

			const request: CommunicationRequest = {
				args,
				workingDirectory: options.workspace || process.cwd(),
				env: {
					CLAUDE_CODE_DISABLE_PROMPTS: "1",
				},
				timeout: this.config.timeout,
			};

			const response = await this.communicationStrategy.execute(request);
			this.trackStructuredChunk(response.body, runtimeStats, statsCollector);
			this.trackStructuredChunk(response.error, runtimeStats, statsCollector);

			if (!response.success) {
				const duration = Date.now() - startTime;
				return {
					success: false,
					output: response.body,
					duration,
					error: response.error || "Execution failed",
					statistics: buildStatistics(duration),
				};
			}

			let output = response.body;
			try {
				const parsed = await this.responseParser.parse(response);
				output = typeof parsed === "string" ? parsed : response.body;
			} catch (error) {
				if (!output.trim()) {
					output = "Claude command completed successfully";
				}
				log(
					`⚠️ Parser failed, using fallback output: ${error instanceof Error ? error.message : "Unknown error"}`,
				);
			}

			const duration = Date.now() - startTime;
			const statistics = buildStatistics(duration);

			return {
				success: true,
				output,
				duration,
				statistics,
			};
		} catch (error) {
			const message = error instanceof Error ? error.message : "Unknown error";
			log(`❌ Error: ${message}`);
			const duration = Date.now() - startTime;
			return {
				success: false,
				output: `Claude execution failed: ${message}`,
				duration,
				error: message,
				statistics: buildStatistics(duration),
			};
		}
	}

	async testConnection(): Promise<boolean> {
		try {
			const request: CommunicationRequest = {
				args: ["--version"],
				timeout: 5000,
			};

			const response = await this.communicationStrategy.execute(request);
			return response.success;
		} catch {
			return false;
		}
	}

	validateConfig(config: unknown): boolean {
		return this.configManager.validate(config);
	}

	private buildCliArgs(options: ExecutionOptions): string[] {
		const args = [
			"-p",
			options.task,
			"--allowedTools",
			"Read,Edit,Write,Bash,Glob,Grep,LS,Task,URLFetch",
		];

		// Verbose mode: show detailed output
		if (options.verbose) {
			args.push("--verbose");
		}

		if (options.model) {
			args.push("--model", options.model);
		}

		return args;
	}

	private trackStructuredChunk(
		chunk: string | undefined,
		runtimeStats: RuntimeStatsAccumulator,
		statsCollector: StatisticsCollector,
	): void {
		if (!chunk || chunk.trim().length === 0) {
			return;
		}
		for (const line of chunk.replaceAll("\r\n", "\n").split("\n")) {
			this.trackStructuredLine(line, runtimeStats, statsCollector);
		}
	}

	private trackStructuredLine(
		line: string,
		runtimeStats: RuntimeStatsAccumulator,
		statsCollector: StatisticsCollector,
	): void {
		const event = this.parseJsonRecord(line);
		if (!event) {
			return;
		}

		const type = typeof event.type === "string" ? event.type : "";
		const item = this.asRecord(event.item);
		const part = this.asRecord(event.part);

		const itemType =
			typeof item?.type === "string" ? item.type.toLowerCase() : "";
		const hasToolSignal =
			type === "tool_use" ||
			type === "tool_call" ||
			itemType.includes("tool") ||
			(typeof part?.tool === "string" && part.tool.trim().length > 0);
		if (hasToolSignal) {
			statsCollector.recordToolCall();
		}

		const fileCandidates: string[] = [];
		this.collectStringsByKeys(event, FILE_PATH_KEYS, fileCandidates);
		for (const filePath of fileCandidates) {
			if (!runtimeStats.seenFiles.has(filePath)) {
				runtimeStats.seenFiles.add(filePath);
				statsCollector.recordFileChanged();
			}
		}

		const commandCandidates: string[] = [];
		this.collectStringsByKeys(event, COMMAND_KEYS, commandCandidates);
		for (const command of commandCandidates) {
			if (!runtimeStats.seenCommands.has(command)) {
				runtimeStats.seenCommands.add(command);
				statsCollector.recordProcessCreated();
			}
		}

		const inputCandidates: number[] = [];
		this.collectNumbersByKeys(event, INPUT_TOKEN_KEYS, inputCandidates);
		if (inputCandidates.length > 0) {
			runtimeStats.tokensInput = Math.max(
				runtimeStats.tokensInput,
				...inputCandidates,
			);
		}

		const outputCandidates: number[] = [];
		this.collectNumbersByKeys(event, OUTPUT_TOKEN_KEYS, outputCandidates);
		if (outputCandidates.length > 0) {
			runtimeStats.tokensOutput = Math.max(
				runtimeStats.tokensOutput,
				...outputCandidates,
			);
		}

		const creditCandidates: number[] = [];
		this.collectNumbersByKeys(event, CREDIT_KEYS, creditCandidates);
		if (creditCandidates.length > 0) {
			runtimeStats.creditsSpent = Math.max(
				runtimeStats.creditsSpent,
				...creditCandidates,
			);
		}
	}

	private parseJsonRecord(line: string): Record<string, unknown> | null {
		const trimmed = line.trim();
		if (!(trimmed.startsWith("{") && trimmed.endsWith("}"))) {
			return null;
		}

		try {
			const parsed = JSON.parse(trimmed) as unknown;
			return this.asRecord(parsed);
		} catch {
			return null;
		}
	}

	private asRecord(value: unknown): Record<string, unknown> | null {
		if (value && typeof value === "object" && !Array.isArray(value)) {
			return value as Record<string, unknown>;
		}
		return null;
	}

	private collectNumbersByKeys(
		value: unknown,
		keys: Set<string>,
		sink: number[],
	): void {
		if (value === null || value === undefined) {
			return;
		}
		if (
			typeof value === "string" ||
			typeof value === "number" ||
			typeof value === "boolean"
		) {
			return;
		}
		if (Array.isArray(value)) {
			for (const item of value) {
				this.collectNumbersByKeys(item, keys, sink);
			}
			return;
		}

		const record = this.asRecord(value);
		if (!record) {
			return;
		}

		for (const [key, nested] of Object.entries(record)) {
			if (keys.has(key)) {
				const parsed = this.toFiniteNumber(nested);
				if (parsed !== null) {
					sink.push(parsed);
				}
			}
			this.collectNumbersByKeys(nested, keys, sink);
		}
	}

	private collectStringsByKeys(
		value: unknown,
		keys: Set<string>,
		sink: string[],
	): void {
		if (value === null || value === undefined) {
			return;
		}
		if (
			typeof value === "string" ||
			typeof value === "number" ||
			typeof value === "boolean"
		) {
			return;
		}
		if (Array.isArray(value)) {
			for (const item of value) {
				this.collectStringsByKeys(item, keys, sink);
			}
			return;
		}

		const record = this.asRecord(value);
		if (!record) {
			return;
		}

		for (const [key, nested] of Object.entries(record)) {
			if (keys.has(key) && typeof nested === "string") {
				const clean = nested.trim();
				if (clean.length > 0) {
					sink.push(clean);
				}
			}
			this.collectStringsByKeys(nested, keys, sink);
		}
	}

	private toFiniteNumber(value: unknown): number | null {
		if (typeof value === "number" && Number.isFinite(value)) {
			return value;
		}
		if (typeof value === "string") {
			const parsed = Number(value);
			if (Number.isFinite(parsed)) {
				return parsed;
			}
		}
		return null;
	}
}
