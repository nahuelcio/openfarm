import type { ChangesSummary } from "@openfarm/core/types/adapters";
import { BaseAgentPlugin } from "../core/base-agent";
import type {
	AgentExecuteOptions,
	AgentPluginFactory,
	AgentPluginMeta,
} from "../core/types";

interface OpencodeEvent {
	type?: string;
	part?: {
		text?: string;
		tool?: string;
		state?: {
			status?: string;
			input?: { filePath?: string; command?: string };
			metadata?: { diff?: string };
		};
	};
}

const OPENCODE_METADATA_PATTERNS: RegExp[] = [
	/^[|!]\s+/, // Tool calls, status lines
	/^\s*\[\d+\/\d+\]/, // Progress indicators [1/3]
	/^(Reading|Writing|Creating|Updating|Running)\s+/i,
	/^\s*\{[\s\S]*"type":\s*"/, // JSON event objects
	/^\s*\{[\s\S]*"description":\s*"/,
	/^\s*\{[\s\S]*"path":\s*"/,
	/^\s*\{[\s\S]*"pattern":\s*"/,
];

function isMetadataLine(line: string): boolean {
	const clean = stripAnsi(line);
	return OPENCODE_METADATA_PATTERNS.some((pattern) => pattern.test(clean));
}

function filterMetadata(text: string): string {
	return text
		.split("\n")
		.filter((line) => !isMetadataLine(line))
		.join("\n");
}

function stripAnsi(input: string): string {
	let result = "";
	let index = 0;

	while (index < input.length) {
		const char = input[index];
		if (char === "\u001b" && input[index + 1] === "[") {
			index += 2;
			while (index < input.length && input[index] !== "m") {
				index += 1;
			}
			if (index < input.length && input[index] === "m") {
				index += 1;
			}
			continue;
		}
		result += char;
		index += 1;
	}

	return result;
}

export class OpenCodeAgent extends BaseAgentPlugin {
	readonly meta: AgentPluginMeta = {
		id: "opencode",
		name: "OpenCode",
		description: "OpenCode CLI coding agent",
		version: "0.1.0",
		defaultCommand: "bunx",
		supportsStreaming: true,
		supportsInterrupt: true,
		supportsFileContext: true,
		supportsSubagentTracing: false,
		structuredOutputFormat: "json",
	};

	private provider?: string;
	private model?: string;
	private agent: "general" | "build" | "plan" = "general";
	private format: "default" | "json" = "json";

	async initialize(config: Record<string, unknown>): Promise<void> {
		await super.initialize(config);

		if (typeof config.provider === "string" && config.provider.length > 0) {
			this.provider = config.provider;
		}
		if (typeof config.model === "string" && config.model.length > 0) {
			this.model = config.model;
		}
		if (
			typeof config.agent === "string" &&
			["general", "build", "plan"].includes(config.agent)
		) {
			this.agent = config.agent as "general" | "build" | "plan";
		}
		if (
			typeof config.format === "string" &&
			["default", "json"].includes(config.format)
		) {
			this.format = config.format as "default" | "json";
		}
	}

	protected buildArgs(
		_prompt: string,
		options?: AgentExecuteOptions,
	): string[] {
		const opencodeHost = process.env.OPENCODE_HOST || "127.0.0.1";
		const opencodePort = process.env.OPENCODE_PORT || "4096";
		const opencodeServerUrl = `http://${opencodeHost}:${opencodePort}`;

		const args = ["opencode-ai", "run", "--attach", opencodeServerUrl];

		if (this.agent !== "general") {
			args.push("--agent", this.agent);
		}

		const modelStr = this.buildModelString(options?.model);
		if (modelStr) {
			args.push("--model", modelStr);
		}

		if (this.format === "json") {
			args.push("--format", "json");
		}

		if (options?.contextFiles) {
			for (const file of options.contextFiles) {
				args.push("-f", file);
			}
		}

		return args;
	}

	protected getStdinInput(
		prompt: string,
		options?: AgentExecuteOptions,
	): string {
		const cwd = options?.cwd || (this.config.cwd as string | undefined);
		if (cwd) {
			return `IMPORTANT: Work ONLY in this repository: ${cwd}\n\n${prompt}`;
		}
		return prompt;
	}

	execute(prompt: string, options?: AgentExecuteOptions) {
		const filteredOptions: AgentExecuteOptions = {
			...options,
			onStdout: options?.onStdout
				? (data: string) => {
						const filtered = filterMetadata(data);
						if (filtered.trim()) {
							options.onStdout?.(filtered);
						}
					}
				: undefined,
		};
		return super.execute(prompt, filteredOptions);
	}

	protected parseOutput(stdout: string): ChangesSummary | undefined {
		const filesModified = new Set<string>();
		const filesCreated = new Set<string>();
		let summary = "";
		let diff = "";
		let totalCost = 0;

		const lines = stdout.split("\n").filter((line) => line.trim().length > 0);
		for (const line of lines) {
			try {
				const event = JSON.parse(line) as OpencodeEvent;
				if (!event.type) {
					continue;
				}

				if (event.type === "tool_use") {
					const tool = event.part?.tool;
					const status = event.part?.state?.status;
					const filePath = event.part?.state?.input?.filePath;
					if (status === "completed" && filePath) {
						if (tool === "edit") {
							filesModified.add(filePath);
							if (event.part?.state?.metadata?.diff) {
								diff += `${event.part.state.metadata.diff}\n`;
							}
						}
						if (tool === "write") {
							filesCreated.add(filePath);
						}
					}
				}

				if (event.type === "text" && event.part?.text) {
					summary += event.part.text;
				}

				if (event.type === "step_finish" && event.part) {
					const part = event.part as { cost?: number };
					if (typeof part.cost === "number") {
						totalCost += part.cost;
					}
				}
			} catch {
				// ignore malformed lines
			}
		}

		return {
			filesModified: Array.from(filesModified),
			filesCreated: Array.from(filesCreated),
			filesDeleted: [],
			diff: diff || undefined,
			summary: summary.trim() || "OpenCode execution completed",
			totalCost: totalCost || undefined,
		};
	}

	validateModel(model: string): string | null {
		if (!model) {
			return null;
		}
		if (model.includes("/")) {
			const [provider, modelName] = model.split("/");
			if (!(provider && modelName)) {
				return `Invalid model format "${model}". Expected: provider/model (e.g., anthropic/claude-3-5-sonnet)`;
			}
		}
		return null;
	}

	private buildModelString(override?: string): string | undefined {
		const model = override || this.model;
		if (this.provider && model) {
			return model.includes("/") ? model : `${this.provider}/${model}`;
		}
		return model;
	}
}

export class OpenCodeAgentFactory implements AgentPluginFactory {
	private static readonly META: AgentPluginMeta = {
		id: "opencode",
		name: "OpenCode",
		description: "OpenCode CLI coding agent",
		version: "0.1.0",
		defaultCommand: "bunx",
		supportsStreaming: true,
		supportsInterrupt: true,
		supportsFileContext: true,
		supportsSubagentTracing: false,
		structuredOutputFormat: "json",
	};

	create(): OpenCodeAgent {
		return new OpenCodeAgent();
	}

	getMeta(): AgentPluginMeta {
		return OpenCodeAgentFactory.META;
	}

	canCreate(pluginId: string): boolean {
		return pluginId === "opencode";
	}
}
