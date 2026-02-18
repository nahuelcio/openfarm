#!/usr/bin/env node

/**
 * TypeScript-first bridge runner.
 * Executes only Codex, Claude Code and OpenCode through the SDK.
 */

import { spawn, spawnSync } from "node:child_process";
import { OpenFarm } from "@openfarm/sdk";

interface RuntimeExecuteRequest {
    kind: "execute";
    request: {
        task: string;
        context?: string;
        workspace?: string;
        provider?: string;
        model?: string;
        agentMode?: string;
        agent?: string;
    };
}

interface CatalogRequest {
    kind: "catalog";
}

type IncomingRequest = RuntimeExecuteRequest | CatalogRequest;

interface AgentCatalogItem {
    id: string;
    name: string;
    description: string;
}

interface ProviderCatalogItem {
    id: "claude-code" | "codex" | "opencode";
    name: string;
    description: string;
    color: string;
    connected: boolean;
    apiKey: string;
    models: Array<{ id: string; name: string; description: string }>;
    defaultModel: string;
    agents?: AgentCatalogItem[];
    defaultAgent: string;
}

interface BridgeExecutionStatistics {
    credits_spent: number;
    tool_calls: number;
    model: string;
    files_changed: number;
    processes_created: number;
    request_id: string;
    tokens_input: number;
    tokens_output: number;
    duration: number;
}

interface BridgeExecutionResponse {
    success: boolean;
    output: string;
    error?: string;
    duration: number;
    statistics?: BridgeExecutionStatistics;
}

interface NormalizedExecuteRequest {
    task: string;
    context?: string;
    workspace?: string;
    provider?: string;
    model?: string;
    agent?: string;
}

function createRequestId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

const OPENCODE_DEFAULT_MODEL_CANDIDATES = [
    "openrouter/openai/gpt-4.1",
    "github-copilot/gpt-4.1",
    "openrouter/openai/gpt-5",
    "opencode/gpt-5-nano",
] as const;

function parseOpenCodeModelList(output: string): string[] {
    const unique = new Set<string>();
    for (const line of output.split("\n")) {
        const model = line.trim();
        if (!model) {
            continue;
        }

        if (/^[a-zA-Z0-9._:-]+(\/[a-zA-Z0-9._:-]+)*$/.test(model)) {
            unique.add(model);
        }
    }
    return [...unique];
}

function getOpenCodeModelCommands(): Array<{ cmd: string; args: string[] }> {
    const configured =
        typeof process !== "undefined" && process.env?.OPENCODE_COMMAND
            ? process.env.OPENCODE_COMMAND.trim()
            : "";

    if (!configured || configured === "undefined" || configured === "null") {
        return [
            { cmd: "opencode", args: ["models"] },
            { cmd: "bunx", args: ["opencode-ai", "models"] },
            { cmd: "opencode-ai", args: ["models"] },
        ];
    }

    if (configured === "bunx") {
        return [{ cmd: "bunx", args: ["opencode-ai", "models"] }];
    }

    return [{ cmd: configured, args: ["models"] }];
}

function describeOpenCodeModel(modelId: string): string {
    if (modelId.startsWith("minimax-coding-plan/")) {
        return "MiniMax Coding Plan via OpenCode";
    }
    if (modelId.startsWith("minimax/")) {
        return "MiniMax via OpenCode";
    }
    if (modelId.startsWith("kimi-for-coding/")) {
        return "Kimi for Coding via OpenCode";
    }
    if (modelId.startsWith("openrouter/")) {
        return "OpenRouter via OpenCode";
    }
    if (modelId.startsWith("github-copilot/")) {
        return "GitHub Copilot via OpenCode";
    }
    if (modelId.startsWith("zai-coding-plan/")) {
        return "ZAI Coding Plan via OpenCode";
    }
    if (modelId.startsWith("zai/")) {
        return "ZAI via OpenCode";
    }
    if (modelId.startsWith("opencode/")) {
        return "OpenCode curated model";
    }
    return "OpenCode provider model";
}

