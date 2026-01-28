import { spawn } from "node:child_process";
import { OpencodeEventType } from "@openfarm/core/constants/enums";
import type { ChangesSummary } from "@openfarm/core/types/adapters";
import { logger } from "@openfarm/logger";
import { err, ok, type Result } from "@openfarm/result";
import { metrics } from "../../utils/metrics";
import { validateInstruction } from "../../utils/validation";
import type { CancellationToken, OpencodeProcessConfig } from "./types";

/**
 * Creates a log queue to handle async logging from sync event handlers.
 * Ensures logs are processed in order and awaited properly.
 */
function createLogQueue(
  onLog: ((message: string) => void | Promise<void>) | undefined
) {
  const queue: string[] = [];
  let processing = false;

  const processQueue = async () => {
    if (processing) {
      return;
    }
    processing = true;

    while (queue.length > 0) {
      const message = queue.shift();
      if (message) {
        if (onLog) {
          await onLog(message);
        }
        logger.info({ message }, "[Opencode] {message}");
      }
    }

    processing = false;
  };

  return {
    log: (message: string) => {
      queue.push(message);
      processQueue().catch(console.error);
    },
    flush: async () => {
      await processQueue();
    },
  };
}

/**
 * Executes the Opencode process headlessly and parses its JSON output.
 */
