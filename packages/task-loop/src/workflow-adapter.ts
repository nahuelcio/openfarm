/**
 * Workflow Adapter
 *
 * Adapts the workflow engine to execute git/setup steps for the task loop.
 * The actual agent execution is handled by the orchestrator using OpenFarm SDK.
 */

import type { WorkflowContext } from "@openfarm/agent-runner";
import { getDb, getWorkflows, initializePredefinedWorkflows } from "@openfarm/core/db";
import type { WorkItem } from "@openfarm/core/types";
import {
  executeWorkflow,
  InMemoryEventBus,
  type WorkflowEngineConfig,
  type WorkflowExecutionRequest,
  type StepExecutor,
} from "@openfarm/workflow-engine";
import type {
  TaskLoopConfig,
  TaskExecutionResult,
  TaskLoopLogger,
} from "./types";

/**
 * Options for executing git/setup steps via workflow
 */
export interface WorkflowSetupOptions {
  /** Work item */
  workItem: WorkItem;
  /** Task loop configuration */
  config: TaskLoopConfig;
  /** Workspace path */
  workspace: string;
  /** Logger */
  logger?: TaskLoopLogger;
  /** Abort signal */
  signal?: AbortSignal;
}

/**
 * Result of setup steps
 */
export interface WorkflowSetupResult {
  success: boolean;
  branchName?: string;
  worktreePath?: string;
  error?: string;
}

/**
 * Execute git setup steps (branch, worktree) using the workflow engine
 */
