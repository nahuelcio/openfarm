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
import { StatisticsCollector } from "./statistics-collector";
import {
  createOpenCodeMetadata,
  OPENCODE_DEFAULT_TIMEOUT,
} from "./provider-definition";

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

export class OpenCodeProvider implements Provider {
  readonly type = "opencode";
  readonly name = "OpenCode";

  private readonly config: { timeout: number };
  private readonly communicationStrategy: CommunicationStrategy;
  private readonly responseParser: StreamResponseParser;
  private readonly configManager: ConfigurationManager;
  private readonly commandLabel: string;

  constructor(
    communicationStrategy: CommunicationStrategy,
    responseParser: StreamResponseParser,
    configManager: ConfigurationManager,
    config: { timeout?: number } = {},
    commandLabel = "opencode"
  ) {
    this.communicationStrategy = communicationStrategy;
    this.responseParser = responseParser;
    this.configManager = configManager;
    this.commandLabel = commandLabel;

    this.config = {
      timeout: OPENCODE_DEFAULT_TIMEOUT,
      ...config,
    };
  }

  getMetadata(): ProviderMetadata {
    return createOpenCodeMetadata();
  }

  async execute(options: ExecutionOptions): Promise<ExecutionResult> {
    const startTime = Date.now();
    const onLog = options.onLog;

    // Initialize statistics collector
    const statsCollector = new StatisticsCollector(options.model || "opencode");
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
        }
      );

    try {
      if (!options.task?.trim()) {
        throw new Error("Task is required and cannot be empty");
      }

      const isAvailable = await this.testConnection();
      if (!isAvailable) {
        const error = `OpenCode CLI not found. Install/check with: ${this.commandLabel} --version`;
        log(`❌ ${error}`);
        return {
          success: false,
          output: error,
          duration: Date.now() - startTime,
          error,
        };
      }

      const args = this.buildCliArgs(options);
      log(`🚀 ${this.commandLabel} ${args.join(" ")}`);

      const streamedLines: string[] = [];
      let lastStreamedLine: string | null = null;
      const sanitizeLine = (line: string): string =>
        line
          // biome-ignore lint/suspicious/noControlCharactersInRegex: ANSI escape stripping
          .replace(/\x1B\[[0-9;]*[A-Za-z]/g, "")
          .replace(/\s+/g, " ")
          .trim();
      const trimForDisplay = (line: string): string =>
        line.length > 180 ? `${line.slice(0, 177)}...` : line;

      const handleStdoutLine = (line: string) => {
        this.trackStructuredStats(line, runtimeStats, statsCollector);
        const normalizedLine = sanitizeLine(line);
        const looksLikeJson =
          normalizedLine.startsWith("{") && normalizedLine.endsWith("}");
        const jsonParsed = this.parseJsonStreamLine(normalizedLine);

        // If it's JSON but not a user-facing event, skip raw output noise.
        if (looksLikeJson && !jsonParsed) {
          return;
        }

        const cleaned = trimForDisplay(
          sanitizeLine(jsonParsed ?? normalizedLine)
        );
        if (!cleaned) {
          return;
        }
        if (cleaned === lastStreamedLine) {
          return;
        }
        lastStreamedLine = cleaned;
        streamedLines.push(cleaned);
        log(`│ ${cleaned}`);
      };

      const handleStderrLine = (line: string) => {
        this.trackStructuredStats(line, runtimeStats, statsCollector);
        const cleaned = trimForDisplay(sanitizeLine(line));
        if (!cleaned) {
          return;
        }
        if (cleaned === lastStreamedLine) {
          return;
        }
        lastStreamedLine = cleaned;
        streamedLines.push(cleaned);
        log(`⚠ ${cleaned}`);
      };

      const request: CommunicationRequest = {
        args,
        workingDirectory: options.workspace || process.cwd(),
        timeout: this.config.timeout,
        body: this.buildPrompt(options),
        onStdout: handleStdoutLine,
        onStderr: handleStderrLine,
      };

      const response = await this.communicationStrategy.execute(request);

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
        const parsed =
          response.body.trim().length > 0
            ? ((await this.responseParser.parse(response)) as unknown)
            : null;
        const parsedOutput =
          typeof parsed === "string"
            ? parsed
            : parsed &&
                typeof parsed === "object" &&
                "textLines" in parsed &&
                Array.isArray(parsed.textLines)
              ? parsed.textLines
                  .map((line) =>
                    line && typeof line === "object" && "raw" in line
                      ? String(line.raw)
                      : ""
                  )
                  .join("\n")
              : "";
        const streamedOutput = streamedLines.join("\n");

        if (parsedOutput.trim()) {
          output = parsedOutput;
        } else if (streamedOutput.trim()) {
          output = streamedOutput;
        } else if (response.body.trim()) {
          output = response.body;
        } else {
          output = "OpenCode command completed successfully";
        }
      } catch (error) {
        const streamedOutput = streamedLines.join("\n");
        if (streamedOutput.trim()) {
          output = streamedOutput;
        } else if (!output.trim()) {
          output = "OpenCode command completed successfully";
        }
        log(
          `Warning: response parser failed, using fallback output: ${error instanceof Error ? error.message : "Unknown error"}`
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
      log(`Error: ${message}`);
      const duration = Date.now() - startTime;
      return {
        success: false,
        output: `OpenCode execution failed: ${message}`,
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
    const args = ["run"];

    const serverUrl = this.readEnv("OPENCODE_SERVER_URL");
    if (serverUrl) {
      args.push("--attach", serverUrl);
    }

    if (options.model) {
      args.push("--model", options.model);
    }

    const format = this.readEnv("OPENCODE_FORMAT");
    args.push("--format", format === "default" ? "default" : "json");

    const agent = this.readEnv("OPENCODE_AGENT");
    if (agent && agent !== "general") {
      args.push("--agent", agent);
    }

    return args;
  }

  private buildPrompt(options: ExecutionOptions): string {
    const workspace = options.workspace;
    const task = options.task.trim();
    const context = options.context?.trim();

    let prompt = context
      ? `${context}

${task}`
      : task;

    prompt = `${prompt}

IMPORTANT: You are running in a headless automation environment.
Do NOT ask clarifying questions.
Do NOT wait for user confirmation.
If information is missing, make a reasonable assumption and continue.`;

    if (workspace) {
      prompt = `IMPORTANT: Work ONLY in this repository: ${workspace}

${prompt}`;
    }

    return prompt;
  }

  private readEnv(name: string): string | undefined {
    const value = process.env[name];
    if (!value) {
      return undefined;
    }

    const normalized = value.trim();
    if (
      normalized.length === 0 ||
      normalized === "undefined" ||
      normalized === "null"
    ) {
      return undefined;
    }

    return normalized;
  }

  private parseJsonStreamLine(line: string): string | null {
    const trimmed = line.trim();
    if (!(trimmed.startsWith("{") && trimmed.endsWith("}"))) {
      return null;
    }

    try {
      const event = JSON.parse(trimmed) as Record<string, unknown>;
      const type = event.type;
      if (
        type !== "text" &&
        type !== "tool_use" &&
        type !== "step_start" &&
        type !== "step_finish" &&
        type !== "error"
      ) {
        return null;
      }

      if (type === "text") {
        const part = event.part as Record<string, unknown> | undefined;
        const text = part?.text;
        return typeof text === "string" ? text : null;
      }

      if (type === "tool_use") {
        const part = event.part as Record<string, unknown> | undefined;
        const tool = part?.tool;
        const state = part?.state as Record<string, unknown> | undefined;
        const status = state?.status;
        const input = state?.input as Record<string, unknown> | undefined;
        const toolName = typeof tool === "string" ? tool : "tool";
        const toolStatus = typeof status === "string" ? status : "completed";
        const filePath =
          typeof input?.filePath === "string" ? input.filePath : "";
        const command = typeof input?.command === "string" ? input.command : "";

        if (filePath) {
          const target = filePath.split("/").at(-1) || filePath;
          return `tool ${toolName}: ${toolStatus} (${target})`;
        }
        if (command) {
          return `tool ${toolName}: ${toolStatus} (${command})`;
        }

        return `tool ${toolName}: ${toolStatus}`;
      }

      if (type === "step_start") {
        return null;
      }

      if (type === "error") {
        const errorMessage = event.error;
        return typeof errorMessage === "string"
          ? `error: ${errorMessage}`
          : "error";
      }

      const part = event.part as Record<string, unknown> | undefined;
      const reason = part?.reason;
      if (reason === "stop") {
        return "done";
      }
      if (
        typeof reason === "string" &&
        reason.length > 0 &&
        reason !== "tool-calls"
      ) {
        return `step finished (${reason})`;
      }

      return null;
    } catch {
      return null;
    }
  }

  private trackStructuredStats(
    line: string,
    runtimeStats: RuntimeStatsAccumulator,
    statsCollector: StatisticsCollector
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
        ...inputCandidates
      );
    }

    const outputCandidates: number[] = [];
    this.collectNumbersByKeys(event, OUTPUT_TOKEN_KEYS, outputCandidates);
    if (outputCandidates.length > 0) {
      runtimeStats.tokensOutput = Math.max(
        runtimeStats.tokensOutput,
        ...outputCandidates
      );
    }

    const creditCandidates: number[] = [];
    this.collectNumbersByKeys(event, CREDIT_KEYS, creditCandidates);
    if (creditCandidates.length > 0) {
      runtimeStats.creditsSpent = Math.max(
        runtimeStats.creditsSpent,
        ...creditCandidates
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
    sink: number[]
  ): void {
    if (value === null || value === undefined) {
      return;
    }
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
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
    sink: string[]
  ): void {
    if (value === null || value === undefined) {
      return;
    }
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
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
