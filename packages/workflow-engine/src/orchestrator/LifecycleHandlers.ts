/**
 * Workflow Lifecycle Handlers
 *
 * Framework-agnostic lifecycle management for workflow completion, cleanup, and cancellation.
 * Depends on injected DB and EventBus, not on Inngest or SSE.
 */

import type { WorkflowContext } from "@openfarm/agent-runner";
import { StepStatus, WorkflowStatus } from "@openfarm/core/constants/status";
import type { Database } from "@openfarm/core/db";
import {
  getJob,
  getWorkflowExecution,
  updateJob,
  updateWorkflowExecution,
} from "@openfarm/core/db";
import { createWorkflowCompletedEvent } from "../events";
import type { EventBus } from "../types";

/**
 * Finish workflow execution successfully
 * Updates execution and job status, emits completion event
 */
export async function finishWorkflowExecution(
  db: Database,
  context: WorkflowContext,
  jobId: string,
  eventBus: EventBus
): Promise<void> {
  const now = new Date().toISOString();

  // Get execution to count steps
  const finalExecution = await getWorkflowExecution(db, context.executionId);
  const completedSteps =
    finalExecution?.stepResults.filter(
      (sr) => sr.status === StepStatus.COMPLETED
    ).length || 0;
  const totalSteps = finalExecution?.stepResults.length || 0;

  // Update workflowExecution to completed
  await updateWorkflowExecution(db, context.executionId, (e) => ({
    ...e,
    status: WorkflowStatus.COMPLETED,
    currentStepId: undefined,
    completedAt: now,
  }));

  // Update job with completion status
  const { JobStatus } = await import("@openfarm/core/constants/status");
  await updateJob(db, jobId, (j) => ({
    ...j,
    status: JobStatus.COMPLETED,
    completedAt: now,
  }));

  // Emit workflow.completed event
  try {
    const startTime = finalExecution?.createdAt || now;
    const executionTimeSeconds = finalExecution?.createdAt
      ? (new Date(now).getTime() - new Date(startTime).getTime()) / 1000
      : undefined;

    const job = await getJob(db, jobId);
    const event = createWorkflowCompletedEvent(context.executionId, {
      result: job?.result,
      executionTimeSeconds,
      completedSteps,
      totalSteps,
    });

    await eventBus.emit(event);
  } catch (eventError) {
    console.error(
      "[Execute Workflow] Failed to emit workflow.completed event:",
      eventError
    );
  }
}

/**
 * Handle workflow cancellation
 * Updates job and execution status with cancellation
 */
export async function handleCancellation(
  db: Database,
  jobId: string,
  executionId?: string
): Promise<void> {
  const job = await getJob(db, jobId);
  if (!job) {
    return;
  }

  const { JobStatus } = await import("@openfarm/core/constants/status");
  const now = new Date().toISOString();

  await updateJob(db, jobId, (j) => ({
    ...j,
    status: JobStatus.CANCELLED,
    completedAt: now,
    logs: [...(j.logs || []), `[${now}] Job cancelled by user`].slice(-2000),
  }));

  // Also update workflow execution if it exists
  const execId = executionId || job.workflowExecutionId;
  if (execId) {
    const execution = await getWorkflowExecution(db, execId);
    if (execution) {
      await updateWorkflowExecution(db, execId, (e) => ({
        ...e,
        status: WorkflowStatus.CANCELLED,
        completedAt: now,
      }));
    }
  }
}

/**
 * Cleanup workflow resources
 * Removes worktree if it exists (only for non-pod executions)
 */
export async function cleanupWorkflowResources(
  context: WorkflowContext
): Promise<void> {
  const { worktreePath, podName, repoUrl } = context;
  const workDir =
    context.agentConfig?.workDir ||
    process.env.WORK_DIR ||
    "/tmp/minions-repos";

  // Skip cleanup if no worktree path or if running in pod
  if (!worktreePath || podName) {
    return;
  }

  const getRepoNameFromUrl = (urlOrPath: string): string => {
    try {
      const parsed = new URL(urlOrPath);
      const parts = parsed.pathname.split("/").filter(Boolean);
      const last = parts.at(-1) || "repo";
      return last.replace(/\.git$/u, "");
    } catch {
      const parts = urlOrPath.split("/").filter(Boolean);
      const last = parts.at(-1) || "repo";
      return last.replace(/\.git$/u, "");
    }
  };

  const repoName = getRepoNameFromUrl(repoUrl);
  const mainRepoPath = `${workDir}/${repoName}`;

  try {
    const { removeWorktree } = await import("@openfarm/agent-runner");
    await removeWorktree(mainRepoPath, worktreePath);
    console.log(`Worktree cleanup attempted: ${worktreePath}`);
  } catch (cleanupError) {
    console.warn("Error during worktree cleanup:", cleanupError);
  }
}
