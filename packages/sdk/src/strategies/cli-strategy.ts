/**
 * CLI Communication Strategy for command-line providers.
 *
 * Provides CLI communication with process management, output handling,
 * timeout support, and environment variable management for CLI-based providers.
 */

import { type ChildProcess, spawn } from "node:child_process";
import type {
  CommunicationRequest,
  CommunicationResponse,
  CommunicationStrategy,
} from "../provider-system/types";
import type { CliExecutionOptions } from "./types";

/**
 * CLI process configuration.
 */
export interface CliConfig extends CliExecutionOptions {
  /** Process timeout in milliseconds */
  timeout?: number;

  /** Maximum buffer size for stdout/stderr */
  maxBufferSize?: number;

  /** Encoding for input/output */
  encoding?: BufferEncoding;

  /** Kill signal to use for timeout */
  killSignal?: NodeJS.Signals;

  /** Enable process logging */
  enableLogging?: boolean;

  /** Environment variable inheritance */
  inheritEnv?: boolean;
}

/**
 * CLI Communication Strategy implementation.
 *
 * Handles command-line process execution with timeout support,
 * environment variable management, working directory support,
 * and comprehensive error handling.
 */
export class CliCommunicationStrategy implements CommunicationStrategy {
  readonly type = "cli";

  private readonly config: Required<CliConfig>;

  constructor(config: CliConfig) {
    // Merge with defaults
    this.config = {
      executable: config.executable,
      defaultArgs: config.defaultArgs || [],
      defaultWorkingDirectory: config.defaultWorkingDirectory || process.cwd(),
      defaultEnv: config.defaultEnv || {},
      timeout: config.timeout || 300_000, // 5 minutes default
      captureStderr: config.captureStderr ?? true,
      shell: config.shell ?? false,
      maxBufferSize: config.maxBufferSize || 10 * 1024 * 1024, // 10MB
      encoding: config.encoding || "utf8",
      killSignal: config.killSignal || "SIGTERM",
      enableLogging: config.enableLogging ?? false,
      inheritEnv: config.inheritEnv ?? true,
    };
  }

  /**
   * Execute a CLI command with timeout and error handling.
   */
  async execute(request: CommunicationRequest): Promise<CommunicationResponse> {
    const startTime = Date.now();

    try {
      this.logRequest(request);

      const response = await this.executeProcess(request);

      this.logResponse(response, Date.now() - startTime);

      return {
        ...response,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      const errorResponse = this.handleError(error, Date.now() - startTime);
      this.logResponse(errorResponse, Date.now() - startTime);
      return errorResponse;
    }
  }

  /**
   * Test CLI connection by running a simple command.
   */
  async testConnection(): Promise<boolean> {
    try {
      // Try to run the executable with --version or --help
      const testRequest: CommunicationRequest = {
        args: ["--version"],
        timeout: 5000, // Short timeout for connection test
      };

      const response = await this.executeProcess(testRequest);

      // Consider it successful if the process runs (even if it exits with non-zero)
      // Some tools don't support --version but still indicate they're available
      return response.status !== 127; // 127 = command not found
    } catch (error) {
      this.log(`Connection test failed: ${error}`);
      return false;
    }
  }

  /**
   * Execute a single CLI process.
   */
  private async executeProcess(
    request: CommunicationRequest
  ): Promise<CommunicationResponse> {
    return new Promise((resolve, reject) => {
      const args = [...this.config.defaultArgs, ...(request.args || [])];
      const workingDirectory =
        request.workingDirectory || this.config.defaultWorkingDirectory;
      const timeout = request.timeout || this.config.timeout;

      // Build environment variables
      const env = this.buildEnvironment(request.env);

      // Spawn options
      const spawnOptions: import('child_process').SpawnOptions = {
        cwd: workingDirectory,
        env,
        shell: this.config.shell,
        stdio: ["pipe", "pipe", "pipe"],
      };

      this.log(`Executing: ${this.config.executable} ${args.join(" ")}`);
      this.log(`Working directory: ${workingDirectory}`);

      let child: ChildProcess;
      let stdout = "";
      let stderr = "";
      let isTimedOut = false;
      let timeoutId: NodeJS.Timeout | null = null;

      try {
        child = spawn(this.config.executable, args, spawnOptions);
      } catch (error) {
        reject(new Error(`Failed to spawn process: ${error}`));
        return;
      }

      // Set up timeout
      if (timeout > 0) {
        timeoutId = setTimeout(() => {
          isTimedOut = true;
          this.log(
            `Process timed out after ${timeout}ms, killing with ${this.config.killSignal}`
          );

          if (child && !child.killed) {
            child.kill(this.config.killSignal);
          }
        }, timeout);
      }

      // Handle stdout
      if (child.stdout) {
        child.stdout.setEncoding(this.config.encoding);
        child.stdout.on("data", (data: string) => {
          stdout += data;

          // Check buffer size limit
          if (stdout.length > this.config.maxBufferSize) {
            this.log(
              `Stdout buffer exceeded ${this.config.maxBufferSize} bytes, truncating`
            );
            stdout =
              stdout.substring(0, this.config.maxBufferSize) +
              "\n[OUTPUT TRUNCATED]";
            child.kill(this.config.killSignal);
          }
        });
      }

      // Handle stderr
      if (child.stderr && this.config.captureStderr) {
        child.stderr.setEncoding(this.config.encoding);
        child.stderr.on("data", (data: string) => {
          stderr += data;

          // Check buffer size limit
          if (stderr.length > this.config.maxBufferSize) {
            this.log(
              `Stderr buffer exceeded ${this.config.maxBufferSize} bytes, truncating`
            );
            stderr =
              stderr.substring(0, this.config.maxBufferSize) +
              "\n[ERROR OUTPUT TRUNCATED]";
            child.kill(this.config.killSignal);
          }
        });
      }

      // Handle process exit
      child.on("close", (code, signal) => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }

        const exitCode =
          code ?? (signal ? 128 + this.getSignalNumber(signal) : 1);

        let errorMessage = "";
        if (stderr) {
          // Prioritize stderr content over other error messages
          errorMessage = stderr.trim();
        } else if (isTimedOut) {
          errorMessage = `Process timed out after ${timeout}ms`;
        } else if (signal) {
          errorMessage = `Process killed by signal ${signal}`;
        }

        const response: CommunicationResponse = {
          status: exitCode,
          body: stdout,
          error: errorMessage || undefined,
          success: exitCode === 0 && !isTimedOut,
          metadata: {
            signal,
            timedOut: isTimedOut,
            workingDirectory,
            command: this.config.executable,
            args,
          },
        };

        resolve(response);
      });

      // Handle process errors
      child.on("error", (error) => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }

        reject(new Error(`Process error: ${error.message}`));
      });

