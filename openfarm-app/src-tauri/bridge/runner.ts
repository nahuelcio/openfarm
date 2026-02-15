import { OpenFarm } from "@openfarm/sdk";
import { getAvailableModels as getClaudeModels } from "@openfarm/provider-claude";
import { getAvailableModels as getOpenCodeModels } from "@openfarm/provider-opencode";
import {
	getCodexCatalog,
	getCodexConfigSnapshot,
	resolveCodexExecutionArgs,
} from "../../../packages/provider-codex/src/index";

interface BridgeRequest {
	kind?: "execute" | "catalog";
	task?: string;
	context?: string;
	workspace?: string;
	provider?: string;
	model?: string;
	agent?: string;
	cli?: string;
	args?: string[];
}

interface BridgeProviderCatalog {
	id: "claude-code" | "codex" | "opencode";
	name: string;
	description: string;
	color: string;
	connected: boolean;
	apiKey: string;
	models: Array<{
		id: string;
		name: string;
		description: string;
	}>;
	defaultModel: string;
	agents?: Array<{
		id: string;
		name: string;
		description: string;
	}>;
	defaultAgent?: string;
}

function emit(event: Record<string, unknown>): void {
	process.stdout.write(`${JSON.stringify(event)}\n`);
}

async function readStdin(): Promise<string> {
	return await new Promise((resolve, reject) => {
		let data = "";
		process.stdin.setEncoding("utf8");
		process.stdin.on("data", (chunk) => {
			data += chunk;
		});
		process.stdin.on("end", () => resolve(data));
		process.stdin.on("error", reject);
	});
}

function providerLabel(modelId: string): string {
	const [prefix] = modelId.split("/");
	switch (prefix) {
		case "openrouter":
			return "OpenRouter";
		case "github-copilot":
			return "GitHub Copilot";
		case "zai":
			return "ZAI";
		case "zai-coding-plan":
			return "ZAI Coding Plan";
		case "opencode":
			return "OpenCode";
		default:
			return "External";
	}
}

function modelName(modelId: string): string {
	const segments = modelId.split("/");
	return segments[segments.length - 1] || modelId;
}

function toModelOptions(
	models: string[],
	mapDescription?: (modelId: string) => string,
): BridgeProviderCatalog["models"] {
	return models.map((modelId) => ({
		id: modelId,
		name: modelName(modelId),
		description: mapDescription?.(modelId) || "Available model",
	}));
}

function isCodexBridgeRequest(request: BridgeRequest): boolean {
	const provider = (request.provider || "").trim().toLowerCase();
	const cli = (request.cli || "").trim().toLowerCase();
	return provider === "codex" || (provider === "external-agent" && cli === "codex");
}

async function loadProviderCatalog(): Promise<BridgeProviderCatalog[]> {
	const client = new OpenFarm();
	const available = new Set(await client.getAvailableProviders());

	const claudeModels = getClaudeModels();
	const opencodeModels = getOpenCodeModels();
	const codexCatalog = getCodexCatalog();
	const codexModels = codexCatalog.models;
	const codexModes = codexCatalog.modes;

	return [
		{
			id: "claude-code",
			name: "Claude Code",
			description: "Anthropic CLI agent",
			color: "#d97756",
			connected: available.has("claude"),
			apiKey: "",
			models: toModelOptions(claudeModels, () => "Anthropic"),
			defaultModel: claudeModels[0] || "claude-4-5-sonnet",
		},
		{
			id: "codex",
			name: "Codex",
			description: "OpenAI Codex CLI agent",
			color: "#10a37f",
			connected: available.has("external-agent"),
			apiKey: "",
			models: codexModels.map((model) => ({
				id: model.id,
				name: model.name,
				description: model.description,
			})),
			defaultModel: codexCatalog.defaultModel || codexModels[0]?.id || "gpt-5.3-codex",
			agents: codexModes.map((mode) => ({
				id: mode.id,
				name: mode.name,
				description: mode.description,
			})),
			defaultAgent: codexCatalog.defaultMode,
		},
		{
			id: "opencode",
			name: "OpenCode",
			description: "OpenCode CLI agent",
			color: "#06b6d4",
			connected: available.has("opencode"),
			apiKey: "",
			models: toModelOptions(opencodeModels, providerLabel),
			defaultModel: opencodeModels[0] || "opencode/gpt-5-nano",
		},
	].map((provider) => {
		if (provider.models.length > 0) {
			return provider;
		}
		if (provider.id === "claude-code") {
			return {
				...provider,
				models: toModelOptions(["claude-4-5-sonnet"], () => "Anthropic"),
				defaultModel: "claude-4-5-sonnet",
			};
		}
		if (provider.id === "codex") {
			return {
				...provider,
				models:
					provider.models.length > 0
						? provider.models
						: [
								{
									id: "gpt-5.3-codex",
									name: "gpt-5.3-codex",
									description: "Codex CLI model",
								},
							],
				defaultModel: provider.defaultModel || "gpt-5.3-codex",
				agents:
					provider.agents && provider.agents.length > 0
						? provider.agents
						: [
								{
									id: "reasoning:medium",
									name: "medium",
									description: "Codex reasoning effort: medium",
								},
							],
				defaultAgent: provider.defaultAgent || "reasoning:medium",
			};
		}
		return {
			...provider,
			models: toModelOptions(["opencode/gpt-5-nano"], providerLabel),
			defaultModel: "opencode/gpt-5-nano",
		};
	});
}

async function main(): Promise<void> {
	const raw = await readStdin();
	const request = JSON.parse(raw) as BridgeRequest;
	if (request.kind === "catalog") {
		const providers = await loadProviderCatalog();
		emit({
			type: "catalog",
			providers,
		});
		return;
	}

	const selectedAgent = request.agent?.trim();
	const codexRequest = isCodexBridgeRequest(request);
	const codexProfiles = codexRequest
		? getCodexConfigSnapshot().profiles.map((profile) => profile.id)
		: [];
	const resolvedProvider = codexRequest
		? "external-agent"
		: request.provider || "opencode";
	const resolvedCli = codexRequest ? "codex" : request.cli;
	const resolvedArgs = codexRequest
		? resolveCodexExecutionArgs({
				model: request.model,
				mode: selectedAgent,
				knownProfiles: codexProfiles,
			})
		: request.args;

	const client = new OpenFarm({
		defaultProvider: resolvedProvider,
		defaultModel: request.model,
	});

	if (resolvedProvider === "opencode") {
		if (selectedAgent && selectedAgent !== "general") {
			process.env.OPENCODE_AGENT = selectedAgent;
		} else {
			delete process.env.OPENCODE_AGENT;
		}
	}

	const result = await client.execute({
		task: request.task || "",
		context: request.context,
		workspace: request.workspace || "",
		provider: resolvedProvider,
		model: request.model,
		agentName: selectedAgent,
		cli: resolvedCli,
		args: resolvedArgs,
		onLog: (chunk) => emit({ type: "log", chunk }),
	});

	if (result.success) {
		emit({
			type: "result",
			success: true,
			output: result.output || "",
			duration: result.duration,
		});
		return;
	}

	emit({
		type: "result",
		success: false,
		output: result.output || "",
		error: result.error || "Bridge execution failed",
		duration: result.duration,
	});
	process.exitCode = 1;
}

main().catch((error) => {
	emit({
		type: "error",
		message: error instanceof Error ? error.message : String(error),
	});
	process.exitCode = 1;
});
