import { spawn } from "node:child_process";
import type { ExecutionOptions, ExecutionResult, Executor } from "../types";

interface AiderConfig {
  timeout?: number;
}

export class AiderExecutor implements Executor {
  type = "aider" as const;
  private readonly config: AiderConfig;

  constructor(config: AiderConfig = {}) {
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

      // Build args - aider supports --message for non-interactive
      const args = ["--message", options.task];

      if (options.model) {
        args.push("--model", options.model);
      }

      log(
        `🚀 Starting: aider ${args.map((a) => (a.includes(" ") ? `"${a}"` : a)).join(" ")}`
      );
      log("");

      return new Promise((resolve) => {
        const child = spawn("aider", args, {
          cwd: options.workspace || process.cwd(),
          env: process.env,
          stdio: ["pipe", "pipe", "pipe"],
        });

        if (child.stdin) {
          child.stdin.end();
        }

        let stdoutOutput = "";
        let stderrOutput = "";
        let lastActivity = Date.now();

        // Activity checker
        const activityInterval = setInterval(() => {
          const elapsed = Date.now() - lastActivity;
          if (elapsed > 5000 && elapsed < 15_000) {
            log("⏳ Still working...");
            lastActivity = Date.now();
          }
        }, 5000);

        const timeoutId = setTimeout(() => {
          clearInterval(activityInterval);
          if (!child.killed) {
            child.kill("SIGTERM");
            setTimeout(() => {
              if (!child.killed) child.kill("SIGKILL");
            }, 5000);
          }
          log("");
          log("⏰ TIMEOUT: Execution took too long");
          resolve({
            success: false,
            output: "Aider execution timed out",
            duration: Date.now() - startTime,
            error: `Timeout after ${this.config.timeout}ms`,
          });
        }, this.config.timeout);

        // Parse stdout
        let stdoutBuffer = "";
        child.stdout.on("data", (data) => {
          lastActivity = Date.now();
          const chunk = data.toString();
          stdoutBuffer += chunk;

          const lines = stdoutBuffer.split("\n");
          stdoutBuffer = lines.pop() || "";

          for (const line of lines) {
            if (line.trim()) {
              stdoutOutput += line + "\n";
              this.formatAndLog(line, log);
            }
          }
        });

        // Parse stderr
        child.stderr.on("data", (data) => {
          lastActivity = Date.now();
          const text = data.toString();
          stderrOutput += text;

          for (const line of text.split("\n")) {
            if (line.trim()) {
              log(`⚠️  ${line}`);
            }
          }
        });

        child.on("close", (code) => {
          clearTimeout(timeoutId);
          clearInterval(activityInterval);

          if (stdoutBuffer.trim()) {
            stdoutOutput += stdoutBuffer;
            this.formatAndLog(stdoutBuffer, log);
          }

          const duration = Date.now() - startTime;

          log("");
          if (code === 0) {
            log(`✅ Completed in ${duration}ms`);
            resolve({
              success: true,
              output: stdoutOutput.trim() || "Aider completed successfully",
              duration,
            });
          } else {
            log(`❌ Failed with code ${code}`);
            resolve({
              success: false,
              output: stdoutOutput || "Aider execution failed",
              duration,
              error: stderrOutput || `Process exited with code ${code}`,
            });
          }
        });

        child.on("error", (error) => {
          clearTimeout(timeoutId);
          clearInterval(activityInterval);
          log(`❌ Failed to spawn: ${error.message}`);
          resolve({
            success: false,
            output: `Failed to spawn Aider: ${error.message}`,
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
        output: `Aider execution failed: ${message}`,
        duration: Date.now() - startTime,
        error: message,
      };
    }
  }

  private formatAndLog(line: string, log: (msg: string) => void): void {
    const trimmed = line.trim();

    // Aider specific patterns
    if (trimmed.match(/^(Added|Adding) /i)) {
      log(`📁 ${trimmed}`);
    } else if (trimmed.match(/^\d+ files? (added|modified)/i)) {
      log(`📊 ${trimmed}`);
    } else if (trimmed.includes("git commit") || trimmed.includes("git add")) {
      log(`📝 ${trimmed}`);
    } else if (trimmed.match(/^(Applying|Edits|Updating)/i)) {
      log(`🔨 ${trimmed}`);
    } else if (trimmed.match(/^(Done|Completed|Finished):? /i)) {
      log(`✅ ${trimmed}`);
    } else if (trimmed.startsWith(">") || trimmed.startsWith("$")) {
      log(`💻 ${trimmed}`);
    } else if (trimmed.length > 0) {
      if (trimmed.length > 80) {
        log(trimmed.substring(0, 77) + "...");
      } else {
        log(trimmed);
      }
    }
  }

  async testConnection(): Promise<boolean> {
    return new Promise((resolve) => {
      const child = spawn("aider", ["--version"], {
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
