// Use any type to avoid importing from bun during bundling
type SQL = any;

import { err, ok, type Result } from "@openfarm/result";
import type { WorkflowExecution } from "../../../types";
import { toJson } from "../../utils";
import { getWorkflowExecution } from "./queries";

/**
 * Adds a new workflow execution to the database.
 * This is a pure function that receives the database instance.
 *
 * @param db - The SQL database instance
 * @param execution - The workflow execution to add
 * @param jobIdToLink - Optional job ID to link the execution to
 * @param existingTransaction - Optional existing transaction to use
 * @returns Result indicating success or failure
 */
export async function addWorkflowExecution(
  db: SQL,
  execution: WorkflowExecution,
  jobIdToLink?: string,
  existingTransaction?: SQL
): Promise<Result<void>> {
  try {
    // Extract transaction logic to a reusable function
    const executeInTransaction = async (tx: SQL) => {
      // Check if there's already a running execution for this work item
      if (execution.status === "running") {
        const existingRows = (await tx`
          SELECT id, updated_at, job_id FROM workflow_executions 
          WHERE work_item_id = ${execution.workItemId} 
            AND status = 'running'
          LIMIT 1
        `) as Array<{ id: string; updated_at: string; job_id: string }>;

        if (existingRows.length > 0) {
          const [existingExecution] = existingRows;
          if (!existingExecution) {
            return;
          }
          // Check if the existing execution is stale (not updated in the last 5 minutes)
          const executionUpdatedAt = new Date(
            existingExecution.updated_at
          ).getTime();
          const now = Date.now();
          const minutesSinceUpdate = (now - executionUpdatedAt) / (1000 * 60);

          const { STALE_THRESHOLD_MINUTES } = await import(
            "../../../constants"
          );
          if (minutesSinceUpdate > STALE_THRESHOLD_MINUTES) {
            // Execution is stale - mark it as failed within the same transaction
            const nowISO = new Date().toISOString();
            await tx`
              UPDATE workflow_executions 
              SET status = 'failed', 
                  completed_at = ${nowISO}, 
                  updated_at = ${nowISO}
              WHERE id = ${existingExecution.id}
            `;

            // P0.1: Synchronize associated Job to keep state consistent
            if (existingExecution.job_id) {
              const { updateJob } = await import("../../jobs");
              const { JobStatus } = await import("../../../constants");
              const jobUpdateResult = await updateJob(
                db,
                existingExecution.job_id,
                (job) => ({
                  ...job,
                  status: JobStatus.FAILED,
                  result: "Workflow execution was stale and marked as failed",
                  completedAt: nowISO,
                }),
                tx
              );
              if (!jobUpdateResult.ok) {
                console.error(
                  `[addWorkflowExecution] Failed to update job ${existingExecution.job_id} for stale execution ${existingExecution.id}:`,
                  jobUpdateResult.error.message
                );
                // Don't throw - job update is secondary to execution recovery
              }
            }
            // Continue with creating the new execution
          } else {
            // Execution is active - reject the request
            throw new Error(
              `A workflow execution is already running for work item ${execution.workItemId} (execution: ${existingExecution.id})`
            );
          }
        }
      }

      // Insert the new execution
      await tx`
            INSERT INTO workflow_executions (
                id, workflow_id, work_item_id, job_id, status, current_step_id,
                step_results, plan, waiting_message, worktree_path, branch_name, resume_job_id, created_at, updated_at, completed_at
            ) VALUES (
                ${execution.id}, ${execution.workflowId}, ${execution.workItemId}, 
                ${execution.jobId}, ${execution.status}, ${execution.currentStepId || null},
                ${toJson(execution.stepResults)}, ${execution.plan ? toJson(execution.plan) : null}, 
                ${execution.waitingMessage || null},
                ${execution.worktreePath || null}, ${execution.branchName || null},
                ${execution.resumeJobId || null}, ${execution.createdAt}, ${execution.updatedAt}, ${execution.completedAt || null}
            )
        `;

      // Atomically link execution to job if jobIdToLink is provided
      if (jobIdToLink) {
        const { updateJob } = await import("../../jobs");
        const { getJob } = await import("../../jobs");
        const currentJob = await getJob(tx, jobIdToLink);
        if (currentJob) {
          const linkResult = await updateJob(
            tx,
            jobIdToLink,
            (job) => ({
              ...job,
              workflowExecutionId: execution.id,
            }),
            tx
          );
          if (!linkResult.ok) {
            throw new Error(
              `Failed to link execution to job: ${linkResult.error.message}`
            );
          }
        }
      }
    };

    // Use existing transaction if provided, otherwise create a new one
    if (existingTransaction) {
      await executeInTransaction(existingTransaction);
    } else {
      await db.begin(async (tx: SQL) => {
        await executeInTransaction(tx);
      });
    }

    return ok(undefined);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    // Check if this is a duplicate execution error
    if (
      errorMessage.includes("already running") ||
      errorMessage.includes("UNIQUE constraint") ||
      errorMessage.includes("Failed to link execution to job")
    ) {
      return err(new Error(errorMessage));
    }
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Updates an existing workflow execution in the database.
 * Uses an updater function pattern for immutability.
 * This is a pure function that receives the database instance.
 *
 * @param db - The SQL database instance
 * @param executionId - The ID of the execution to update
 * @param updater - Function that receives the current execution and returns the updated execution
 * @param existingTransaction - Optional existing transaction to use. If provided, the update will be executed within this transaction instead of creating a new one.
 * @returns Result indicating success or failure
 */
export async function updateWorkflowExecution(
  db: SQL,
  executionId: string,
  updater: (execution: WorkflowExecution) => WorkflowExecution,
  existingTransaction?: SQL
): Promise<Result<void>> {
  try {
    // Extract update logic to a reusable function
    const executeUpdate = async (tx: SQL) => {
      const currentExecution = await getWorkflowExecution(tx, executionId);
      if (!currentExecution) {
        throw new Error(`Workflow execution not found: ${executionId}`);
      }

      const updatedExecution = updater(currentExecution);

      await tx`
            UPDATE workflow_executions SET
                workflow_id = ${updatedExecution.workflowId}, 
                work_item_id = ${updatedExecution.workItemId}, 
                job_id = ${updatedExecution.jobId}, 
                status = ${updatedExecution.status},
                current_step_id = ${updatedExecution.currentStepId || null}, 
                step_results = ${toJson(updatedExecution.stepResults)}, 
                plan = ${updatedExecution.plan ? toJson(updatedExecution.plan) : null},
                waiting_message = ${updatedExecution.waitingMessage || null},
                worktree_path = ${updatedExecution.worktreePath || null},
                branch_name = ${updatedExecution.branchName || null},
                resume_job_id = ${updatedExecution.resumeJobId || null},
                updated_at = ${updatedExecution.updatedAt}, 
                completed_at = ${updatedExecution.completedAt || null}
            WHERE id = ${executionId}
        `;
    };

    // Use existing transaction if provided, otherwise create a new one
    // Use transaction to ensure atomicity and prevent race conditions
    if (existingTransaction) {
      await executeUpdate(existingTransaction);
    } else {
      await db.begin(async (tx: SQL) => {
        await executeUpdate(tx);
      });
    }

    return ok(undefined);
  } catch (error) {
    // Check for SQLite busy/locked errors
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (
      errorMessage.includes("SQLITE_BUSY") ||
      errorMessage.includes("locked")
    ) {
      return err(
        new Error(
          `Database is locked. This may indicate high concurrency. Retry the operation. Original error: ${errorMessage}`
        )
      );
    }
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}
