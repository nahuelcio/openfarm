import { spawn } from "node:child_process";
import type { ExecutionOptions, ExecutionResult, Executor } from "../types";

interface ClaudeCodeConfig {
  timeout?: number;
}

export class ClaudeCodeExecutor implements Executor {
  type = "claude-code" as const;
  private readonly config: ClaudeCodeConfig;

  constructor(config: ClaudeCodeConfig = {}) {
    this.config = {
      timeout: 600_000,
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

      const args = [
        "-p",
        options.task,
        "--allowedTools",
        "Read,Edit,Write,Bash,Glob,Grep,LS,Task,URLFetch",
      ];

      // Verbose mode: show detailed output
      if (options.verbose) {
        args.push("--verbose", "--trace");
      }

      if (options.model) {
        args.push("--model", options.model);
      }

      log(
        `🚀 Running: claude ${args.map((a) => (a.includes(" ") ? `"${a}"` : a)).join(" ")}`
      );
      log("");

      return new Promise((resolve) => {
        const child = spawn("claude", args, {
          cwd: options.workspace || process.cwd(),
          env: { ...process.env, CLAUDE_CODE_DISABLE_PROMPTS: "1" },
          stdio: ["pipe", "pipe", "pipe"],
        });

        if (child.stdin) {
          child.stdin.end();
        }

        let stdoutOutput = "";
        let stderrOutput = "";

        // Timeout handler
        const timeoutId = setTimeout(() => {
          if (!child.killed) {
            child.kill("SIGTERM");
            setTimeout(() => {
              if (!child.killed) child.kill("SIGKILL");
            }, 5000);
          }
          log("");
          log("⏰ TIMEOUT");
          resolve({
            success: false,
            output: "Claude Code execution timed out",
            duration: Date.now() - startTime,
            error: `Timeout after ${this.config.timeout}ms`,
          });
        }, this.config.timeout);

        // Raw output - NO PROCESSING, just pass through
        child.stdout.setEncoding("utf8");
        child.stdout.on("data", (data: string) => {
          stdoutOutput += data;

          // Split by newlines and log EACH line as-is
          const lines = data.split("\n");
          for (const line of lines) {
            // Log the line EXACTLY as received (preserving spacing, markdown, etc)
            // Only skip empty lines at the end
            if (line || lines.indexOf(line) < lines.length - 1) {
              log(line);
            }
          }
        });

        child.stderr.setEncoding("utf8");
        child.stderr.on("data", (data: string) => {
          stderrOutput += data;
          // Log stderr too, as-is
          const lines = data.split("\n");
          for (const line of lines) {
            if (line) log(line);
          }
        });

        child.on("close", (code) => {
          clearTimeout(timeoutId);

          const duration = Date.now() - startTime;

          log("");
          if (code === 0) {
            log(`✅ Done (${duration}ms)`);
            resolve({
              success: true,
              output: stdoutOutput.trim() || "Completed",
              duration,
            });
          } else {
            log(`❌ Failed (${code})`);
            resolve({
              success: false,
              output: stdoutOutput || "Failed",
              duration,
              error: stderrOutput || `Exit code ${code}`,
            });
          }
        });

        child.on("error", (error) => {
          clearTimeout(timeoutId);
          log(`❌ Error: ${error.message}`);
          resolve({
            success: false,
            output: `Failed: ${error.message}`,
            duration: Date.now() - startTime,
            error: error.message,
          });
        });
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log(`❌ Error: ${message}`);
      return {
        success: false,
        output: `Failed: ${message}`,
        duration: Date.now() - startTime,
        error: message,
      };
    }
  }

  async testConnection(): Promise<boolean> {
    return new Promise((resolve) => {
      const child = spawn("claude", ["--version"], {
        stdio: ["ignore", "ignore", "ignore"],
      });

      child.on("error", () => resolve(false));
      child.on("close", (code) => resolve(code === 0));

      setTimeout(() => {
        if (!child.killed) child.kill();
        resolve(false);
      }, 5000);
    });
  }
}