function getOpenCodeAgentCommands(): Array<{ cmd: string; args: string[] }> {
    const configured =
        typeof process !== "undefined" && process.env?.OPENCODE_COMMAND
            ? process.env.OPENCODE_COMMAND.trim()
            : "";

    if (!configured || configured === "undefined" || configured === "null") {
        return [
            { cmd: "opencode", args: ["agent", "list"] },
            { cmd: "bunx", args: ["opencode-ai", "agent", "list"] },
            { cmd: "opencode-ai", args: ["agent", "list"] },
        ];
    }

    if (configured === "bunx") {
        return [{ cmd: "bunx", args: ["opencode-ai", "agent", "list"] }];
    }

    return [{ cmd: configured, args: ["agent", "list"] }];
}

function parseOpenCodeAgentList(output: string): AgentCatalogItem[] {
    const agents: AgentCatalogItem[] = [];
    const lines = output.split("\n");
    
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        
        // Parse agent name from line (e.g., "atlas" or "build (primary)")
        const match = trimmed.match(/^(\w+)(?:\s*\(([^)]+)\))?/);
        if (match) {
            const id = match[1];
            const primary = match[2];
            agents.push({
                id,
                name: id,
                description: primary ? `Primary agent` : `OpenCode ${id} agent`,
            });
        }
    }
    
    return agents;
}

function getOpenCodeAgents(): AgentCatalogItem[] {
    for (const { cmd, args } of getOpenCodeAgentCommands()) {
        const result = spawnSync(cmd, args, {
            encoding: "utf8",
            timeout: 5000,
            stdio: ["ignore", "pipe", "ignore"],
        });

        if (result.status !== 0 || !result.stdout) {
            continue;
        }

        const agents = parseOpenCodeAgentList(result.stdout);
        if (agents.length > 0) {
            return agents;
        }
    }
    
    // Fallback to default agents
    return [
        { id: "general", name: "general", description: "Default OpenCode agent" },
        { id: "plan", name: "plan", description: "Planning-focused agent" },
    ];
}

function getOpenCodeCatalog(): {
    models: ProviderCatalogItem["models"];
    defaultModel: string;
    agents: AgentCatalogItem[];
} {
    let discoveredModels: string[] = [];
    for (const { cmd, args } of getOpenCodeModelCommands()) {
        const result = spawnSync(cmd, args, {
            encoding: "utf8",
            timeout: 8000,
            stdio: ["ignore", "pipe", "ignore"],
        });

        if (result.status !== 0 || !result.stdout) {
            continue;
        }

        const models = parseOpenCodeModelList(result.stdout);
        if (models.length > 0) {
            discoveredModels = models;
            break;
        }
    }

    const modelIds = discoveredModels;
    const models = modelIds.map((id) => ({
        id,
        name: id,
        description: describeOpenCodeModel(id),
    }));
    const modelSet = new Set(modelIds);
    const defaultModel =
        OPENCODE_DEFAULT_MODEL_CANDIDATES.find((id) => modelSet.has(id)) ||
        modelIds[0] ||
        "";
    
    const agents = getOpenCodeAgents();

    return { models, defaultModel, agents };
}

function getCodexModelCommands(): Array<{ cmd: string; args: string[] }> {
    const configured =
        typeof process !== "undefined" && process.env?.CODEX_COMMAND
            ? process.env.CODEX_COMMAND.trim()
            : "";

    if (!configured || configured === "undefined" || configured === "null") {
        return [
            { cmd: "codex", args: ["app-server", "--listen", "stdio://"] },
            { cmd: "bunx", args: ["codex", "app-server", "--listen", "stdio://"] },
        ];
    }

    if (configured === "bunx") {
        return [{ cmd: "bunx", args: ["codex", "app-server", "--listen", "stdio://"] }];
    }

    return [{ cmd: configured, args: ["app-server", "--listen", "stdio://"] }];
}

