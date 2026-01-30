import type { WorkflowContext } from "@openfarm/agent-runner";
import {
  getDb,
  getWorkflows,
  initializePredefinedWorkflows,
} from "@openfarm/core/db";
import type {
  WorkflowEngineConfig,
  WorkflowExecutionRequest,
} from "@openfarm/workflow-engine";
import { executeWorkflow, InMemoryEventBus } from "@openfarm/workflow-engine";
import { Box, Text, useInput } from "ink";
import { useCallback, useEffect, useRef, useState } from "react";
import { OpenFarm } from "../../open-farm";
import { useStore } from "../store";

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
  onLog: (msg: string) => void
): Promise<{ success: boolean }> {
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
        debug: async (message: string) => onLog(`[DEBUG] ${message}`),
        info: async (message: string) => onLog(`[INFO] ${message}`),
        error: async (message: string) => onLog(`[ERROR] ${message}`),
      },
      eventBus,
      stepExecutor: {
        execute: async (stepRequest, executionContext) => {
          const { action, params } = stepRequest;

          try {
            switch (action) {
              case "agent.code": {
                onLog(`🤖 Executing agent code with ${provider}...`);

                // Use OpenFarm SDK to execute the task
                const openFarm = new OpenFarm({
                  defaultProvider: provider,
                });

                const result = await openFarm.execute({
                  task,
                  workspace: executionContext.context.worktreePath || workspace,
                  model,
                  onLog,
                });

                if (result.success) {
                  return { success: true, value: result.output };
                }
                return {
                  success: false,
                  error: new Error(result.error || "Agent execution failed"),
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
                onLog(`🔧 Creating worktree at: ${worktreePath}`);
                onLog(`🔧 Using branch: ${branchName}`);
                onLog(`🔧 Git root: ${gitRoot}`);

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

                onLog(`✅ Created worktree: ${worktreeResult.value.path}`);
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

export function Running() {
  const { setScreen, currentExecution, updateExecution, selectedWorkflowId } =
    useStore();
  const [spinnerIdx, setSpinnerIdx] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [isDone, setIsDone] = useState(false);
  const [success, setSuccess] = useState<boolean | null>(null);
  const [startTime] = useState(Date.now());
  const [elapsed, setElapsed] = useState(0);
  const [stats, setStats] = useState({ tokens: 0, files: 0 });
  const aborted = useRef(false);

  // Timer para elapsed time
  useEffect(() => {
    if (isDone) {
      return;
    }
    const interval = setInterval(() => {
      setElapsed(Date.now() - startTime);
    }, 100);
    return () => clearInterval(interval);
  }, [isDone, startTime]);

  // Spinner animation
  useEffect(() => {
    if (isDone) {
      return;
    }
    const interval = setInterval(() => {
      setSpinnerIdx((prev) => (prev + 1) % SPINNER_FRAMES.length);
    }, 80);
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

  const onLog = useCallback(
    (msg: string) => {
      if (aborted.current) {
        return;
      }
      setLogs((prev) => [...prev, msg]);
      updateStats(msg);
    },
    [updateStats]
  );

  useEffect(() => {
    if (!currentExecution || aborted.current) {
      return;
    }

    const run = async () => {
      try {
        // Get workflow info from database
        const db = await getDb();
        await initializePredefinedWorkflows(db);
        const workflows = await getWorkflows(db);
        const currentWorkflow = workflows.find(
          (w) => w.id === selectedWorkflowId
        );

        // Show workflow info
        onLog(
          `🔄 Executing workflow: ${currentWorkflow?.name || selectedWorkflowId}`
        );
        if (currentWorkflow?.description) {
          onLog(`   ${currentWorkflow.description}`);
        }

        // Show actual steps from workflow
        if (currentWorkflow?.steps && currentWorkflow.steps.length > 0) {
          const stepNames = currentWorkflow.steps
            .map((step) => step.id)
            .join(" → ");
          onLog(`   Steps: ${stepNames}`);
        }

        onLog("");
        onLog(`🔧 Provider: ${currentExecution.provider}`);
        if (currentExecution.model) {
          onLog(`🤖 Model: ${currentExecution.model}`);
        }
        onLog(`📁 ${currentExecution.workspace}`);
        onLog(`📝 ${currentExecution.task}`);
        onLog("");

        updateExecution(currentExecution.id, { status: "running" });

        // Use workflow engine to execute the selected workflow
        const result = await executeWorkflowWithEngine(
          selectedWorkflowId,
          currentExecution.task,
          currentExecution.workspace,
          currentExecution.provider,
          currentExecution.model,
          onLog
        );

        if (aborted.current) {
          return;
        }

        setSuccess(result.success);

        updateExecution(currentExecution.id, {
          status: result.success ? "completed" : "failed",
        });

        setIsDone(true);
      } catch (error) {
        if (aborted.current) {
          return;
        }

        const message = error instanceof Error ? error.message : String(error);
        onLog(`❌ ${message}`);
        updateExecution(currentExecution.id, { status: "failed" });
        setSuccess(false);
        setIsDone(true);
      }
    };

    run();
  }, [currentExecution, onLog, updateExecution, selectedWorkflowId]);

  useInput((_input, key) => {
    if (key.escape) {
      if (!isDone) {
        aborted.current = true;
        onLog("⚠️  Cancelled");
        if (currentExecution) {
          updateExecution(currentExecution.id, { status: "failed" });
        }
      }
      setScreen("dashboard");
    }
  });

  if (!currentExecution) {
    return null;
  }

  const spinner = SPINNER_FRAMES[spinnerIdx];
  const visibleLogs = logs.slice(-18);

  return (
    <Box flexDirection="column">
      {/* Header con tiempo */}
      <Box flexDirection="row" justifyContent="space-between">
        <Text bold color={isDone ? (success ? "green" : "red") : "cyan"}>
          {isDone
            ? success
              ? "✅ Success"
              : "❌ Failed"
            : `${spinner} Running`}
        </Text>
        <Text color="gray">{formatDuration(elapsed)}</Text>
      </Box>

      <Text color="gray">{"─".repeat(60)}</Text>

      {/* Output */}
      <Box
        borderColor={isDone ? (success ? "green" : "red") : "gray"}
        borderStyle="single"
        flexDirection="column"
        height={20}
        padding={1}
      >
        {visibleLogs.map((log, i) => (
          <Text key={i} wrap="wrap">
            {log || " "}
          </Text>
        ))}
        {!isDone && <Text color="cyan">{spinner}</Text>}
      </Box>

      <Text color="gray">{"─".repeat(60)}</Text>

      {/* Stats */}
      <Box flexDirection="row" justifyContent="space-between">
        <Text color="gray">{logs.length} lines</Text>
        {stats.tokens > 0 && (
          <Text color="gray">{stats.tokens.toLocaleString()} tokens</Text>
        )}
        {stats.files > 0 && (
          <Text color="gray">
            {stats.files} file{stats.files !== 1 ? "s" : ""}
          </Text>
        )}
        <Text color="gray">{isDone ? "Esc to back" : "Esc to cancel"}</Text>
      </Box>
    </Box>
  );
}
