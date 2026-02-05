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
  createOpenCodeMetadata,
  OPENCODE_DEFAULT_TIMEOUT,
} from "./provider-definition";

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

    const log = (msg: string) => {
      if (onLog) {
        onLog(msg);
      }
    };

    try {
      if (!options.task?.trim()) {
        throw new Error("Task is required and cannot be empty");
      }

      log("Checking OpenCode CLI...");
      const isAvailable = await this.testConnection();
      if (!isAvailable) {
        const error = `OpenCode CLI not found. Install/check with: ${this.commandLabel} --version`;
        log(`Error: ${error}`);
        return {
          success: false,
          output: error,
          duration: Date.now() - startTime,
          error,
        };
      }
      log("OpenCode CLI found");
      log("");

      const args = this.buildCliArgs(options);
      log(`Running: ${this.commandLabel} ${args.join(" ")}`);
      log("");

      const streamedLines: string[] = [];
      const sanitizeLine = (line: string): string =>
        line
          // biome-ignore lint/suspicious/noControlCharactersInRegex: ANSI escape stripping
          .replace(/\x1B\[[0-9;]*[A-Za-z]/g, "")
          .trim();

      const handleStdoutLine = (line: string) => {
        const cleaned = sanitizeLine(line);
        if (!cleaned) {
          return;
        }
        streamedLines.push(cleaned);
        log(`│ ${cleaned}`);
      };

      const handleStderrLine = (line: string) => {
        const cleaned = sanitizeLine(line);
        if (!cleaned) {
          return;
        }
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
        return {
          success: false,
          output: response.body,
          duration: Date.now() - startTime,
          error: response.error || "Execution failed",
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

      return {
        success: true,
        output,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      log(`Error: ${message}`);
      return {
        success: false,
        output: `OpenCode execution failed: ${message}`,
        duration: Date.now() - startTime,
        error: message,
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
    if (format === "json" || format === "default") {
      args.push("--format", format);
    }

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
}