async function requestCodexCatalogFromCommand(
    cmd: string,
    args: string[],
): Promise<{
    models: ProviderCatalogItem["models"];
    defaultModel: string;
} | null> {
    return await new Promise((resolve) => {
        const child = spawn(cmd, args, {
            stdio: ["pipe", "pipe", "pipe"],
        });

        let settled = false;
        let stdoutBuffer = "";

        const finish = (
            value: {
                models: ProviderCatalogItem["models"];
                defaultModel: string;
            } | null,
        ) => {
            if (settled) {
                return;
            }
            settled = true;
            clearTimeout(timeoutHandle);
            try {
                child.kill("SIGTERM");
            } catch {
                // noop
            }
            resolve(value);
        };

        const timeoutHandle = setTimeout(() => {
            finish(null);
        }, 5000);

        child.on("error", () => {
            finish(null);
        });

        child.on("exit", () => {
            finish(null);
        });

        child.stdout.setEncoding("utf8");
        child.stdout.on("data", (chunk: string) => {
            stdoutBuffer += chunk;

            while (true) {
                const newLineIndex = stdoutBuffer.indexOf("\n");
                if (newLineIndex === -1) {
                    break;
                }

                const line = stdoutBuffer.slice(0, newLineIndex).trim();
                stdoutBuffer = stdoutBuffer.slice(newLineIndex + 1);
                if (!line) {
                    continue;
                }

                let message: Record<string, unknown>;
                try {
                    message = JSON.parse(line) as Record<string, unknown>;
                } catch {
                    continue;
                }

                const id = message.id;
                if (id !== 2) {
                    continue;
                }

                if (message.error) {
                    finish(null);
                    return;
                }

                const result =
                    message.result && typeof message.result === "object"
                        ? (message.result as Record<string, unknown>)
                        : null;
                const data = result && Array.isArray(result.data) ? result.data : [];
                if (data.length === 0) {
                    finish(null);
                    return;
                }

                const models: ProviderCatalogItem["models"] = [];
                const seenIds = new Set<string>();
                let defaultModel = "";

                for (const candidate of data) {
                    if (!candidate || typeof candidate !== "object") {
                        continue;
                    }
                    const model = candidate as Record<string, unknown>;
                    const idValue = model.model ?? model.id;
                    const modelId = typeof idValue === "string" ? idValue.trim() : "";
                    if (!modelId || seenIds.has(modelId)) {
                        continue;
                    }
                    seenIds.add(modelId);

                    const displayNameValue = model.displayName ?? modelId;
                    const descriptionValue = model.description;
                    const isDefault = model.isDefault === true;

                    models.push({
                        id: modelId,
                        name:
                            typeof displayNameValue === "string" &&
                            displayNameValue.trim().length > 0
                                ? displayNameValue.trim()
                                : modelId,
                        description:
                            typeof descriptionValue === "string" &&
                            descriptionValue.trim().length > 0
                                ? descriptionValue.trim()
                                : "OpenAI Codex model",
                    });

                    if (!defaultModel && isDefault) {
                        defaultModel = modelId;
                    }
                }

                if (models.length === 0) {
                    finish(null);
                    return;
                }

                finish({
                    models,
                    defaultModel: defaultModel || models[0].id,
                });
                return;
            }
        });

        child.stdin.write(
            `${JSON.stringify({
                jsonrpc: "2.0",
                id: 1,
                method: "initialize",
                params: {
                    protocolVersion: "2024-11-05",
                    clientInfo: {
                        name: "openfarm-bridge",
                        version: "0.1.0",
                    },
                    capabilities: {},
                },
            })}\n`,
        );
        child.stdin.write(
            `${JSON.stringify({
                jsonrpc: "2.0",
                method: "notifications/initialized",
                params: {},
            })}\n`,
        );
        child.stdin.write(
            `${JSON.stringify({
                jsonrpc: "2.0",
                id: 2,
                method: "model/list",
                params: {
                    limit: 200,
                },
            })}\n`,
        );
    });
}