export async function executeGitSetup(
  options: WorkflowSetupOptions
): Promise<WorkflowSetupResult> {
  const { workItem, config, workspace, logger, signal } = options;

  try {
    const db = await getDb();
    await initializePredefinedWorkflows(db);

    const executionId = `setup-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    const jobId = `job-${Date.now()}`;
    const workflowId = "git-setup";

    const context: WorkflowContext = {
      workflowId,
      workItemId: workItem.id,
      repoPath: workspace,
      repoUrl: workItem.repositoryUrl || "",
      branchName: "",
      defaultBranch: "main",
      gitConfig: {
        repoPath: workspace,
        repoUrl: workItem.repositoryUrl || "",
        gitUserName: "OpenFarm Task Loop",
        gitUserEmail: "task-loop@openfarm.local",
      },
      workItem: {
        id: workItem.id,
        title: workItem.title,
        description: workItem.description,
        acceptanceCriteria: workItem.acceptanceCriteria || "",
        workItemType: workItem.workItemType,
        source: workItem.source,
        status: workItem.status,
        assignedAgentId: config.provider,
        assignee: undefined,
        project: workItem.project,
      },
      jobId,
      executionId,
      workflowVariables: {
        task: workItem.title,
        provider: config.provider,
        model: config.model,
      },
    };

    const request: WorkflowExecutionRequest = {
      executionId,
      jobId,
      workflowId,
      workItemId: workItem.id,
      context,
      previewMode: false,
      agentConfig: {
        provider: config.provider,
        model: config.model,
      },
    };

    const eventBus = new InMemoryEventBus();

    // Step executor that only handles git operations
    const stepExecutor: StepExecutor = {
      execute: async (stepRequest, executionContext) => {
        const { action, params } = stepRequest;

        if (signal?.aborted) {
          throw new Error("CANCELLED");
        }

        // Handle git.branch action
        if (action === "git.branch") {
          const { execSync } = await import("node:child_process");
          const pattern = params?.pattern as string;

          if (!pattern) {
            return {
              success: false,
              error: new Error("Git branch step requires 'pattern' parameter"),
            };
          }

          const branchName = pattern.replace("${Date.now()}", Date.now().toString());

          try {
            execSync(`git branch ${branchName}`, { cwd: workspace, stdio: "pipe" });
            executionContext.context.branchName = branchName;
            await logger?.info(`Created branch: ${branchName}`);
            return { success: true, value: branchName };
          } catch (error) {
            return {
              success: false,
              error: new Error(`Failed to create branch: ${error}`),
            };
          }
        }

        // Handle git.worktree action
        if (action === "git.worktree") {
          const { createWorktree } = await import("@openfarm/git-worktree");
          const { tmpdir } = await import("node:os");
          const { mkdirSync, existsSync } = await import("node:fs");
          const { join } = await import("node:path");
          const { execSync } = await import("node:child_process");

          const operation = params?.operation as string;
          if (operation !== "create") {
            return {
              success: false,
              error: new Error("Only 'create' operation is supported"),
            };
          }

          const branchName = executionContext.context.branchName;
          if (!branchName) {
            return {
              success: false,
              error: new Error("No branch name found in context"),
            };
          }

          const timestamp = Date.now();
          const worktreeParent = join(tmpdir(), `openfarm-worktree-${timestamp}`);
          const worktreePath = join(worktreeParent, "work");

          if (!existsSync(worktreeParent)) {
            mkdirSync(worktreeParent, { recursive: true });
          }

          const gitRoot = execSync("git rev-parse --show-toplevel", {
            cwd: workspace,
            encoding: "utf-8",
          }).trim();

          await logger?.info(`Creating worktree at: ${worktreePath}`);

          const worktreeResult = await createWorktree(gitRoot, {
            path: worktreePath,
            branch: branchName,
            createBranch: false,
          });

          if (!worktreeResult.ok) {
            return { success: false, error: worktreeResult.error };
          }

          executionContext.context.worktreePath = worktreeResult.value.path;
          await logger?.info(`Created worktree: ${worktreeResult.value.path}`);
          return { success: true, value: worktreeResult.value.path };
        }

        // Skip agent.code in setup
        if (action === "agent.code") {
          return { success: true, value: "skipped" };
        }

        return {
          success: false,
          error: new Error(`Unsupported action: ${action}`),
        };
      },
    };

    const engineConfig: WorkflowEngineConfig = {
      db,
      logger: {
        debug: async (message: string) => await logger?.debug(message),
        info: async (message: string) => await logger?.info(message),
        error: async (message: string) => await logger?.error(message),
      },
      eventBus,
      stepExecutor,
      errorHandler: {
        handle: async (error: unknown, ctx: any) => {
          const message = error instanceof Error ? error.message : String(error);
          await logger?.error(`Step ${ctx.stepId} failed: ${message}`);
        },
      },
      approvalHandler: {
        waitForApproval: async () => {
          throw new Error("Approval steps not supported");
        },
      },
    };

    const result = await executeWorkflow(request, engineConfig);

    return {
      success: result.success,
      branchName: context.branchName || undefined,
      worktreePath: context.worktreePath || undefined,
      error: result.error,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Cleanup git setup (remove branch, worktree)
 */
export async function cleanupGitSetup(
  workspace: string,
  branchName: string,
  worktreePath: string,
  logger?: TaskLoopLogger
): Promise<void> {
  try {
    const { execSync } = await import("node:child_process");
    const { rmSync } = await import("node:fs");
    const { removeWorktree } = await import("@openfarm/git-worktree");

    // Get git root
    const gitRoot = execSync("git rev-parse --show-toplevel", {
      cwd: workspace,
      encoding: "utf-8",
    }).trim();

    // Remove worktree
    if (worktreePath) {
      try {
        await removeWorktree(gitRoot, worktreePath, true);
        await logger?.info("Removed worktree");
      } catch (error) {
        await logger?.warn(`Failed to remove worktree: ${error}`);
      }
    }

    // Delete branch
    if (branchName) {
      try {
        execSync(`git branch -D ${branchName}`, { cwd: workspace, stdio: "pipe" });
        await logger?.info(`Deleted branch: ${branchName}`);
      } catch (error) {
        await logger?.warn(`Failed to delete branch: ${error}`);
      }
    }
  } catch (error) {
    await logger?.error(`Cleanup error: ${error}`);
  }
}

/**
 * Get available workflows
 */
export async function getAvailableWorkflows(): Promise<
  Array<{ id: string; name: string; description?: string }>
> {
  const db = await getDb();
  await initializePredefinedWorkflows(db);
  const workflows = await getWorkflows(db);

  return workflows.map((w) => ({
    id: w.id,
    name: w.name || w.id,
    description: w.description,
  }));
}