      // Handle stdin if needed (for interactive commands)
      if (child.stdin) {
        try {
          if (request.body) {
            const input =
              typeof request.body === "string"
                ? request.body
                : JSON.stringify(request.body);

            child.stdin.write(input, this.config.encoding);
          }
          // Always close stdin to signal EOF
          child.stdin.end();
        } catch (error) {
          this.log(`Failed to write to stdin: ${error}`);
        }
      }
    });
  }

  /**
   * Build environment variables for process execution.
   */
  private buildEnvironment(
    requestEnv: Record<string, string> = {}
  ): Record<string, string> {
    const env: Record<string, string> = {};

    // Inherit parent environment if configured
    if (this.config.inheritEnv) {
      Object.assign(env, process.env);
    }

    // Add default environment variables
    Object.assign(env, this.config.defaultEnv);

    // Add request-specific environment variables
    Object.assign(env, requestEnv);

    // Ensure all values are strings
    const cleanEnv: Record<string, string> = {};
    for (const [key, value] of Object.entries(env)) {
      if (value !== undefined && value !== null) {
        cleanEnv[key] = String(value);
      }
    }

    return cleanEnv;
  }

  /**
   * Get numeric signal number for exit code calculation.
   */
  private getSignalNumber(signal: NodeJS.Signals): number {
    const signalMap: Record<string, number> = {
      SIGHUP: 1,
      SIGINT: 2,
      SIGQUIT: 3,
      SIGILL: 4,
      SIGTRAP: 5,
      SIGABRT: 6,
      SIGBUS: 7,
      SIGFPE: 8,
      SIGKILL: 9,
      SIGUSR1: 10,
      SIGSEGV: 11,
      SIGUSR2: 12,
      SIGPIPE: 13,
      SIGALRM: 14,
      SIGTERM: 15,
    };

    return signalMap[signal] || 1;
  }

  /**
   * Handle errors and convert to CommunicationResponse.
   */
  private handleError(error: unknown, duration: number): CommunicationResponse {
    let status = 1;
    let message = "Unknown error";
    let errorDetails = "";

    if (error instanceof Error) {
      message = error.message;
      errorDetails = error.stack || "";

      // Map specific error types to status codes
      if (message.includes("ENOENT") || message.includes("command not found")) {
        status = 127; // Command not found
        message = `Command not found: ${this.config.executable}`;
      } else if (message.includes("EACCES")) {
        status = 126; // Permission denied
        message = `Permission denied: ${this.config.executable}`;
      } else if (message.includes("timeout")) {
        status = 124; // Timeout
      }
    } else {
      message = String(error);
    }

    return {
      status,
      body: "",
      error: message,
      success: false,
      duration,
      metadata: {
        errorDetails,
        errorType: error instanceof Error ? error.constructor.name : "Unknown",
        executable: this.config.executable,
      },
    };
  }

  /**
   * Log request details if logging is enabled.
   */
  private logRequest(request: CommunicationRequest): void {
    if (!this.config.enableLogging) {
      return;
    }

    const args = [...this.config.defaultArgs, ...(request.args || [])];
    this.log(`→ ${this.config.executable} ${args.join(" ")}`);

    if (request.workingDirectory) {
      this.log(`  Working directory: ${request.workingDirectory}`);
    }

    if (request.env && Object.keys(request.env).length > 0) {
      this.log(`  Environment: ${JSON.stringify(request.env)}`);
    }

    if (request.body) {
      const bodyStr =
        typeof request.body === "string"
          ? request.body
          : JSON.stringify(request.body);
      const truncated =
        bodyStr.length > 200 ? `${bodyStr.substring(0, 200)}...` : bodyStr;
      this.log(`  Input: ${truncated}`);
    }
  }

  /**
   * Log response details if logging is enabled.
   */
  private logResponse(response: CommunicationResponse, duration: number): void {
    if (!this.config.enableLogging) {
      return;
    }

    const status = response.success ? "✓" : "✗";
    this.log(`← ${status} ${response.status} (${duration}ms)`);

    if (response.error) {
      this.log(`  Error: ${response.error}`);
    }

    if (response.body) {
      const truncated =
        response.body.length > 200
          ? `${response.body.substring(0, 200)}...`
          : response.body;
      this.log(`  Output: ${truncated}`);
    }

    if (response.metadata?.signal) {
      this.log(`  Signal: ${response.metadata.signal}`);
    }
  }

  /**
   * Log messages with strategy prefix.
   */
  private log(message: string): void {
    console.log(`[CliStrategy] ${message}`);
  }
}