async function getCodexCatalog(): Promise<{
    models: ProviderCatalogItem["models"];
    defaultModel: string;
}> {
    const attemptedCommands: string[] = [];
    for (const { cmd, args } of getCodexModelCommands()) {
        attemptedCommands.push([cmd, ...args].join(" "));
        const discovered = await requestCodexCatalogFromCommand(cmd, args);
        if (discovered && discovered.models.length > 0) {
            return discovered;
        }
    }

    throw new Error(
        `Codex model list failed. Tried: ${attemptedCommands.join(" | ") || "none"}`,
    );
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

function isRuntimeExecuteRequest(value: IncomingRequest): value is RuntimeExecuteRequest {
    return (
        typeof value === "object" &&
        value !== null &&
        "kind" in value &&
        value.kind === "execute" &&
        "request" in value &&
        typeof value.request === "object" &&
        value.request !== null
    );
}

function isCatalogRequest(value: IncomingRequest): value is CatalogRequest {
    return (
        typeof value === "object" &&
        value !== null &&
        "kind" in value &&
        value.kind === "catalog"
    );
}

function normalizeProvider(inputProvider?: string): {
    openFarmProvider: "claude" | "opencode" | "kimi" | "codex";
    providerId: "claude-code" | "opencode" | "kimi" | "codex";
    cli: "claude" | "opencode" | "kimi" | "codex";
} {
    const provider = (inputProvider || "").trim().toLowerCase();

    if (provider === "opencode") {
        return {
            openFarmProvider: "opencode",
            providerId: "opencode",
            cli: "opencode",
        };
    }

    if (provider === "kimi") {
        return {
            openFarmProvider: "kimi",
            providerId: "kimi",
            cli: "kimi",
        };
    }

    if (provider === "codex") {
        return {
            openFarmProvider: "codex",
            providerId: "codex",
            cli: "codex",
        };
    }

    return {
        openFarmProvider: "claude",
        providerId: "claude-code",
        cli: "claude",
    };
}

async function getCatalog(): Promise<ProviderCatalogItem[]> {
    const openCodeCatalog = getOpenCodeCatalog();

    let codexCatalog: { models: ProviderCatalogItem["models"]; defaultModel: string } | null = null;
    try {
        codexCatalog = await getCodexCatalog();
    } catch {
        // Codex unavailable — omit from catalog
    }

    const items: ProviderCatalogItem[] = [
        {
            id: "claude-code",
            name: "Claude Code",
            description: "Anthropic CLI agent",
            color: "#d97756",
            connected: true,
            apiKey: "",
            models: [
                {
                    id: "claude-sonnet-4-20250514",
                    name: "Claude Sonnet 4",
                    description: "Fast coding model",
                },
                {
                    id: "claude-opus-4-20250918",
                    name: "Claude Opus 4",
                    description: "Deep reasoning",
                },
            ],
            defaultModel: "claude-sonnet-4-20250514",
            defaultAgent: "claude-code",
        },
        {
            id: "opencode",
            name: "OpenCode",
            description: "OpenCode CLI agent",
            color: "#06b6d4",
            connected: true,
            apiKey: "",
            models: openCodeCatalog.models,
            defaultModel: openCodeCatalog.defaultModel,
            agents: openCodeCatalog.agents,
            defaultAgent: openCodeCatalog.agents[0]?.id || "general",
        },
    ];

    if (codexCatalog) {
        items.splice(1, 0, {
            id: "codex",
            name: "Codex",
            description: "OpenAI Codex CLI agent",
            color: "#10a37f",
            connected: true,
            apiKey: "",
            models: codexCatalog.models,
            defaultModel: codexCatalog.defaultModel,
            defaultAgent: "codex",
        });
    }

    return items;
}

function buildCodexPrompt(task: string, context?: string): string {
    const safeTask = task.trim();
    const safeContext = context?.trim();
    if (!safeContext) {
        return safeTask;
    }
    return `${safeContext}\n\n${safeTask}`;
}

async function executeWithOpenFarm(
    normalized: NormalizedExecuteRequest,
    provider: ReturnType<typeof normalizeProvider>,
): Promise<BridgeExecutionResponse> {
    const openFarm = new OpenFarm({
        defaultProvider: provider.openFarmProvider,
    });

    const result = await openFarm.execute({
        task: normalized.task,
        workspace: normalized.workspace,
        model: normalized.model,
        onLog: (chunk) => {
            if (typeof chunk === "string" && chunk.trim().length > 0) {
                emit({ type: "log", chunk });
            }
        },
    });

    return {
        success: result.success,
        output: result.output || "",
        error: result.error,
        duration: result.duration,
        statistics: result.statistics as unknown as BridgeExecutionStatistics | undefined,
    };
}

async function executeCodexWithSdk(
    normalized: NormalizedExecuteRequest,
): Promise<BridgeExecutionResponse> {
    const startedAt = Date.now();
    const workspace =
        normalized.workspace && normalized.workspace.trim().length > 0
            ? normalized.workspace
            : process.cwd();
    const selectedModel =
        normalized.model && normalized.model.trim().length > 0
            ? normalized.model.trim()
            : undefined;

    const commandExecutionIds = new Set<string>();
    const toolCallIds = new Set<string>();
    const changedFilePaths = new Set<string>();
    const requestId = createRequestId("codex-sdk");

    let toolCalls = 0;
    let tokensInput = 0;
    let tokensOutput = 0;
    let finalResponse = "";
    let failureMessage = "";

    const buildStatistics = (duration: number): BridgeExecutionStatistics => ({
        credits_spent: 0,
        tool_calls: toolCalls,
        model: selectedModel || "default",
        files_changed: changedFilePaths.size,
        processes_created: commandExecutionIds.size,
        request_id: requestId,
        tokens_input: tokensInput,
        tokens_output: tokensOutput,
        duration,
    });

    const abortController = new AbortController();
    const onStopSignal = () => {
        abortController.abort();
    };
    process.once("SIGTERM", onStopSignal);
    process.once("SIGINT", onStopSignal);

    const markToolCall = (key: string) => {
        if (toolCallIds.has(key)) {
            return;
        }
        toolCallIds.add(key);
        toolCalls += 1;
    };

    try {
        const { Codex } = await import("@openai/codex-sdk");
        const codex = new Codex();
        const threadOptions: Parameters<typeof codex.startThread>[0] = {
            workingDirectory: workspace,
            modelReasoningEffort: "medium",
        };
        if (selectedModel) {
            threadOptions.model = selectedModel;
        }
        const thread = codex.startThread(threadOptions);
        const prompt = buildCodexPrompt(normalized.task, normalized.context);
        const { events } = await thread.runStreamed(prompt, {
            signal: abortController.signal,
        });

        for await (const event of events as AsyncGenerator<Record<string, unknown>>) {
            emit({ type: "log", chunk: JSON.stringify(event) });
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
            if (!item) {
                continue;
            }

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
                    typeof item.command === "string" ? item.command : createRequestId("cmd");
                const commandKey = itemId || fallbackKey;
                if (!commandExecutionIds.has(commandKey)) {
                    commandExecutionIds.add(commandKey);
                    markToolCall(`command:${commandKey}`);
                }
                continue;
            }

            if (itemType === "mcp_tool_call" || itemType === "web_search") {
                markToolCall(itemId || `${itemType}:${createRequestId("tool")}`);
                continue;
            }

            if (itemType === "file_change") {
                const changes = Array.isArray(item.changes) ? item.changes : [];
                for (const change of changes) {
                    if (!change || typeof change !== "object") {
                        continue;
                    }
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

        const duration = Date.now() - startedAt;
        const statistics = buildStatistics(duration);
        const hasFailure = failureMessage.trim().length > 0;

        return {
            success: !hasFailure,
            output: finalResponse || (hasFailure ? "" : "Task completed successfully"),
            error: hasFailure ? failureMessage : undefined,
            duration,
            statistics,
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const missingSdk =
            message.includes("@openai/codex-sdk") &&
            (message.toLowerCase().includes("cannot find") ||
                message.toLowerCase().includes("could not resolve"));
        if (missingSdk) {
            throw error;
        }

        const duration = Date.now() - startedAt;
        const statistics = buildStatistics(duration);
        return {
            success: false,
            output: finalResponse,
            error: failureMessage || message,
            duration,
            statistics,
        };
    } finally {
        process.off("SIGTERM", onStopSignal);
        process.off("SIGINT", onStopSignal);
    }
}

async function main(): Promise<void> {
    const raw = await readStdin();
    const request = JSON.parse(raw) as IncomingRequest;

    try {
        if (isCatalogRequest(request)) {
            emit({
                type: "catalog",
                providers: await getCatalog(),
            });
            return;
        }

        if (!isRuntimeExecuteRequest(request)) {
            throw new Error("Invalid bridge execute request");
        }

        const normalized = {
            task: request.request.task,
            context: request.request.context,
            workspace: request.request.workspace,
            provider: request.request.provider,
            model: request.request.model,
            agent: request.request.agentMode || request.request.agent,
        } satisfies NormalizedExecuteRequest;

        if (!normalized.task.trim()) {
            throw new Error("Task is required");
        }

        const provider = normalizeProvider(normalized.provider);
        const result = await executeWithOpenFarm(normalized, provider);

        emit({
            type: "result",
            success: result.success,
            output: result.output,
            error: result.error,
            duration: result.duration,
            statistics: result.statistics,
        });
    } catch (error) {
        emit({
            type: "error",
            message: error instanceof Error ? error.message : String(error),
        });
        process.exitCode = 1;
    }
}

main().catch((error) => {
    emit({
        type: "error",
        message: error instanceof Error ? error.message : String(error),
    });
    process.exitCode = 1;
});
