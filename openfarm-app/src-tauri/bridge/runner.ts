import { OpenFarm } from "@openfarm/sdk";
import { getAvailableModels as getClaudeModels } from "@openfarm/provider-claude";
import { getAvailableModels as getOpenCodeModels } from "@openfarm/provider-opencode";
import { spawnSync } from "node:child_process";

interface BridgeRequest {
	kind?: "execute" | "catalog";
	task?: string;
	workspace?: string;
	provider?: string;
	model?: string;
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

function parseModels(raw: string): string[] {
	const values = raw
		.split("\n")
		.map((line) => line.trim())
		.filter((line) => /^[a-zA-Z0-9._:-]+(\/[a-zA-Z0-9._:-]+)*$/.test(line));
	return [...new Set(values)];
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

function getCodexModels(): string[] {
	const commands: Array<{ cmd: string; args: string[] }> = [
		{ cmd: "codex", args: ["models"] },
		{ cmd: "codex", args: ["model", "list"] },
	];
	for (const command of commands) {
		const result = spawnSync(command.cmd, command.args, {
			encoding: "utf8",
			timeout: 5000,
			stdio: ["ignore", "pipe", "ignore"],
		});
		if (result.status !== 0 || !result.stdout) {
			continue;
		}
		const parsed = parseModels(result.stdout);
		if (parsed.length > 0) {
			return parsed;
		}
	}
	return ["codex-mini-latest", "o4-mini", "o3"];
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

async function loadProviderCatalog(): Promise<BridgeProviderCatalog[]> {
	const client = new OpenFarm();
	const available = new Set(await client.getAvailableProviders());

	const claudeModels = getClaudeModels();
	const opencodeModels = getOpenCodeModels();
	const codexModels = getCodexModels();

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
			models: toModelOptions(codexModels, () => "Codex CLI"),
			defaultModel: codexModels[0] || "codex-mini-latest",
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
				models: toModelOptions(["codex-mini-latest"], () => "Codex CLI"),
				defaultModel: "codex-mini-latest",
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

	const client = new OpenFarm({
		defaultProvider: request.provider || "opencode",
		defaultModel: request.model,
	});

	const result = await client.execute({
		task: request.task || "",
		workspace: request.workspace || "",
		provider: request.provider,
		model: request.model,
		cli: request.cli,
		args: request.args,
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