export async function executeOpencodeProcess(
  config: OpencodeProcessConfig,
  instruction: string,
  repoPath: string,
  contextFiles: string[] = [],
  cancellationToken?: CancellationToken
): Promise<Result<ChangesSummary>> {
  const startTime = Date.now();
  metrics.increment("opencode.requests.total", {
    model: config.model,
    preview: config.previewMode ? "true" : "false",
  });

  const validation = validateInstruction(instruction);
  if (!validation.ok) {
    metrics.increment("opencode.requests.failed", {
      reason: "validation_error",
    });
    return err(validation.error);
  }

  const logQueue = createLogQueue(config.onLog);
  const log = logQueue.log;

  const logAsync = async (message: string) => {
    if (config.onLog) {
      await config.onLog(message);
    }
    logger.info({ message }, "[Opencode] {message}");
  };

  const fileArgs = contextFiles.flatMap((file) => ["-f", file]);

  // Build --attach flag to connect to the opencode server (has all providers configured)
  const opencodeHost = process.env.OPENCODE_HOST || "127.0.0.1";
  const opencodePort = process.env.OPENCODE_PORT || "4096";
  const opencodeServerUrl = `http://${opencodeHost}:${opencodePort}`;

  // Prepend working directory context to instruction so opencode knows where to work
  const instructionWithContext = `IMPORTANT: Work ONLY in this repository: ${repoPath}\n\n${instruction}`;

  await logAsync(`[OpenCode] Executing in: ${repoPath}`);
  await logAsync(`[OpenCode] Connecting to server: ${opencodeServerUrl}`);
  await logAsync(`[OpenCode] Model: ${config.model}`);
  await logAsync(
    `[OpenCode] Full command: bunx opencode-ai run --attach ${opencodeServerUrl} --model ${config.model}`
  );

  const args = [
    "opencode-ai",
    "run",
    instructionWithContext,
    "--format",
    "json",
    "--attach",
    opencodeServerUrl,
    ...fileArgs,
    "--model",
    config.model,
  ];

  if (config.chatOnly) {
    // Note: Investigation didn't show an explicit chat-only flag for 'run',
    // but we can pass it if we find one later. For now, we assume 'run' is sufficient.
  }

  const child = spawn("bunx", args, {
    cwd: repoPath,
    env: { ...process.env, COLUMNS: "200" },
    stdio: ["pipe", "pipe", "pipe"], // Ensure stdin is a pipe
  });

  // Close stdin immediately to prevent the process from waiting for input
  if (child.stdin) {
    child.stdin.end();
  }

  let assistantMessage = "";
  const modifiedFiles = new Set<string>();
  const createdFiles = new Set<string>();
  const deletedFiles = new Set<string>();
  let accumulatedDiff = "";
  let processFinished = false;

  return new Promise((resolve) => {
    // Set a timeout to prevent the process from hanging indefinitely
    const TIMEOUT_MS = config.timeoutMs ?? 30 * 60 * 1000; // 30 minutes default
    const timeoutId = setTimeout(() => {
      if (!processFinished) {
        processFinished = true;
        logger.warn("Opencode process timed out after 30 minutes");
        if (child && !child.killed) {
          child.kill("SIGTERM");
          // Force kill after 5 seconds if still running
          setTimeout(() => {
            if (child && !child.killed) {
              child.kill("SIGKILL");
            }
          }, 5000);
        }
        resolve(
          err(
            new Error(
              "Opencode process timed out after 30 minutes. The process may have hung."
            )
          )
        );
      }
    }, TIMEOUT_MS);

    cancellationToken?.onCancelled(() => {
      if (!processFinished) {
        processFinished = true;
        logger.warn("Task cancelled by user");
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        if (child && !child.killed) {
          child.kill("SIGTERM");
          setTimeout(() => {
            if (child && !child.killed) {
              child.kill("SIGKILL");
            }
          }, 5000);
        }
        resolve(err(new Error("Task cancelled by user")));
      }
    });

    let stdoutBuffer = "";

    child.stdout.on("data", (data) => {
      const chunk = data.toString();
      stdoutBuffer += chunk;

      const lines = stdoutBuffer.split("\n");
      stdoutBuffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) {
          continue;
        }

        try {
          const event = JSON.parse(trimmed);
          handleOpencodeEvent(event);
        } catch (_e) {
          // If not JSON, it might be a normal log line or warning
          if (trimmed) {
            log(trimmed);
          }
        }
      }
    });

    child.stderr.on("data", (data) => {
      const chunk = data.toString();
      const lines = chunk.split("\n");
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed) {
          log(`[stderr] ${trimmed}`);
        }
      }
    });

    const handleOpencodeEvent = (event: Record<string, unknown>) => {
      // Log the raw event for debugging (optional, can be removed if too verbose)
      // Uncomment this line if you need full JSON event logging:
      // log(`🔍 Event: ${JSON.stringify(event)}`);

      switch (event.type) {
        case OpencodeEventType.TEXT:
          if (event.part && typeof event.part === "object") {
            const part = event.part as { text?: string };
            if (part.text) {
              assistantMessage += part.text;
              log(`Thinking: ${part.text}`);
            }
          }
          break;
        case "tool_use": {
          const part =
            event.part && typeof event.part === "object"
              ? (event.part as {
                  tool?: string;
                  state?: {
                    status?: string;
                    input?: { filePath?: string; command?: string };
                    metadata?: { diff?: string };
                  };
                })
              : undefined;

          if (part?.tool) {
            const toolName = part.tool;
            const status = part.state?.status || "started";

            if (status === "started") {
              if (toolName === "bash") {
                const command = part.state?.input?.command;
                log(
                  `Running: ${command ? command.substring(0, 100) : "command"}`
                );
              } else if (toolName === "read") {
                const filePath = part.state?.input?.filePath;
                log(`Reading: ${filePath || "file"}`);
              } else {
                log(`Starting ${toolName}...`);
              }
            }

            if (status === "completed") {
              if (toolName === "edit") {
                const filePath = part.state?.input?.filePath;
                if (filePath) {
                  modifiedFiles.add(filePath);
                }
                if (part.state?.metadata?.diff) {
                  accumulatedDiff += `${part.state.metadata.diff}\n`;
                }
                log(`Modified: ${filePath || "unknown file"}`);
              } else if (toolName === "bash") {
                const command = part.state?.input?.command;
                log(
                  `Executed: ${command ? command.substring(0, 100) : "command"}`
                );
              } else if (toolName === "read") {
                const filePath = part.state?.input?.filePath;
                log(`Read: ${filePath || "file"}`);
              } else if (toolName === "write") {
                const filePath = part.state?.input?.filePath;
                if (filePath) {
                  createdFiles.add(filePath);
                }
                log(`Created: ${filePath || "file"}`);
              } else if (toolName === "glob" || toolName === "grep") {
                log("Searched codebase");
              } else {
                log(`Tool ${toolName} completed`);
              }
            }
          }
          break;
        }
        case "step_start":
          log("Starting new step...");
          break;
        case "step_finish":
          if (event.part && typeof event.part === "object") {
            const part = event.part as { reason?: string; cost?: number };
            if (part.reason) {
              log(`Step finished: ${part.reason}`);
            }
            if (part.cost) {
              log(`Cost: $${part.cost.toFixed(6)}`);
            }
          }
          break;
        default:
          if (event.type) {
            log(`Event: ${event.type}`);
          }
          break;
      }
    };

    const finishProcess = async (code: number | null) => {
      if (processFinished) {
        return;
      }
      processFinished = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      await logQueue.flush();

      const duration = Date.now() - startTime;
      metrics.histogram("opencode.execution.duration", duration, {
        model: config.model,
      });

      if (code !== 0 && code !== null) {
        logger.warn({ code }, "Opencode process exited with non-zero code");
        metrics.increment("opencode.requests.failed", {
          reason: "non_zero_exit_code",
        });
      } else {
        metrics.increment("opencode.requests.success");
      }

      const summary: ChangesSummary = {
        summary: assistantMessage.trim() || "Opencode completed execution",
        filesModified: Array.from(modifiedFiles),
        filesCreated: Array.from(createdFiles),
        filesDeleted: Array.from(deletedFiles),
        diff: accumulatedDiff,
      };

      if (summary.filesModified && summary.filesModified.length > 0) {
        metrics.histogram(
          "opencode.files.modified",
          summary.filesModified.length
        );
      }

      resolve(ok(summary));
    };

    child.on("close", (code) => {
      finishProcess(code);
    });

    child.on("error", (spawnError) => {
      if (processFinished) {
        return;
      }
      processFinished = true;
      clearTimeout(timeoutId);
      const duration = Date.now() - startTime;
      metrics.histogram("opencode.execution.duration", duration, {
        model: config.model,
      });
      metrics.increment("opencode.requests.failed", {
        reason: "spawn_error",
        error: spawnError instanceof Error ? spawnError.name : "unknown",
      });
      resolve(
        err(
          spawnError instanceof Error
            ? spawnError
            : new Error(String(spawnError))
        )
      );
    });
  });
}
