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
    config: { timeout?: number } = {}
  ) {
    this.communicationStrategy = communicationStrategy;
    this.responseParser = responseParser;
    this.configManager = configManager;

    this.config = {
      timeout: 600_000,
      ...config,
    };
  }

  getMetadata(): ProviderMetadata {
    return {
      type: "claude",
      name: "Claude Code",
      version: "1.0.0",
      description:
        "Claude Code AI assistant with advanced code understanding and editing capabilities",
      packageName: "@openfarm/provider-claude",
      supportedFeatures: [
        "code-generation",
        "code-editing",
        "refactoring",
        "debugging",
        "code-analysis",
        "file-operations",
        "bash-execution",
        "web-search",
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
      // Validate options
      if (!options.task?.trim()) {
        throw new Error("Task is required and cannot be empty");
      }

      log("🔍 Checking Claude Code...");
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
      log("✅ Claude Code found");
      log("");

      const args = this.buildCliArgs(options);

      log(
        `🚀 Running: claude ${args.map((a) => (a.includes(" ") ? `"${a}"` : a)).join(" ")}`
      );
      log("");

      const request: CommunicationRequest = {
        args,
        options: {
          workingDirectory: options.workspace || process.cwd(),
          env: {
            ...process.env,
            CLAUDE_CODE_DISABLE_PROMPTS: "1",
          },
          timeout: this.config.timeout,
        },
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

      // Parse the response (though Claude outputs raw text we want to preserve)
      const parsed = await this.responseParser.parse(response);

      return {
        success: true,
        output: typeof parsed === "string" ? parsed : response.body,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      log(`❌ Error: ${message}`);
      return {
        success: false,
        output: `Claude execution failed: ${message}`,
        duration: Date.now() - startTime,
        error: message,
      };
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const request: CommunicationRequest = {
        args: ["--version"],
        options: {
          timeout: 5000,
        },
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
}
