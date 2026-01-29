import { spawn } from "node:child_process";
import { DEFAULT_HOSTS, DEFAULT_PORTS } from "@openfarm/core";
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
      timeout: 600_000,
      ...config,
    };
  }

  async execute(options: ExecutionOptions): Promise<ExecutionResult> {
    const startTime = Date.now();
    const { onLog } = options;
    const verbose = options.verbose || false;

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
      log("✅ OpenCode ready\n");

      return this.config.mode === "local"
        ? await this.executeViaCLI(options, startTime, log)
        : await this.executeViaHTTP(options, startTime, log);
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
    if (this.config.mode === "local") return true;
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
    const verbose = options.verbose || false;
    const args = this.buildCliArgs(options, verbose);

    log(`🚀 Starting: bunx ${args.join(" ")}\n⏳ Executing...\n`);

    const child = spawn("bunx", args, {
      cwd: options.workspace || process.cwd(),
      env: { ...process.env, COLUMNS: "200" },
      stdio: ["pipe", "pipe", "pipe"],
    });

    if (child.stdin) child.stdin.end();

    let outputText = "";
    let totalTokens = 0;
    const modifiedFiles = new Set<string>();
    const createdFiles = new Set<string>();
    let stdoutBuffer = "";

    return new Promise((resolve) => {
      const timeoutId = setTimeout(() => {
        if (!child.killed) {
          child.kill("SIGTERM");
          setTimeout(() => {
            if (!child.killed) child.kill("SIGKILL");
          }, 5000);
        }
        log("\n✗ TIMEOUT: Execution took too long");
        resolve({
          success: false,
          output: "OpenCode execution timed out",
          duration: Date.now() - startTime,
          error: `Timeout after ${this.config.timeout}ms`,
        });
      }, this.config.timeout);

      let lastActivity = Date.now();
      const activityInterval = setInterval(() => {
        const elapsed = Date.now() - lastActivity;
        if (elapsed > 3000 && elapsed < 10_000) {
          log("⏳ Still working...");
          lastActivity = Date.now();
        }
      }, 3000);

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
            if (verbose) log(`[EVENT:${event.type}]`);
            this.handleEvent(
              event,
              verbose,
              log,
              (text) => {
                outputText += text;
              },
              (tokens) => {
                totalTokens = tokens;
              },
              modifiedFiles,
              createdFiles
            );
          } catch {
            log(trimmed.length > 56 ? trimmed.slice(0, 53) + "..." : trimmed);
          }
        }
      });

      child.stderr.on("data", (data: string) => {
        if (verbose) {
          const lines = data.toString().split("\n");
          for (const line of lines) {
            if (line.trim()) log(`[STDERR] ${line}`);
          }
        }
      });

      child.on("close", (code) => {
        clearTimeout(timeoutId);
        clearInterval(activityInterval);
        const duration = Date.now() - startTime;

        if (code !== 0 && code !== null) {
          log(`\n✗ Failed with code ${code}`);
          resolve({
            success: false,
            output: "OpenCode process failed",
            duration,
            error: `Exit code ${code}`,
          });
          return;
        }

        log(`\n✅ Completed in ${duration}ms`);
        resolve({
          success: true,
          output: this.formatSummary(totalTokens, modifiedFiles, createdFiles),
          duration,
          tokens: totalTokens,
        });
      });

      child.on("error", (error) => {
        clearTimeout(timeoutId);
        clearInterval(activityInterval);
        log(`❌ Failed to spawn: ${error.message}`);
        resolve({
          success: false,
          output: `Failed to spawn: ${error.message}`,
          duration: Date.now() - startTime,
          error: error.message,
        });
      });
    });
  }

  private buildCliArgs(options: ExecutionOptions, verbose: boolean): string[] {
    const args = ["opencode-ai", "run", options.task, "--format", "json"];
    if (verbose) args.push("--log-level", "DEBUG", "--print-logs");
    if (options.model) args.push("--model", options.model);
    return args;
  }

  private handleEvent(
    event: any,
    verbose: boolean,
    log: (msg: string) => void,
    addOutput: (text: string) => void,
    setTokens: (tokens: number) => void,
    modifiedFiles: Set<string>,
    createdFiles: Set<string>
  ): void {
    const { type, part } = event;

    switch (type) {
      case "text":
        if (part?.text) {
          addOutput(part.text);
          const lines = part.text.split("\n");
          for (const l of lines) {
            const display = verbose ? l : l.slice(0, 56);
            log(`💬 ${display}${!verbose && l.length > 56 ? "..." : ""}`);
          }
        }
        break;

      case "thinking":
      case "reasoning": {
        const text = part?.text || event.text;
        if (text) {
          const display = verbose ? text : text.slice(0, 56);
          log(`🧠 ${display}${!verbose && text.length > 56 ? "..." : ""}`);
        }
        break;
      }

      case "tool_use":
        this.handleToolUse(part, verbose, log, modifiedFiles, createdFiles);
        break;

      case "step_start":
        log(
          verbose
            ? `▶️  STEP START: ${event.name || "unnamed step"}`
            : "▶️  Starting step..."
        );
        break;

      case "step_finish":
        if (part?.usage) {
          setTokens(part.usage.total_tokens || 0);
          if (verbose) {
            log(
              `📊 STEP FINISH - Tokens: ${part.usage.total_tokens} (input: ${part.usage.input_tokens}, output: ${part.usage.output_tokens})`
            );
          } else {
            log(`📊 Tokens: ${part.usage.total_tokens}`);
          }
        }
        break;

      case "error":
        log(`❌ Error: ${event.message || event.error || "Unknown error"}`);
        break;

      case "system":
        if (event.message) log(`⚙️  ${event.message}`);
        break;

      case "progress":
        if (event.message) log(`⏳ ${event.message}`);
        break;

      default:
        if (event.message) log(`📋 ${event.message}`);
    }
  }

  private handleToolUse(
    part: any,
    verbose: boolean,
    log: (msg: string) => void,
    modifiedFiles: Set<string>,
    createdFiles: Set<string>
  ): void {
    if (!part) return;

    const toolName = part.tool;
    const status = part.state?.status;
    const input = part.state?.input;

    const toolLogs: Record<string, string> = {
      edit: `📝 Editing: ${input?.filePath}`,
      write: `🔨 Writing: ${input?.filePath}`,
      read: `📖 Reading: ${input?.filePath}`,
      bash: `💻 $ ${input?.command || ""}`,
      glob: `🔍 Searching: ${input?.pattern}`,
      grep: `🔎 Grepping: ${input?.pattern}`,
    };

    const completionLogs: Record<string, string> = {
      edit: `✅ Edited: ${input?.filePath}`,
      write: `✅ Created: ${input?.filePath}`,
      read: `✅ Read: ${input?.filePath}`,
      bash: "✅ Command completed",
      glob: "✅ Search completed",
      grep: "✅ Search completed",
    };

    if (status === "pending" || status === "running") {
      if (toolLogs[toolName]) {
        log(toolLogs[toolName]);
      } else if (verbose) {
        log(
          `🔧 TOOL: ${toolName} (${status})\n   Input: ${JSON.stringify(input || {}, null, 2)}`
        );
      } else {
        log(`🔧 Using ${toolName}...`);
      }
    } else if (status === "completed") {
      if (completionLogs[toolName]) {
        log(completionLogs[toolName]);
        if (toolName === "edit" && input?.filePath)
          modifiedFiles.add(input.filePath);
        if (toolName === "write" && input?.filePath)
          createdFiles.add(input.filePath);
      } else if (verbose) {
        log(`✅ TOOL COMPLETED: ${toolName}`);
        if (part.state?.output)
          log(`   Output: ${JSON.stringify(part.state.output, null, 2)}`);
      } else {
        log(`✅ ${toolName} completed`);
      }
    } else if (status === "failed") {
      log(`❌ ${toolName} failed: ${part.state?.error || "Unknown error"}`);
    }
  }

  private formatSummary(
    totalTokens: number,
    modifiedFiles: Set<string>,
    createdFiles: Set<string>
  ): string {
    const summary = [
      "OpenCode execution completed successfully",
      `Tokens used: ${totalTokens}`,
      `Files modified: ${modifiedFiles.size}`,
      `Files created: ${createdFiles.size}`,
    ];

    if (modifiedFiles.size > 0) {
      summary.push("Modified files:");
      for (const file of modifiedFiles) {
        summary.push(`  - ${file}`);
      }
    }

    if (createdFiles.size > 0) {
      summary.push("Created files:");
      for (const file of createdFiles) {
        summary.push(`  - ${file}`);
      }
    }

    return summary.join("\n");
  }

  private getBaseUrl(): string {
    if (this.config.mode === "local") {
      return `http://${DEFAULT_HOSTS.LOCALHOST_NAME}:${DEFAULT_PORTS.OPENCODE}`;
    }
    if (!this.config.baseUrl)
      throw new Error("baseUrl is required for cloud mode");
    return this.config.baseUrl;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (this.config.password) {
      headers.Authorization = `Basic ${Buffer.from(`opencode:${this.config.password}`).toString("base64")}`;
    }
    return headers;
  }

  private async createSession(baseUrl: string, title: string): Promise<string> {
    const response = await fetch(`${baseUrl}/session`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({ title: title.substring(0, 100) }),
    });
    if (!response.ok)
      throw new Error(`Failed to create session: ${response.statusText}`);
    return ((await response.json()) as OpenCodeSession).id;
  }

  private async sendMessage(
    baseUrl: string,
    sessionId: string,
    task: string,
    model?: string
  ): Promise<string> {
    const body: Record<string, unknown> = {
      parts: [{ type: "text", text: task }],
    };
    if (model) body.model = model;

    const response = await fetch(`${baseUrl}/session/${sessionId}/message`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify(body),
    });
    if (!response.ok)
      throw new Error(`Failed to send message: ${response.statusText}`);
    const result = (await response.json()) as { info: { id: string } };
    return result.info.id;
  }

  private async waitForCompletion(
    baseUrl: string,
    sessionId: string,
    messageId: string,
    _log?: (msg: string) => void
  ): Promise<OpenCodeMessage> {
    const maxAttempts = Math.floor(this.config.timeout! / 2000);
    let attempts = 0;

    while (attempts < maxAttempts) {
      const response = await fetch(
        `${baseUrl}/session/${sessionId}/message/${messageId}`,
        { method: "GET", headers: this.getHeaders() }
      );
      if (!response.ok)
        throw new Error(`Failed to check status: ${response.statusText}`);

      const data = (await response.json()) as { info: OpenCodeMessage };
      const message = data.info;

      if (message.status === "completed") return message;
      if (message.status === "failed")
        throw new Error("OpenCode execution failed");

      await new Promise((resolve) => setTimeout(resolve, 2000));
      attempts++;
    }
    throw new Error(`Timeout after ${this.config.timeout}ms`);
  }

  private async getDiff(
    baseUrl: string,
    sessionId: string
  ): Promise<FileDiff[]> {
    const response = await fetch(`${baseUrl}/session/${sessionId}/diff`, {
      method: "GET",
      headers: this.getHeaders(),
    });
    if (!response.ok)
      throw new Error(`Failed to get diff: ${response.statusText}`);
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
      for (const file of diff) {
        summary.push(
          `  - ${file.path} (+${file.additions}/-${file.deletions})`
        );
      }
    }

    return summary.join("\n");
  }
}
