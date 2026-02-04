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
      timeout: 600_000,
      ...config,
    };
  }

  getMetadata(): ProviderMetadata {
    return {
      type: "opencode",
      name: "OpenCode",
      version: "1.0.0",
      description: "OpenCode CLI agent via OpenCode server",
      packageName: "@openfarm/provider-opencode",
      supportedFeatures: [
        "code-generation",
        "code-editing",
        "refactoring",
        "debugging",
        "file-operations",
        "streaming",
      ],
      configSchema: {
        type: "object",
        properties: {
          timeout: {
            type: "number",
            default: 600_000,
            minimum: 1000,
            description: "Timeout in milliseconds",
          },
        },
        required: [],
        additionalProperties: false,
      },
      requiresExternal: true,
    };
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
        const error =
          "OpenCode CLI not found. Install with: bunx opencode-ai --version";
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

      const request: CommunicationRequest = {
        args,
        workingDirectory: options.workspace || process.cwd(),
        timeout: this.config.timeout,
        body: this.buildPrompt(options),
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

      const parsed = await this.responseParser.parse(response);
      const output = typeof parsed === "string" ? parsed : response.body;

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
    const serverUrl = this.getServerUrl();
    const args = ["run", "--attach", serverUrl];

    if (options.model) {
      args.push("--model", options.model);
    }

    const format = process.env.OPENCODE_FORMAT;
    if (format === "json" || format === "default") {
      args.push("--format", format);
    }

    const agent = process.env.OPENCODE_AGENT;
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

  private getServerUrl(): string {
    if (process.env.OPENCODE_SERVER_URL) {
      return process.env.OPENCODE_SERVER_URL;
    }
    const host = process.env.OPENCODE_HOST || "127.0.0.1";
    const port = process.env.OPENCODE_PORT || "4096";
    return `http://${host}:${port}`;
  }
}
