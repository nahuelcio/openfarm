import { DEFAULT_HOSTS, DEFAULT_PORTS } from "@openfarm/core";
import { spawn } from "node:child_process";
import type { ExecutionOptions, ExecutionResult, Executor } from "../types";

interface OpenCodeConfig {
  mode?: "local" | "cloud";
  baseUrl?: string;
  password?: string;
  timeout?: number;
}

interface OpenCodeSession {
  id: string;
  title: string;
  created_at: string;
}

interface OpenCodeMessage {
  id: string;
  status: "pending" | "running" | "completed" | "failed";
  created_at: string;
  usage?: {
    total_tokens: number;
    input_tokens: number;
    output_tokens: number;
  };
}

interface FileDiff {
  path: string;
  diff: string;
  additions: number;
  deletions: number;
}

export class OpenCodeExecutor implements Executor {
  type = "opencode" as const;
  private readonly config: OpenCodeConfig;

  constructor(config: OpenCodeConfig = {}) {
    this.config = {
      mode: "local",
      timeout: 600_000, // 10 minutes default
      ...config,
    };
  }

  async execute(options: ExecutionOptions): Promise<ExecutionResult> {
    const startTime = Date.now();
    const { onLog } = options;

    const log = (msg: string) => {
      if (onLog) onLog(msg);
    };

    try {
      log("🔍 Checking OpenCode...");
      const isAvailable = await this.testConnection();
      if (!isAvailable) {
        const error = "OpenCode server not available";
        log(`❌ ${error}`);
        return {
          success: false,
          output: error,
          duration: Date.now() - startTime,
          error,
        };
      }
      log("✅ OpenCode ready");
      log("");

      if (this.config.mode === "local") {
        return await this.executeViaCLI(options, startTime, log);
      } else {
        return await this.executeViaHTTP(options, startTime, log);
      }
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
    if (this.config.mode === "local") {
      return true;
    }
    try {
      const baseUrl = this.getBaseUrl();
      const response = await fetch(`${baseUrl}/global/health`, {
        method: "GET",
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  private async executeViaHTTP(
    options: ExecutionOptions,
    startTime: number,
    log: (msg: string) => void
  ): Promise<ExecutionResult> {
    const baseUrl = this.getBaseUrl();

    log("Creating session...");
    const sessionId = await this.createSession(baseUrl, options.task);
    log(`✓ Session created: ${sessionId.slice(0, 8)}...`);

    log("Sending message...");
    const messageId = await this.sendMessage(
      baseUrl,
      sessionId,
      options.task,
      options.model
    );
    log(`✓ Message sent: ${messageId.slice(0, 8)}...`);

    log("Waiting for completion...");
    const result = await this.waitForCompletion(
      baseUrl,
      sessionId,
      messageId,
      log
    );

    const diff = await this.getDiff(baseUrl, sessionId);

    return {
      success: true,
      output: this.formatOutput(result, diff),
      duration: Date.now() - startTime,
      tokens: result.usage?.total_tokens || 0,
    };
  }

  private async executeViaCLI(
    options: ExecutionOptions,
    startTime: number,
    log: (msg: string) => void
  ): Promise<ExecutionResult> {
    // Build CLI arguments
    const args = ["opencode-ai", "run", options.task, "--format", "json"];

    if (options.model) {
      args.push("--model", options.model);
    }

    log(`🚀 Starting: bunx ${args.map(a => a.includes(" ") ? `"${a}"` : a).join(" ")}`);
    log("");
    log("⏳ Executing...");
    log("");

    // Spawn the CLI process
    const child = spawn("bunx", args, {
      cwd: process.cwd(),
      env: { ...process.env, COLUMNS: "200" },
      stdio: ["pipe", "pipe", "pipe"],
    });

    // Close stdin immediately
    if (child.stdin) {
      child.stdin.end();
    }

    let outputText = "";
    let totalTokens = 0;
    const modifiedFiles = new Set<string>();
    const createdFiles = new Set<string>();
    let stdoutBuffer = "";

    return new Promise((resolve) => {
      // Set timeout
      const timeoutId = setTimeout(() => {
        if (!child.killed) {
          child.kill("SIGTERM");
          setTimeout(() => {
            if (!child.killed) {
              child.kill("SIGKILL");
            }
          }, 5000);
        }
        log("");
        log("✗ TIMEOUT: Execution took too long");
        resolve({
          success: false,
          output: "OpenCode execution timed out",
          duration: Date.now() - startTime,
          error: `Timeout after ${this.config.timeout}ms`,
        });
      }, this.config.timeout);

      // Activity checker
      let lastActivity = Date.now();
      const activityInterval = setInterval(() => {
        const elapsed = Date.now() - lastActivity;
        if (elapsed > 3000 && elapsed < 10000) {
          log("⏳ Still working...");
          lastActivity = Date.now();
        }
      }, 3000);

      // Parse stdout for JSON events
      child.stdout.on("data", (data) => {
        lastActivity = Date.now();
        const chunk = data.toString();
        stdoutBuffer += chunk;

        const lines = stdoutBuffer.split("\n");
        stdoutBuffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          try {
            const event = JSON.parse(trimmed);
            
            // Log ALL event types for debugging (comment out in production)
            // log(`[EVENT:${event.type}]`);

            // Handle different event types
            switch (event.type) {
              case "text":
                if (event.part?.text) {
                  const text = event.part.text;
                  outputText += text;
                  // Log text chunks (truncated)
                  if (text.trim()) {
                    const lines = text.split("\n").filter((l: string) => l.trim());
                    for (const l of lines) {
                      if (l.length > 56) {
                        log(`💬 ${l.slice(0, 53)}...`);
                      } else {
                        log(`💬 ${l}`);
                      }
                    }
                  }
                }
                break;

              case "thinking":
              case "reasoning":
                if (event.part?.text || event.text) {
                  const text = event.part?.text || event.text;
                  log(`🧠 ${text.slice(0, 56)}${text.length > 56 ? "..." : ""}`);
                }
                break;

              case "tool_use":
                if (event.part) {
                  const part = event.part;
                  const toolName = part.tool;
                  const status = part.state?.status;

                  if (status === "pending" || status === "running") {
                    if (toolName === "edit" && part.state?.input?.filePath) {
                      log(`📝 Editing: ${part.state.input.filePath}`);
                    } else if (toolName === "write" && part.state?.input?.filePath) {
                      log(`🔨 Writing: ${part.state.input.filePath}`);
                    } else if (toolName === "read" && part.state?.input?.filePath) {
                      log(`📖 Reading: ${part.state.input.filePath}`);
                    } else if (toolName === "bash" && part.state?.input?.command) {
                      log(`💻 $ ${part.state.input.command.slice(0, 50)}${part.state.input.command.length > 50 ? "..." : ""}`);
                    } else if (toolName === "glob" && part.state?.input?.pattern) {
                      log(`🔍 Searching: ${part.state.input.pattern}`);
                    } else if (toolName === "grep" && part.state?.input?.pattern) {
                      log(`🔎 Grepping: ${part.state.input.pattern}`);
                    } else {
                      log(`🔧 Using ${toolName}...`);
                    }
                  } else if (status === "completed") {
                    if (toolName === "edit" && part.state?.input?.filePath) {
                      modifiedFiles.add(part.state.input.filePath);
                      log(`✅ Edited: ${part.state.input.filePath}`);
                    } else if (toolName === "write" && part.state?.input?.filePath) {
                      createdFiles.add(part.state.input.filePath);
                      log(`✅ Created: ${part.state.input.filePath}`);
                    } else if (toolName === "read" && part.state?.input?.filePath) {
                      log(`✅ Read: ${part.state.input.filePath}`);
                    } else if (toolName === "bash") {
                      log(`✅ Command completed`);
                    } else if (toolName === "glob" || toolName === "grep") {
                      log(`✅ Search completed`);
                    } else {
                      log(`✅ ${toolName} completed`);
                    }
                  } else if (status === "failed") {
                    log(`❌ ${toolName} failed: ${part.state?.error || "Unknown error"}`);
                  }
                }
                break;

              case "step_start":
                log(`▶️  Starting step...`);
                break;

              case "step_finish":
                if (event.part?.usage) {
                  totalTokens += event.part.usage.total_tokens || 0;
                  log(`📊 Tokens: ${event.part.usage.total_tokens} (total: ${totalTokens})`);
                }
                break;

              case "error":
                log(`❌ Error: ${event.message || event.error || "Unknown error"}`);
                break;

              case "system":
                if (event.message) {
                  log(`⚙️  ${event.message}`);
                }
                break;

              case "progress":
                if (event.message) {
                  log(`⏳ ${event.message}`);
                }
                break;

              default:
                // Unknown event type - log it for debugging
                if (event.message) {
                  log(`📋 ${event.message}`);
                }
                break;
            }
          } catch {
            // Not JSON, might be a log line
            if (trimmed.length > 56) {
              log(trimmed.slice(0, 53) + "...");
            } else {
              log(trimmed);
            }
          }
        }
      });

      // Capture stderr
      let stderrOutput = "";
      child.stderr.on("data", (data) => {
        stderrOutput += data.toString();
      });

      // Handle process completion
      child.on("close", (code) => {
        clearTimeout(timeoutId);
        clearInterval(activityInterval);

        const duration = Date.now() - startTime;

        if (code !== 0 && code !== null) {
          log("");
          log(`✗ Failed with code ${code}`);
          resolve({
            success: false,
            output: stderrOutput || "OpenCode process failed",
            duration,
            error: `Process exited with code ${code}`,
          });
          return;
        }

        // Format output
        log("");
        log(`✅ Completed in ${duration}ms`);

        const summary = [
          "OpenCode execution completed successfully",
          `Tokens used: ${totalTokens}`,
          `Files modified: ${modifiedFiles.size}`,
          `Files created: ${createdFiles.size}`,
        ];

        if (modifiedFiles.size > 0) {
          summary.push("Modified files:");
          modifiedFiles.forEach((file) => {
            summary.push(`  - ${file}`);
          });
        }

        if (createdFiles.size > 0) {
          summary.push("Created files:");
          createdFiles.forEach((file) => {
            summary.push(`  - ${file}`);
          });
        }

        resolve({
          success: true,
          output: summary.join("\n"),
          duration,
          tokens: totalTokens,
        });
      });

      // Handle spawn errors
      child.on("error", (error) => {
        clearTimeout(timeoutId);
        clearInterval(activityInterval);
        log(`❌ Failed to spawn: ${error.message}`);
        resolve({
          success: false,
          output: `Failed to spawn OpenCode CLI: ${error.message}`,
          duration: Date.now() - startTime,
          error: error.message,
        });
      });
    });
  }

  private getBaseUrl(): string {
    if (this.config.mode === "local") {
      return `http://${DEFAULT_HOSTS.LOCALHOST_NAME}:${DEFAULT_PORTS.OPENCODE}`;
    }

    if (!this.config.baseUrl) {
      throw new Error("baseUrl is required for cloud mode");
    }

    return this.config.baseUrl;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (this.config.password) {
      const auth = Buffer.from(`opencode:${this.config.password}`).toString(
        "base64"
      );
      headers.Authorization = `Basic ${auth}`;
    }

    return headers;
  }

  private async createSession(baseUrl: string, title: string): Promise<string> {
    const response = await fetch(`${baseUrl}/session`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({
        title: title.substring(0, 100),
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create session: ${response.statusText}`);
    }

    const session = (await response.json()) as OpenCodeSession;
    return session.id;
  }

  private async sendMessage(
    baseUrl: string,
    sessionId: string,
    task: string,
    model?: string
  ): Promise<string> {
    const requestBody: Record<string, unknown> = {
      parts: [
        {
          type: "text",
          text: task,
        },
      ],
    };

    if (model) {
      requestBody.model = model;
    }

    const response = await fetch(`${baseUrl}/session/${sessionId}/message`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`Failed to send message: ${response.statusText}`);
    }

    const result = (await response.json()) as any;
    return result.info.id;
  }

  private async waitForCompletion(
    baseUrl: string,
    sessionId: string,
    messageId: string,
    log?: (msg: string) => void
  ): Promise<OpenCodeMessage> {
    const maxAttempts = Math.floor(this.config.timeout! / 2000);
    let attempts = 0;

    while (attempts < maxAttempts) {
      const response = await fetch(
        `${baseUrl}/session/${sessionId}/message/${messageId}`,
        {
          method: "GET",
          headers: this.getHeaders(),
        }
      );

      if (!response.ok) {
        throw new Error(
          `Failed to check message status: ${response.statusText}`
        );
      }

      const data = (await response.json()) as any;
      const message: OpenCodeMessage = data.info;

      if (message.status === "completed") {
        return message;
      }

      if (message.status === "failed") {
        throw new Error("OpenCode execution failed");
      }

      await new Promise((resolve) => setTimeout(resolve, 2000));
      attempts++;
    }

    throw new Error(
      `OpenCode execution timeout after ${this.config.timeout}ms`
    );
  }

  private async getDiff(
    baseUrl: string,
    sessionId: string
  ): Promise<FileDiff[]> {
    const response = await fetch(`${baseUrl}/session/${sessionId}/diff`, {
      method: "GET",
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to get diff: ${response.statusText}`);
    }

    return (await response.json()) as FileDiff[];
  }

  private formatOutput(result: OpenCodeMessage, diff: FileDiff[]): string {
    const summary = [
      "OpenCode execution completed successfully",
      `Tokens used: ${result.usage?.total_tokens || 0}`,
      `Files modified: ${diff.length}`,
    ];

    if (diff.length > 0) {
      summary.push("Modified files:");
      diff.forEach((file) => {
        summary.push(
          `  - ${file.path} (+${file.additions}/-${file.deletions})`
        );
      });
    }

    return summary.join("\n");
  }
}
