/**
 * Execution Runner
 *
 * Standalone module that orchestrates workflow execution independent of React
 * component lifecycle. Writes all state to the execution runtime store so it
 * survives component mount/unmount cycles.
 */

import { appendFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import type { WorkflowContext } from "@openfarm/agent-runner";
import {
  getDb,
  getWorkflows,
  initializePredefinedWorkflows,
} from "@openfarm/core/db";
import { captureGitChanges } from "@openfarm/operations/git/changes";
import type {
  WorkflowEngineConfig,
  WorkflowExecutionRequest,
} from "@openfarm/workflow-engine";
import { executeWorkflow, InMemoryEventBus } from "@openfarm/workflow-engine";
import { OpenFarm } from "../../open-farm";
import type { useStore } from "../store";
import type { useExecutionRuntimeStore } from "../store/execution-runtime-store";
import { categorizeError } from "../utils/error-handler";

export interface StartExecutionParams {
  executionId: string;
  task: string;
  workspace: string;
  provider: string;
  model: string | undefined;
  workflowId: string;
  externalAgentConfig?: { cli: string; args: string; agentName: string };
  runtimeStore: typeof useExecutionRuntimeStore;
  appStore: typeof useStore;
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
    const db = await getDb();
    await initializePredefinedWorkflows(db);

    const executionId = `exec-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    const jobId = `job-${Date.now()}`;

    const context: WorkflowContext = {
      workflowId,
      workItemId: "tui-execution",
      repoPath: workspace,
      repoUrl: "",
      branchName: "",
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

    const request: WorkflowExecutionRequest = {
      executionId,
      jobId,
      workflowId,
      workItemId: "tui-execution",
      context,
      previewMode: false,
      agentConfig: { provider, model },
    };

    const eventBus = new InMemoryEventBus();

    const engineConfig: WorkflowEngineConfig = {
      db: await getDb(),
      logger: {
        debug: async (_message: string) => {
          /* suppress debug */
        },
        info: async (message: string) => onLog(`[INFO] ${message}`),
        error: async (message: string) => onLog(`[ERROR] ${message}`),
      },
      eventBus,
      stepExecutor: {
        execute: async (stepRequest, executionContext) => {
          const { action, params } = stepRequest;

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
                if (signal.aborted) {
                  throw new Error("CANCELLED");
                }

                onLog(`\u{1F916} Executing agent code with ${provider}...`);

                const openFarm = new OpenFarm({ defaultProvider: provider });
                const executeOptions: Parameters<typeof openFarm.execute>[0] = {
                  task,
                  workspace: executionContext.context.worktreePath || workspace,
                  model,
                  onLog,
                };

                if (provider === "external-agent" && externalAgentConfig) {
                  executeOptions.cli = externalAgentConfig.cli;
                  executeOptions.args = externalAgentConfig.args
                    ? externalAgentConfig.args
                        .split(" ")
                        .filter((a) => a.trim())
                    : [];
                  executeOptions.agentName = externalAgentConfig.agentName;
                  const sessionName = `openfarm-${externalAgentConfig.agentName || externalAgentConfig.cli}`;
                  onAgentSessionStart?.(sessionName);
                }

                const result = await openFarm.execute(executeOptions);
                onAgentSessionStart?.("");

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

                const datePlaceholder = "${Date.now";
                const dateNumber = Date.now().toString();
                const branchName = pattern.replace(
                  `${datePlaceholder}}`,
                  dateNumber
                );

                let originalBranch = "main";
                try {
                  originalBranch = execSync("git branch --show-current", {
                    cwd: workspace,
                    encoding: "utf-8",
                  }).trim();
                } catch {
                  /* Fallback to main */
                }

                try {
                  execSync(`git branch ${branchName}`, {
                    cwd: workspace,
                    stdio: "pipe",
                  });
                } catch (_error) {
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

                executionContext.context.branchName = branchName;
                (executionContext.context as any).originalBranch =
                  originalBranch;

                onLog(`\u2705 Created branch: ${branchName}`);
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

                const timestamp = Date.now();
                const worktreeParent = join(
                  tmpdir(),
                  `openfarm-worktree-${timestamp}`
                );
                const worktreePath = join(worktreeParent, "work");

                if (!existsSync(worktreeParent)) {
                  mkdirSync(worktreeParent, { recursive: true });
                }

                const gitRoot = execSync("git rev-parse --show-toplevel", {
                  cwd: workspace,
                  encoding: "utf-8",
                }).trim();
                onLog(`  worktree: ${worktreePath}`);

                const worktreeResult = await createWorktree(gitRoot, {
                  path: worktreePath,
                  branch: branchName,
                  createBranch: false,
                });

                if (!worktreeResult.ok) {
                  onLog(
                    `\u274C Worktree creation failed: ${worktreeResult.error.message}`
                  );
                  return { success: false, error: worktreeResult.error };
                }

                executionContext.context.worktreePath =
                  worktreeResult.value.path;
                (executionContext.context as any).worktreeParent =
                  worktreeParent;

                onLog("\u2713 worktree ready");
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
        handle: async (error: unknown, _context: any) => {
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
        try {
          execSync(`git checkout ${originalBranch}`, {
            cwd: workspace,
            stdio: "pipe",
          });
        } catch (error) {
          onLog(`\u26A0\uFE0F Failed to checkout ${originalBranch}: ${error}`);
        }
      }

      if (worktreePath) {
        try {
          const gitRoot = execSync("git rev-parse --show-toplevel", {
            cwd: workspace,
            encoding: "utf-8",
          }).trim();
          await removeWorktree(gitRoot, worktreePath, true);
        } catch (error) {
          onLog(`\u26A0\uFE0F Failed to remove worktree: ${error}`);
        }
      }

      if (worktreeParent) {
        try {
          rmSync(worktreeParent, { recursive: true, force: true });
        } catch {
          /* ignore */
        }
      }

      if (branchName) {
        try {
          execSync(`git branch -D ${branchName}`, {
            cwd: workspace,
            stdio: "pipe",
          });
        } catch (error) {
          onLog(`\u26A0\uFE0F Failed to delete branch: ${error}`);
        }
      }
    } catch (cleanupError) {
      onLog(`\u26A0\uFE0F Cleanup error: ${cleanupError}`);
    }

    return { success: result.success };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    onLog(`\u274C Workflow execution failed: ${message}`);
    return { success: false };
  }
}

/**
 * Start an execution. This runs independently of React component lifecycle.
 * All state is written to the runtime store.
 */
export async function startExecution(
  params: StartExecutionParams
): Promise<void> {
  const {
    executionId,
    task,
    workspace,
    provider,
    model,
    workflowId,
    externalAgentConfig,
    runtimeStore,
    appStore,
  } = params;

  const store = runtimeStore.getState();
  const _app = appStore.getState();

  // Create abort controller and store in session
  const abortController = new AbortController();
  store.updateSession(executionId, { abortController });

  // Setup log file
  const logsDir = join(process.cwd(), "logs");
  try {
    mkdirSync(logsDir, { recursive: true });
  } catch {
    /* exists */
  }
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const logFilePath = join(
    logsDir,
    `execution-${executionId}-${timestamp}.txt`
  );

  const header = [
    "=".repeat(80),
    "OpenFarm Execution Log",
    `Execution ID: ${executionId}`,
    `Timestamp: ${new Date().toISOString()}`,
    `Provider: ${provider}`,
    `Model: ${model || "default"}`,
    `Workspace: ${workspace}`,
    `Task: ${task}`,
    "=".repeat(80),
    "",
  ].join("\n");
  try {
    appendFileSync(logFilePath, header);
  } catch {
    /* ignore */
  }

  store.updateSession(executionId, { logFilePath });

  // Callbacks that write to the runtime store
  const onLog = (msg: string) => {
    runtimeStore.getState().addLog(executionId, msg);
  };

  const onStepChange = (step: string, current: number, total: number) => {
    runtimeStore.getState().updateSession(executionId, {
      currentStep: step,
      stepProgress: { current, total },
    });
  };

  const onAgentSessionStart = (sessionName: string) => {
    runtimeStore.getState().updateSession(executionId, {
      externalAgentSession: sessionName || null,
    });
  };

  // Allow React to finish rendering before starting heavy work
  await new Promise((resolve) => setImmediate(resolve));

  try {
    // Get workflow info
    const db = await getDb();
    await initializePredefinedWorkflows(db);
    const workflows = await getWorkflows(db);
    const currentWorkflow = workflows.find((w) => w.id === workflowId);

    // Compact header in logs
    const wfName = currentWorkflow?.name || workflowId;
    const modelStr = model ? ` \u00B7 ${model}` : "";
    onLog(`${wfName} \u00B7 ${provider}${modelStr}`);
    const shortWs = workspace.includes("/")
      ? `\u2026/${workspace.split("/").slice(-2).join("/")}`
      : workspace;
    onLog(shortWs);
    onLog("\u2500".repeat(40));

    // Mark as running in app store
    appStore.getState().updateExecution(executionId, { status: "running" });

    // Execute workflow
    const result = await executeWorkflowWithEngine(
      workflowId,
      task,
      workspace,
      provider,
      model,
      onLog,
      abortController.signal,
      onStepChange,
      provider === "external-agent" ? externalAgentConfig : undefined,
      onAgentSessionStart
    );

    if (abortController.signal.aborted) {
      onLog("\u26A0\uFE0F Execution cancelled");
      const session = runtimeStore.getState().getSession(executionId);
      const completedAt = new Date();
      const duration = Date.now() - (session?.startTime || Date.now());

      writeLogFooter(logFilePath, "CANCELLED", duration, completedAt);

      appStore.getState().updateExecution(executionId, {
        status: "cancelled",
        completedAt,
        duration,
        output: session?.logs.join("\n") || "",
      });

      runtimeStore.getState().updateSession(executionId, {
        isDone: true,
        success: false,
      });
      scheduleCleanup(runtimeStore, executionId);
      return;
    }

    // Success or failure
    const session = runtimeStore.getState().getSession(executionId);

    if (result.success && result.worktreePath) {
      onLog(`  output: ${result.worktreePath}`);
    }

    // Capture git diff
    let diffText = "";
    let modifiedFiles: string[] = [];
    const diffTargetPath = result.worktreePath || workspace;
    try {
      const changesResult = await captureGitChanges(
        diffTargetPath,
        async (file: string, args: string[]) => {
          const { execFile } = await import("node:child_process");
          const { promisify } = await import("node:util");
          const execFileAsync = promisify(execFile);
          return execFileAsync(file, args, { cwd: diffTargetPath });
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
    const duration = Date.now() - (session?.startTime || Date.now());
    const updatedSession = runtimeStore.getState().getSession(executionId);

    writeLogFooter(
      logFilePath,
      result.success ? "COMPLETED" : "FAILED",
      duration,
      completedAt
    );

    appStore.getState().updateExecution(executionId, {
      status: result.success ? "completed" : "failed",
      completedAt,
      duration,
      output: updatedSession?.logs.join("\n") || "",
      tokensUsed: updatedSession?.stats.tokens || undefined,
      filesModified: modifiedFiles.length > 0 ? modifiedFiles : undefined,
      diff: diffText || undefined,
      workflowId,
    });

    runtimeStore.getState().updateSession(executionId, {
      isDone: true,
      success: result.success,
    });
    scheduleCleanup(runtimeStore, executionId);
  } catch (error) {
    if (abortController.signal.aborted) {
      return;
    }

    const message = error instanceof Error ? error.message : String(error);
    const session = runtimeStore.getState().getSession(executionId);

    if (message === "CANCELLED") {
      onLog("\u26A0\uFE0F Execution cancelled by user");
      const completedAt = new Date();
      const duration = Date.now() - (session?.startTime || Date.now());

      writeLogFooter(logFilePath, "CANCELLED", duration, completedAt);

      appStore.getState().updateExecution(executionId, {
        status: "cancelled",
        completedAt,
        duration,
        output: session?.logs.join("\n") || "",
      });

      runtimeStore.getState().updateSession(executionId, {
        isDone: true,
        success: false,
      });
      scheduleCleanup(runtimeStore, executionId);
      return;
    }

    const categorized = categorizeError(error);
    onLog(`\u274C ${message}`);

    const completedAt = new Date();
    const duration = Date.now() - (session?.startTime || Date.now());

    writeLogFooter(logFilePath, "FAILED", duration, completedAt);

    appStore.getState().updateExecution(executionId, {
      status: "failed",
      completedAt,
      duration,
      output: session?.logs.join("\n") || "",
      error: categorized.originalError,
    });

    runtimeStore.getState().updateSession(executionId, {
      isDone: true,
      success: false,
      categorizedError: categorized,
    });
    scheduleCleanup(runtimeStore, executionId);
  }
}

function writeLogFooter(
  logFilePath: string,
  status: string,
  duration: number,
  at: Date
): void {
  try {
    const footer = [
      "",
      "=".repeat(80),
      `Execution ${status}`,
      `Duration: ${duration}ms`,
      `At: ${at.toISOString()}`,
      "=".repeat(80),
    ].join("\n");
    appendFileSync(logFilePath, footer);
  } catch {
    // Ignore file write errors
  }
}

function scheduleCleanup(
  runtimeStore: typeof useExecutionRuntimeStore,
  executionId: string
): void {
  setTimeout(() => {
    const session = runtimeStore.getState().getSession(executionId);
    if (session?.isDone) {
      runtimeStore.getState().removeSession(executionId);
    }
  }, 60_000);
}
