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
 * Aider provider implementation
 */
export class AiderProvider implements Provider {
  readonly type = "aider";
  readonly name = "Aider";

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
      type: "aider",
      name: "Aider",
      version: "1.0.0",
      description:
        "Aider AI pair programming assistant - works directly with your codebase",
      packageName: "@openfarm/provider-aider",
      supportedFeatures: [
        "code-generation",
        "code-editing",
        "refactoring",
        "debugging",
        "git-integration",
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
      // Validate options
      if (!options.task?.trim()) {
        throw new Error("Task is required and cannot be empty");
      }

      if (!options.workspace) {
        throw new Error("Workspace path is required for Aider");
      }

      log("🔍 Checking Aider installation...");
      const isAvailable = await this.testConnection();
      if (!isAvailable) {
        const error = "Aider not found. Install: pip install aider-chat";
        log(`❌ ${error}`);
        return {
          success: false,
          output: error,
          duration: Date.now() - startTime,
          error,
        };
      }
      log("✅ Aider found");
      log("");

      const args = this.buildCliArgs(options);

      log(
        `🚀 Starting: aider ${args.map((a) => (a.includes(" ") ? `"${a}"` : a)).join(" ")}`
      );
      log("");

      const request: CommunicationRequest = {
        args,
        options: {
          workingDirectory: options.workspace || process.cwd(),
          env: process.env as Record<string, string>,
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

      // Parse the response
      const parsed = await this.responseParser.parse(response);
      const formatted = this.parseAiderOutput(
        typeof parsed === "string" ? parsed : response.body
      );

      return {
        success: true,
        output: formatted,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      log(`❌ Error: ${message}`);
      return {
        success: false,
        output: `Aider execution failed: ${message}`,
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
    const args = ["--message", options.task];

    if (options.model) {
      args.push("--model", options.model);
    }

    return args;
  }

  private parseAiderOutput(output: string): string {
    const lines = output.split("\n");
    const summary: string[] = [];
    const fileChanges: string[] = [];
    let hasChanges = false;

    for (const line of lines) {
      const trimmed = line.trim();

      // Track file changes
      if (trimmed.match(/^(Added|Adding|Modified|Editing) /i)) {
        fileChanges.push(trimmed);
        hasChanges = true;
      } else if (trimmed.match(/^\d+ files? (added|modified)/i)) {
        summary.push(trimmed);
      } else if (
        trimmed.includes("git commit") ||
        trimmed.includes("git add")
      ) {
        summary.push(`Git: ${trimmed}`);
      }
    }

    const result = ["Aider execution completed successfully"];

    if (hasChanges) {
      result.push(`Files processed: ${fileChanges.length}`);
      if (fileChanges.length > 0) {
        result.push("Changes made:");
        result.push(...fileChanges.map((change) => `  - ${change}`));
      }
    }

    if (summary.length > 0) {
      result.push("Summary:");
      result.push(...summary.map((item) => `  - ${item}`));
    }

    return result.join("\n");
  }
}
