import type {
  CommunicationRequest,
  CommunicationStrategy,
  ConfigurationManager,
  ExecutionOptions,
  ExecutionResult,
  Provider,
  ProviderMetadata,
} from "@openfarm/sdk";
import type { OpenCodeConfig } from "./types.js";

/**
 * OpenCode provider - RESTAURADO a comportamiento original
 * Usa bunx opencode-ai run para modo local
 */
export class OpenCodeProvider implements Provider {
  readonly type = "opencode";
  readonly name = "OpenCode";

  private readonly config: Required<OpenCodeConfig>;
  private readonly communicationStrategy: CommunicationStrategy;
  private readonly configManager: ConfigurationManager;

  constructor(
    communicationStrategy: CommunicationStrategy,
    responseParser: any,
    configManager: ConfigurationManager,
    config: OpenCodeConfig = {}
  ) {
    this.communicationStrategy = communicationStrategy;
    this.responseParser = responseParser;
    this.configManager = configManager;

    this.config = {
      mode: "local",
      baseUrl: "",
      password: "",
      timeout: 120_000,
      ...config,
    };
  }

  getMetadata(): ProviderMetadata {
    return {
      type: "opencode",
      name: "OpenCode",
      version: "1.0.0",
      description: "OpenCode AI coding assistant",
      packageName: "@openfarm/provider-opencode",
      supportedFeatures: [
        "code-generation",
        "code-editing",
        "debugging",
        "refactoring",
      ],
      requiresExternal: true,
    };
  }

  async execute(options: ExecutionOptions): Promise<ExecutionResult> {
    const startTime = Date.now();
    const onLog = options.onLog;
    const verbose = options.verbose;

    const log = (msg: string) => {
      if (onLog) {
        onLog(msg);
      }
    };

    try {
      log("🔍 Checking OpenCode...");
      const isAvailable = await this.testConnection();
      if (!isAvailable) {
        const error = "OpenCode not available";
        log(`❌ ${error}`);
        return {
          success: false,
          output: error,
          duration: Date.now() - startTime,
          error,
        };
      }
      log("✅ OpenCode ready\n");

      const args = this.buildCliArgs(options, verbose);
      log(`🚀 Starting: opencode ${args.join(" ")}\n⏳ Executing...\n`);

      const request: CommunicationRequest = {
        args,
        workingDirectory: options.workspace || process.cwd(),
        env: { ...process.env, COLUMNS: "200" },
        timeout: options.timeout || this.config.timeout,
      };

      const response = await this.communicationStrategy.execute(request);

      // Always parse output to extract error messages
      const result = this.parseOutput(response.body, verbose, log);

      // Determine success based on both CLI response and parsed errors
      const hasErrors = result.hasErrors || !response.success;
      const output = result.output;
      const errorMsg = hasErrors
        ? output || response.error || "Execution failed"
        : undefined;

      return {
        success: !hasErrors,
        output: output || response.body,
        duration: Date.now() - startTime,
        error: errorMsg,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      log(`✗ Error: ${message}`);
      return {
        success: false,
        output: `OpenCode execution failed: ${message}`,
        duration: Date.now() - startTime,
        error: message,
      };
    }
  }

  async testConnection(): Promise<boolean> {
    // Modo local: asumir disponible (como antes)
    if (this.config.mode === "local") {
      return true;
    }
    // Modo cloud: verificar HTTP
    try {
      const response = await this.communicationStrategy.execute({
        endpoint: "/global/health",
        method: "GET",
        timeout: 5000,
      });
      return response.success;
    } catch {
      return false;
    }
  }

  validateConfig(config: unknown): boolean {
    return this.configManager.validate(config);
  }

  private buildCliArgs(options: ExecutionOptions, verbose: boolean): string[] {
    const args = ["run", options.task, "--format", "json"];
    if (verbose) {
      args.push("--log-level", "DEBUG", "--print-logs");
    }
    if (options.model) {
      args.push("--model", options.model);
    }
    return args;
  }

  private parseOutput(
    body: string,
    verbose: boolean,
    log: (msg: string) => void
  ): { output: string; hasErrors: boolean } {
    const lines = body.split("\n").filter((l) => l.trim());
    const outputs: string[] = [];
    const errors: string[] = [];

    for (const line of lines) {
      try {
        const event = JSON.parse(line);
        if (event.type === "text" && event.part?.text) {
          outputs.push(event.part.text);
          const display = verbose
            ? event.part.text
            : event.part.text.slice(0, 56);
          log(
            `💬 ${display}${!verbose && event.part.text.length > 56 ? "..." : ""}`
          );
        } else if (event.type === "error" && event.error) {
          // Handle error events
          const errorMsg =
            event.error.data?.message || event.error.message || "Unknown error";
          const errorBody = event.error.data?.responseBody || "";
          const statusCode = event.error.data?.statusCode;

          // Check if it's an authentication error
          const isAuthError =
            statusCode === 401 ||
            statusCode === 403 ||
            errorBody.includes("unauthorized") ||
            errorBody.includes("not licensed") ||
            errorMsg.includes("reauthenticate");

          if (isAuthError) {
            errors.push(errorMsg);
            log(`❌ Authentication Error: ${errorMsg}`);
            log("");
            log("💡 To authenticate with the provider, run:");
            log("   opencode auth login");
            log("");
            log("   Then try again.");
          } else {
            errors.push(errorMsg);
            log(`❌ Error: ${errorMsg}`);
            if (errorBody && verbose) {
              log(`   Details: ${errorBody}`);
            }
          }
        }
      } catch {
        // No es JSON, ignorar
      }
    }

    // Si hay errores, retornar los errores con instrucciones si es auth
    if (errors.length > 0) {
      const errorOutput = errors.join("\n");

      // Add auth instructions if it's an authentication error
      if (
        errorOutput.includes("reauthenticate") ||
        errorOutput.includes("unauthorized") ||
        errorOutput.includes("not licensed")
      ) {
        return {
          output: `${errorOutput}\n\n💡 To authenticate, run: opencode auth login`,
          hasErrors: true,
        };
      }

      return {
        output: errorOutput,
        hasErrors: true,
      };
    }

    return {
      output: outputs.join("\n"),
      hasErrors: false,
    };
  }
}
