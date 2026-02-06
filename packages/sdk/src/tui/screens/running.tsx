import { execSync } from "node:child_process";
import { appendFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import type { WorkflowContext } from "@openfarm/agent-runner";
import {
  getDb,
  getWorkflows,
  initializePredefinedWorkflows,
} from "@openfarm/core/db";
import { captureGitChanges } from "@openfarm/operations/git/changes";
import { Box, Text, useInput, useStdout } from "@openfarm/tui-opentui";
import type {
  WorkflowEngineConfig,
  WorkflowExecutionRequest,
} from "@openfarm/workflow-engine";
import { executeWorkflow, InMemoryEventBus } from "@openfarm/workflow-engine";
import { useCallback, useEffect, useRef, useState } from "react";
import { OpenFarm } from "../../open-farm";
import { ErrorDisplay } from "../components/error-display";
import { useStore } from "../store";
import { type CategorizedError, categorizeError } from "../utils/error-handler";

const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  if (ms < 60_000) {
    return `${(ms / 1000).toFixed(1)}s`;
  }
  const mins = Math.floor(ms / 60_000);
  const secs = ((ms % 60_000) / 1000).toFixed(0);
  return `${mins}m ${secs}s`;
}

// Execute workflow using the workflow engine
async function executeWorkflowWithEngine(
  workflowId: string,
  task: string,
  workspace: string,
  provider: string,
  model: string | undefined,
  onLog: (msg: string) => void,
  signal: AbortSignal,
  onStepChange?: (step: string, stepNumber: number, totalSteps: number) => void,
  externalAgentConfig?: { cli: string; args: string; agentName: string },
  onAgentSessionStart?: (sessionName: string) => void
): Promise<{ success: boolean; worktreePath?: string; cancelled?: boolean }> {
  try {
    // Initialize database and workflows
    const db = await getDb();
    await initializePredefinedWorkflows(db);

    const executionId = `exec-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    const jobId = `job-${Date.now()}`;

    // Create workflow context
    const context: WorkflowContext = {
      workflowId,
      workItemId: "tui-execution",
      repoPath: workspace,
      repoUrl: "",
      branchName: "", // Will be set by git.branch step
      defaultBranch: "main",
      gitConfig: {
        repoPath: workspace,
        repoUrl: "",
        gitUserName: "",
        gitUserEmail: "",
      },
      workItem: {
        id: "tui-task",
        title: task,
        description: task,
        acceptanceCriteria: "",
        workItemType: "Task",
        source: "local" as const,
        status: "new",
        assignedAgentId: undefined,
        assignee: undefined,
        project: "tui",
      },
      jobId,
      executionId,
      workflowVariables: {
        task,
        provider,
        model,
        currentDate: new Date().toISOString(),
      },
    };

    // Create workflow execution request
    const request: WorkflowExecutionRequest = {
      executionId,
      jobId,
      workflowId,
      workItemId: "tui-execution",
      context,
      previewMode: false,
      agentConfig: {
        provider,
        model,
      },
    };

    // Create event bus to capture logs
    const eventBus = new InMemoryEventBus();

    // Subscribe to events for logging (simplified - InMemoryEventBus doesn't have 'on' method)
    // We'll handle events in the step executor instead

    // Create workflow engine config
    const engineConfig: WorkflowEngineConfig = {
      db: await getDb(),
      logger: {
        debug: async (_message: string) => {
          /* suppress debug in TUI */
        },
        info: async (message: string) => onLog(`[INFO] ${message}`),
        error: async (message: string) => onLog(`[ERROR] ${message}`),
      },
      eventBus,
      stepExecutor: {
        execute: async (stepRequest, executionContext) => {
          const { action, params } = stepRequest;

          // Track step progress
          const stepMap: Record<string, { name: string; number: number }> = {
            "git.branch": { name: "Creating branch", number: 1 },
            "git.worktree": { name: "Setting up worktree", number: 2 },
            "agent.code": { name: "Running AI agent", number: 3 },
          };
          const stepInfo = stepMap[action];
          if (stepInfo && onStepChange) {
            onStepChange(stepInfo.name, stepInfo.number, 3);
          }

          try {
            switch (action) {
              case "agent.code": {
                // Check cancellation before starting
                if (signal.aborted) {
                  throw new Error("CANCELLED");
                }

                onLog(`🤖 Executing agent code with ${provider}...`);

                // Use OpenFarm SDK to execute the task
                const openFarm = new OpenFarm({
                  defaultProvider: provider,
                });

                // Build execute options
                const executeOptions: Parameters<typeof openFarm.execute>[0] = {
                  task,
                  workspace: executionContext.context.worktreePath || workspace,
                  model,
                  onLog,
                };

                // Add external agent config if applicable
                if (provider === "external-agent" && externalAgentConfig) {
                  executeOptions.cli = externalAgentConfig.cli;
                  executeOptions.args = externalAgentConfig.args
                    ? externalAgentConfig.args
                        .split(" ")
                        .filter((a) => a.trim())
                    : [];
                  executeOptions.agentName = externalAgentConfig.agentName;

                  // Track session name for cancellation
                  const sessionName = `openfarm-${externalAgentConfig.agentName || externalAgentConfig.cli}`;
                  onAgentSessionStart?.(sessionName);
                }

                const result = await openFarm.execute(executeOptions);

                // Clear session ref after execution
                onAgentSessionStart?.("");

                // Check cancellation after execution
                if (signal.aborted) {
                  throw new Error("CANCELLED");
                }

                if (result.success) {
                  return {
                    success: true,
                    value: result.output,
                    worktreePath: executionContext.context.worktreePath,
                  };
                }
                return {
                  success: false,
                  error: new Error(result.error || "Agent execution failed"),
                  worktreePath: executionContext.context.worktreePath,
                };
              }

              case "git.branch": {
                const { execSync } = await import("node:child_process");
                const pattern = params?.pattern as string;

                if (!pattern) {
                  return {
                    success: false,
                    error: new Error(
                      "Git branch step requires 'pattern' parameter"
                    ),
                  };
                }

                // Evaluate pattern
                const datePlaceholder = "${Date.now";
                const dateNumber = Date.now().toString();
                const branchName = pattern.replace(
                  // biome-ignore lint/style/useTemplate: Intentional string building
                  datePlaceholder + "}",
                  dateNumber
                );

                // Get current branch
                let originalBranch = "main";
                try {
                  originalBranch = execSync("git branch --show-current", {
                    cwd: workspace,
                    encoding: "utf-8",
                  }).trim();
                } catch {
                  // Fallback to main
                }

                // Create new branch but don't checkout (worktree will handle checkout)
                try {
                  execSync(`git branch ${branchName}`, {
                    cwd: workspace,
                    stdio: "pipe",
                  });
                } catch (_error) {
                  // Branch might already exist, try to delete and recreate
                  try {
                    execSync(`git branch -D ${branchName}`, {
                      cwd: workspace,
                      stdio: "pipe",
                    });
                    execSync(`git branch ${branchName}`, {
                      cwd: workspace,
                      stdio: "pipe",
                    });
                  } catch (recreateError) {
                    return {
                      success: false,
                      error: new Error(
                        `Failed to create branch ${branchName}: ${recreateError}`
                      ),
                    };
                  }
                }

                // Store branch info in context
                executionContext.context.branchName = branchName;
                (executionContext.context as any).originalBranch =
                  originalBranch;

                onLog(`✅ Created branch: ${branchName}`);
                return { success: true, value: branchName };
              }

              case "git.worktree": {
                const { createWorktree } = await import(
                  "@openfarm/git-worktree"
                );
                const { join } = await import("node:path");
                const { tmpdir } = await import("node:os");
                const { mkdirSync, existsSync } = await import("node:fs");
                const { execSync } = await import("node:child_process");

                const operation = params?.operation as string;

                if (operation !== "create") {
                  return {
                    success: false,
                    error: new Error(
                      "Only 'create' operation is supported for git.worktree"
                    ),
                  };
                }

                const branchName = executionContext.context
                  .branchName as string;
                if (!branchName) {
                  return {
                    success: false,
                    error: new Error(
                      "No branch name found in context. Run git.branch step first."
                    ),
                  };
                }

                // Create worktree path
                const timestamp = Date.now();
                const worktreeParent = join(
                  tmpdir(),
                  `openfarm-worktree-${timestamp}`
                );
                const worktreePath = join(worktreeParent, "work");

                // Create parent directory
                if (!existsSync(worktreeParent)) {
                  mkdirSync(worktreeParent, { recursive: true });
                }

                // Find git root
                const gitRoot = execSync("git rev-parse --show-toplevel", {
                  cwd: workspace,
                  encoding: "utf-8",
                }).trim();

                // Create worktree
                onLog(`  worktree: ${worktreePath}`);

                const worktreeResult = await createWorktree(gitRoot, {
                  path: worktreePath,
                  branch: branchName,
                  createBranch: false, // Branch already exists from previous step
                });

                if (!worktreeResult.ok) {
                  onLog(
                    `❌ Worktree creation failed: ${worktreeResult.error.message}`
                  );
                  onLog(
                    `❌ Full error: ${worktreeResult.error.stack || worktreeResult.error.message}`
                  );
                  return { success: false, error: worktreeResult.error };
                }

                // Update context with worktree path
                executionContext.context.worktreePath =
                  worktreeResult.value.path;
                (executionContext.context as any).worktreeParent =
                  worktreeParent;

                onLog(`✓ worktree ready`);
                return { success: true, value: worktreeResult.value.path };
              }

              default:
                return {
                  success: false,
                  error: new Error(`Unsupported action: ${action}`),
                };
            }
          } catch (error) {
            const message =
              error instanceof Error ? error.message : String(error);
            // Propagate cancellation without wrapping
            if (message === "CANCELLED") {
              throw error;
            }
            return {
              success: false,
              error: new Error(`Step execution failed: ${message}`),
            };
          }
        },
      },
      errorHandler: {
        handle: async (error: unknown, context: any) => {
          const message =
            error instanceof Error ? error.message : String(error);
          onLog(`[ERROR] ${message}`);
        },
      },
      approvalHandler: {
        waitForApproval: async () => {
          throw new Error("Approval handler not implemented in TUI");
        },
      },
    };

    // Execute workflow
    const result = await executeWorkflow(request, engineConfig);

    // Cleanup: return to original branch and remove worktree
    try {
      const { execSync } = await import("node:child_process");
      const { rmSync } = await import("node:fs");
      const { removeWorktree } = await import("@openfarm/git-worktree");

      const branchName = context.branchName;
      const originalBranch = (context as any).originalBranch || "main";
      const worktreePath = context.worktreePath;
      const worktreeParent = (context as any).worktreeParent;

      if (branchName) {
        onLog("🌳 Returning to original branch...");
        try {
          execSync(`git checkout ${originalBranch}`, {
            cwd: workspace,
            stdio: "pipe",
          });
          onLog(`✅ Checked out ${originalBranch}`);
        } catch (error) {
          onLog(`⚠️ Failed to checkout ${originalBranch}: ${error}`);
        }
      }

      if (worktreePath) {
        onLog("🗑️ Removing worktree...");
        try {
          const gitRoot = execSync("git rev-parse --show-toplevel", {
            cwd: workspace,
            encoding: "utf-8",
          }).trim();
          await removeWorktree(gitRoot, worktreePath, true);
          onLog("✅ Worktree removed");
        } catch (error) {
          onLog(`⚠️ Failed to remove worktree: ${error}`);
        }
      }

      if (worktreeParent) {
        try {
          rmSync(worktreeParent, { recursive: true, force: true });
        } catch {
          // Ignore cleanup errors
        }
      }

      if (branchName) {
        onLog("🔥 Cleaning up branch...");
        try {
          execSync(`git branch -D ${branchName}`, {
            cwd: workspace,
            stdio: "pipe",
          });
          onLog(`✅ Branch ${branchName} deleted`);
        } catch (error) {
          onLog(`⚠️ Failed to delete branch: ${error}`);
        }
      }
    } catch (cleanupError) {
      onLog(`⚠️ Cleanup error: ${cleanupError}`);
    }

    return { success: result.success };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    onLog(`❌ Workflow execution failed: ${message}`);
    return { success: false };
  }
}

// Classify log lines for color + formatting
type LogType =
  | "header"
  | "separator"
  | "step"
  | "command"
  | "output"
  | "success"
  | "error"
  | "warning"
  | "info";

function classifyLog(line: string): LogType {
  if (!line || line.trim() === "") return "info";
  if (line.startsWith("─") || line.startsWith("═")) return "separator";
  if (
    line.startsWith("[ERROR]") ||
    line.startsWith("Error:") ||
    line.startsWith("❌")
  )
    return "error";
  if (line.startsWith("✅") || line.startsWith("✓")) return "success";
  if (line.startsWith("⚠")) return "warning";
  if (line.startsWith("$") || line.startsWith("🚀")) return "command";
  if (line.startsWith("  ")) return "output"; // indented agent output
  if (line.startsWith("│") || line.startsWith("├") || line.startsWith("└"))
    return "output";
  if (line.startsWith("▸") || line.startsWith("▹")) return "step";
  return "info";
}

const LOG_COLORS: Record<LogType, string | undefined> = {
  header: "cyan",
  separator: "gray",
  step: "cyan",
  command: "yellow",
  output: undefined, // default terminal color
  success: "green",
  error: "red",
  warning: "yellow",
  info: "gray",
};

function getLogColor(line: string): string | undefined {
  return LOG_COLORS[classifyLog(line)];
}

// Truncate a line to fit the content width
function formatLogLine(line: string, maxWidth: number): string {
  if (!line) return "";
  if (line.length > maxWidth) {
    return `${line.slice(0, maxWidth - 1)}…`;
  }
  return line;
}

// Filter and transform raw log messages for cleaner TUI display
function transformLogMessage(msg: string): string | null {
  // Remove [INFO] Starting step - redundant with step header
  if (msg.startsWith("[INFO] Starting step:")) return null;
  // Transform [INFO] Completed step into cleaner format
  const completedMatch = msg.match(
    /\[INFO\] Completed step: (\S+) \(([^)]+)\) in (\d+)ms/
  );
  if (completedMatch) {
    const duration = Number.parseInt(completedMatch[3], 10);
    const formatted =
      duration >= 1000 ? `${(duration / 1000).toFixed(1)}s` : `${duration}ms`;
    return `✓ ${completedMatch[2]} completed in ${formatted}`;
  }
  // Remove raw "done" from JSON parser
  if (msg.trim() === "done" || msg.trim() === "│ done") return null;
  // Clean up agent output lines - use tree-style indent
  if (msg.startsWith("│ ")) {
    return `  ${msg.slice(2)}`;
  }
  // Remove [INFO]/[ERROR] prefixes for cleaner look
  if (msg.startsWith("[ERROR] ")) return `✗ ${msg.slice(8)}`;
  // Remove emoji-heavy "Executing agent code" - redundant with step tracking
  if (msg.includes("Executing agent code with")) return null;
  return msg;
}

export function Running() {
  const {
    setScreen,
    currentExecution,
    updateExecution,
    selectedWorkflowId,
    externalAgentConfig,
  } = useStore();
  const [spinnerIdx, setSpinnerIdx] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [isDone, setIsDone] = useState(false);
  const [success, setSuccess] = useState<boolean | null>(null);
  const [startTime] = useState(Date.now());
  const [elapsed, setElapsed] = useState(0);
  const [stats, setStats] = useState({ tokens: 0, files: 0 });
  const [categorizedError, setCategorizedError] =
    useState<CategorizedError | null>(null);
  const [currentStep, setCurrentStep] = useState<string>("");
  const [stepProgress, setStepProgress] = useState({ current: 0, total: 3 });
  const aborted = useRef(false);
  const abortController = useRef<AbortController | null>(null);
  const executionStarted = useRef(false);

  // Timer for elapsed time (1 second granularity is sufficient)
  useEffect(() => {
    if (isDone) {
      return;
    }
    const interval = setInterval(() => {
      setElapsed(Date.now() - startTime);
    }, 1000);
    return () => clearInterval(interval);
  }, [isDone, startTime]);

  // Spinner animation (120ms for smooth animation with fewer renders)
  useEffect(() => {
    if (isDone) {
      return;
    }
    const interval = setInterval(() => {
      setSpinnerIdx((prev) => (prev + 1) % SPINNER_FRAMES.length);
    }, 120);
    return () => clearInterval(interval);
  }, [isDone]);

  // Parse stats from logs
  const updateStats = useCallback((msg: string) => {
    if (msg.includes("Tokens:") || msg.includes("tokens")) {
      const match = msg.match(/(\d+)\s*tokens?/i);
      if (match) {
        setStats((s) => ({ ...s, tokens: Number.parseInt(match[1], 10) }));
      }
    }
    if (msg.includes("Created:") || msg.includes("Edited:")) {
      setStats((s) => ({ ...s, files: s.files + 1 }));
    }
  }, []);

  // Setup log file for this execution - only create once
  const logFilePath = useRef<string | null>(null);
  const logInitialized = useRef(false);

  const lastLogRef = useRef<string>("");

  const onLog = useCallback(
    (msg: string) => {
      if (aborted.current) {
        return;
      }

      // Skip empty/whitespace-only lines
      if (!msg || msg.trim() === "") return;

      // Detect step changes (before filtering)
      if (msg.includes("Creating branch:")) {
        setCurrentStep("Creating branch");
      } else if (msg.includes("Creating worktree")) {
        setCurrentStep("Setting up worktree");
      } else if (msg.includes("Executing agent code")) {
        setCurrentStep("Running AI agent");
      } else if (msg.includes("Returning to original branch")) {
        setCurrentStep("Cleaning up");
      } else if (msg.includes("Workflow:")) {
        setCurrentStep("Initializing");
      }

      // Always write raw message to log file (unfiltered)
      if (logFilePath.current) {
        try {
          const timestamp = new Date().toISOString();
          appendFileSync(logFilePath.current, `[${timestamp}] ${msg}\n`);
        } catch {
          // Ignore file write errors
        }
      }

      // Track stats from raw message
      updateStats(msg);

      // Transform for TUI display (filter noise, reformat)
      const transformed = transformLogMessage(msg);
      if (transformed === null) return;

      // Skip duplicates
      if (transformed === lastLogRef.current) return;
      lastLogRef.current = transformed;

      // Add to visible logs (500 entry ring buffer)
      setLogs((prev) => {
        const next = [...prev, transformed];
        return next.length > 500 ? next.slice(-500) : next;
      });
    },
    [updateStats]
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: logs and stats are intentionally excluded to prevent re-execution
  useEffect(() => {
    if (!currentExecution || aborted.current) {
      return;
    }

    // Prevent re-execution when currentExecution reference changes due to status updates
    if (executionStarted.current) {
      return;
    }
    executionStarted.current = true;

    // Create abort controller for this execution
    abortController.current = new AbortController();

    // Setup log file only once
    if (!logInitialized.current && currentExecution) {
      logInitialized.current = true;
      const logsDir = join(process.cwd(), "logs");
      try {
        mkdirSync(logsDir, { recursive: true });
      } catch {
        // Directory might already exist
      }
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      logFilePath.current = join(
        logsDir,
        `execution-${currentExecution.id}-${timestamp}.txt`
      );

      // Write header to log file
      const header = [
        "=".repeat(80),
        "OpenFarm Execution Log",
        `Execution ID: ${currentExecution.id}`,
        `Timestamp: ${new Date().toISOString()}`,
        `Provider: ${currentExecution.provider}`,
        `Model: ${currentExecution.model || "default"}`,
        `Workspace: ${currentExecution.workspace}`,
        `Task: ${currentExecution.task}`,
        "=".repeat(80),
        "",
      ].join("\n");
      appendFileSync(logFilePath.current, header);
      // Don't use onLog here to avoid re-render loop
    }

    const run = async () => {
      // Allow React to finish rendering before starting heavy work
      await new Promise((resolve) => setImmediate(resolve));
      try {
        // Get workflow info from database
        const db = await getDb();
        await initializePredefinedWorkflows(db);
        const workflows = await getWorkflows(db);
        const currentWorkflow = workflows.find(
          (w) => w.id === selectedWorkflowId
        );

        // Compact execution config header
        const wfName = currentWorkflow?.name || selectedWorkflowId;
        const modelStr = currentExecution.model
          ? ` · ${currentExecution.model}`
          : "";
        onLog(`${wfName} · ${currentExecution.provider}${modelStr}`);
        // Show workspace as short path
        const ws = currentExecution.workspace;
        const shortWs = ws.includes("/")
          ? `…/${ws.split("/").slice(-2).join("/")}`
          : ws;
        onLog(`${shortWs}`);
        onLog("─".repeat(40));

        updateExecution(currentExecution.id, { status: "running" });

        // Use workflow engine to execute the selected workflow
        const result = await executeWorkflowWithEngine(
          selectedWorkflowId,
          currentExecution.task,
          currentExecution.workspace,
          currentExecution.provider,
          currentExecution.model,
          onLog,
          abortController.current!.signal,
          (step, current, total) => {
            setCurrentStep(step);
            setStepProgress({ current, total });
          },
          currentExecution.provider === "external-agent"
            ? externalAgentConfig
            : undefined,
          (sessionName) => {
            externalAgentSession.current = sessionName || null;
          }
        );

        if (aborted.current) {
          onLog("⚠️ Execution cancelled");
          setSuccess(false);
          setIsDone(true);
          return;
        }

        setSuccess(result.success);

        // Add execution result output to logs if not already there
        if (result.success && result.worktreePath) {
          onLog(`  output: ${result.worktreePath}`);
        }

        // Capture git diff and file changes from worktree if available
        let diffText = "";
        let modifiedFiles: string[] = [];
        const diffTargetPath =
          result.worktreePath || currentExecution.workspace;
        try {
          const changesResult = await captureGitChanges(
            diffTargetPath,
            async (file: string, args: string[]) => {
              const { execFile } = await import("node:child_process");
              const { promisify } = await import("node:util");
              const execFileAsync = promisify(execFile);
              return execFileAsync(file, args, {
                cwd: diffTargetPath,
              });
            },
            false
          );
          if (changesResult.ok) {
            diffText = changesResult.value.diff || "";
            modifiedFiles = [
              ...(changesResult.value.filesModified || []),
              ...(changesResult.value.filesCreated || []),
            ];
          }
        } catch (diffError) {
          console.error("Failed to capture git changes:", diffError);
        }

        const completedAt = new Date();
        const duration = Date.now() - startTime;

        updateExecution(currentExecution.id, {
          status: result.success ? "completed" : "failed",
          completedAt,
          duration,
          output: logs.join("\n"),
          tokensUsed: stats.tokens || undefined,
          filesModified: modifiedFiles.length > 0 ? modifiedFiles : undefined,
          diff: diffText || undefined,
          workflowId: selectedWorkflowId,
        });

        // Write footer to log file
        if (logFilePath.current) {
          try {
            const footer = [
              "",
              "=".repeat(80),
              `Execution ${result.success ? "COMPLETED" : "FAILED"}`,
              `Duration: ${duration}ms`,
              `Completed at: ${completedAt.toISOString()}`,
              `Log file: ${logFilePath.current}`,
              "=".repeat(80),
            ].join("\n");
            appendFileSync(logFilePath.current, footer);
          } catch {
            // Ignore file write errors
          }
        }

        setIsDone(true);
      } catch (error) {
        if (aborted.current) {
          return;
        }

        const message = error instanceof Error ? error.message : String(error);

        // Handle cancellation
        if (message === "CANCELLED") {
          onLog("⚠️ Execution cancelled by user");
          const completedAt = new Date();
          const duration = Date.now() - startTime;

          // Write footer to log file on cancellation
          if (logFilePath.current) {
            try {
              const footer = [
                "",
                "=".repeat(80),
                "Execution CANCELLED by user",
                `Duration: ${duration}ms`,
                `Cancelled at: ${completedAt.toISOString()}`,
                `Log file: ${logFilePath.current}`,
                "=".repeat(80),
              ].join("\n");
              appendFileSync(logFilePath.current, footer);
            } catch {
              // Ignore file write errors
            }
          }

          updateExecution(currentExecution.id, {
            status: "cancelled",
            completedAt,
            duration,
            output: logs.join("\n"),
          });
          setSuccess(false);
          setIsDone(true);
          return;
        }

        const categorized = categorizeError(error);
        setCategorizedError(categorized);
        onLog(`❌ ${message}`);

        const completedAt = new Date();
        const duration = Date.now() - startTime;

        // Write footer to log file on error
        if (logFilePath.current) {
          try {
            const footer = [
              "",
              "=".repeat(80),
              "Execution FAILED with error",
              `Error: ${message}`,
              `Duration: ${duration}ms`,
              `Failed at: ${completedAt.toISOString()}`,
              `Log file: ${logFilePath.current}`,
              "=".repeat(80),
            ].join("\n");
            appendFileSync(logFilePath.current, footer);
          } catch {
            // Ignore file write errors
          }
        }

        updateExecution(currentExecution.id, {
          status: "failed",
          completedAt,
          duration,
          output: logs.join("\n"),
          error: categorized.originalError,
        });
        setSuccess(false);
        setIsDone(true);
      }
    };

    run();

    return () => {
      // Cleanup: abort controller only, don't reset execution/log state
      // to prevent re-execution loop when currentExecution reference changes
    };
  }, [currentExecution, onLog, updateExecution, selectedWorkflowId, startTime]);

  // Track external agent session for cancellation
  const externalAgentSession = useRef<string | null>(null);

  // Function to kill tmux session
  const killTmuxSession = useCallback((sessionName: string) => {
    try {
      execSync(`tmux kill-session -t ${sessionName} 2>/dev/null || true`);
    } catch {
      // Ignore errors
    }
  }, []);

  useInput((input, key) => {
    // Cancel with 'c' or Escape
    if ((input === "c" || input === "C") && !isDone) {
      onLog("⚠️  Cancelling execution...");
      aborted.current = true;
      abortController.current?.abort();

      // Kill tmux session if running
      if (externalAgentSession.current) {
        killTmuxSession(externalAgentSession.current);
        onLog("🛑 Killed agent process");
      }
    }

    if (key.escape) {
      if (!isDone) {
        aborted.current = true;
        abortController.current?.abort();

        // Kill tmux session if running
        if (externalAgentSession.current) {
          killTmuxSession(externalAgentSession.current);
        }

        onLog("⚠️  Cancelled");
        if (currentExecution) {
          updateExecution(currentExecution.id, { status: "cancelled" });
        }
      }
      setScreen("dashboard");
    }
  });

  const { stdout } = useStdout();

  if (!currentExecution) {
    return null;
  }

  const spinner = SPINNER_FRAMES[spinnerIdx];
  const termWidth = Math.max(stdout?.columns || 80, 60);
  const boxWidth = Math.min(termWidth - 2, 120);
  // Content width: border(2) + paddingLeft(1) + paddingRight(1) = 4
  const contentWidth = boxWidth - 4;
  // Dynamic: show at least 6 lines, grow with content, cap at terminal height - 6
  const termHeight = stdout?.rows || 24;
  const maxLogLines = Math.max(6, termHeight - 6);
  const visibleLogs = logs.slice(-maxLogLines);
  // Box height: content lines + border(2), min 8
  const boxHeight = Math.max(
    8,
    Math.min(visibleLogs.length + (isDone ? 0 : 1), maxLogLines) + 2
  );

  const statusColor = isDone ? (success ? "green" : "red") : "cyan";
  const borderColor = isDone ? (success ? "green" : "red") : "gray";

  return (
    <Box flexDirection="column" width={boxWidth}>
      {/* Status bar */}
      <Box flexDirection="row" justifyContent="space-between" width={boxWidth}>
        <Text bold color={statusColor}>
          {isDone
            ? success
              ? "✓ Success"
              : "✗ Failed"
            : `${spinner} ${currentStep || "Running"}${stepProgress.current > 0 ? ` [${stepProgress.current}/${stepProgress.total}]` : ""}`}
        </Text>
        <Text color="gray">{formatDuration(elapsed)}</Text>
      </Box>

      {/* Log output */}
      <Box
        borderColor={borderColor}
        borderStyle="single"
        flexDirection="column"
        height={boxHeight}
        paddingLeft={1}
        paddingRight={1}
        width={boxWidth}
      >
        {visibleLogs.map((log, i) => (
          <Text key={i} color={getLogColor(log)} wrap="truncate-end">
            {formatLogLine(log, contentWidth)}
          </Text>
        ))}
        {!isDone && <Text color="cyan">{spinner}</Text>}
      </Box>

      {/* Error Display */}
      {isDone && !success && categorizedError && (
        <Box marginTop={1} width={boxWidth}>
          <ErrorDisplay error={categorizedError} />
        </Box>
      )}

      {/* Footer */}
      <Box flexDirection="row" justifyContent="space-between" width={boxWidth}>
        <Text color="gray">
          {logs.length} lines
          {stats.tokens > 0 ? `  ${stats.tokens.toLocaleString()} tok` : ""}
          {stats.files > 0
            ? `  ${stats.files} file${stats.files !== 1 ? "s" : ""}`
            : ""}
        </Text>
        <Text color="gray">{isDone ? "esc back" : "esc back  c cancel"}</Text>
      </Box>
    </Box>
  );
}
