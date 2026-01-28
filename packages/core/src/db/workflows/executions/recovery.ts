// Use any type to avoid importing from bun during bundling
type SQL = any;

import { err, ok, type Result } from "@openfarm/result";
import { StepStatus, WorkflowStatus } from "../../../constants";
import type { WorkflowExecution } from "../../../types";
import { updateWorkflowExecution } from "./mutations";
import { getWorkflowExecutions } from "./queries";

/**
 * Recovers stale workflow executions that have been running for too long.
 * This is a pure function that receives the database instance.
 *
 * @param db - The SQL database instance
 * @param staleThresholdMinutes - Number of minutes after which an execution is considered stale (default: 30)
 * @returns Result containing the number of recovered executions
 */
export async function recoverStaleWorkflowExecutions(
  db: SQL,
  staleThresholdMinutes = 30
): Promise<Result<number>> {
  try {
    let recoveredCount = 0;
    const now = new Date().toISOString();
    const thresholdMs = staleThresholdMinutes * 60 * 1000;
    const thresholdDate = new Date(Date.now() - thresholdMs).toISOString();

    const executions = await getWorkflowExecutions(db);

    for (const execution of executions) {
      if (
        execution.status === WorkflowStatus.RUNNING &&
        execution.updatedAt < thresholdDate
      ) {
        // Update step results immutably
        const updatedStepResults = execution.stepResults.map((sr) => {
          if (
            sr.stepId === execution.currentStepId &&
            sr.status === StepStatus.RUNNING
          ) {
            return {
              ...sr,
              status: StepStatus.FAILED,
              completedAt: now,
              error:
                "Workflow execution was interrupted (system restart or timeout)",
            };
          }
          return sr;
        });

        const updatedExecution: WorkflowExecution = {
          ...execution,
          status: WorkflowStatus.FAILED,
          updatedAt: now,
          completedAt: now,
          currentStepId: undefined,
          stepResults: updatedStepResults,
        };

        // P1.2: Update WorkflowExecution and Job atomically within same transaction
        await db.begin(async (tx: SQL) => {
          const updateResult = await updateWorkflowExecution(
            db,
            execution.id,
            () => updatedExecution,
            tx
          );

          if (!updateResult.ok) {
            throw new Error(
              `Failed to update execution ${execution.id}: ${updateResult.error.message}`
            );
          }

          // P1.2: Update Job atomically within same transaction
          if (execution.jobId) {
            const { updateJob } = await import("../../jobs");
            const { JobStatus } = await import("../../../constants");
            const jobUpdateResult = await updateJob(
              tx,
              execution.jobId,
              (job) => ({
                ...job,
                status: JobStatus.FAILED,
                result:
                  "Workflow execution was interrupted (system restart or timeout)",
                completedAt: now,
              }),
              tx
            );

            if (!jobUpdateResult.ok) {
              throw new Error(
                `Failed to update job ${execution.jobId}: ${jobUpdateResult.error.message}`
              );
            }
          }
        });

        recoveredCount++;
      }
    }

    return ok(recoveredCount);
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}
