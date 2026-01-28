// Use any type to avoid importing from bun during bundling
type SQL = any;

import type { WorkflowExecution } from "../../../types";
import { parseJson } from "../../utils";
import type { WorkflowExecutionRow } from "../types";

/**
 * Maps a database row to a WorkflowExecution object
 */
function mapRowToExecution(row: WorkflowExecutionRow): WorkflowExecution {
  return {
    id: row.id,
    workflowId: row.workflow_id,
    workItemId: row.work_item_id,
    jobId: row.job_id,
    status: row.status as WorkflowExecution["status"],
    currentStepId: row.current_step_id || undefined,
    stepResults:
      parseJson<WorkflowExecution["stepResults"]>(row.step_results) || [],
    plan: parseJson<WorkflowExecution["plan"]>(row.plan) || undefined,
    waitingMessage: row.waiting_message || undefined,
    worktreePath: row.worktree_path || undefined,
    branchName: row.branch_name || undefined,
    resumeJobId: row.resume_job_id || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at || undefined,
  };
}

/**
 * Retrieves all workflow executions from the database.
 * This is a pure function that receives the database instance.
 *
 * @param db - The SQL database instance
 * @returns Array of all workflow executions
 */
export async function getWorkflowExecutions(
  db: SQL
): Promise<WorkflowExecution[]> {
  const rows =
    (await db`SELECT * FROM workflow_executions`) as WorkflowExecutionRow[];
  return rows.map(mapRowToExecution);
}

/**
 * Retrieves a single workflow execution by ID.
 * This is a pure function that receives the database instance.
 *
 * @param db - The SQL database instance
 * @param executionId - The ID of the execution to retrieve
 * @returns The execution if found, undefined otherwise
 */
export async function getWorkflowExecution(
  db: SQL,
  executionId: string
): Promise<WorkflowExecution | undefined> {
  const rows =
    (await db`SELECT * FROM workflow_executions WHERE id = ${executionId}`) as WorkflowExecutionRow[];
  const row = rows[0];
  if (!row) {
    return undefined;
  }

  return mapRowToExecution(row);
}

/**
 * Retrieves a running workflow execution for a specific work item.
 * This is a pure function that receives the database instance.
 *
 * @param db - The SQL database instance
 * @param workItemId - The ID of the work item to check
 * @returns The most recent running execution if found, undefined otherwise
 */
export async function getRunningWorkflowExecutionByWorkItemId(
  db: SQL,
  workItemId: string
): Promise<WorkflowExecution | undefined> {
  const rows = (await db`
      SELECT * FROM workflow_executions 
      WHERE work_item_id = ${workItemId} 
        AND status = 'running'
      ORDER BY created_at DESC
      LIMIT 1
    `) as WorkflowExecutionRow[];

  const row = rows[0];
  if (!row) {
    return undefined;
  }

  return mapRowToExecution(row);
}

/**
 * Retrieves a running workflow execution by worktree path.
 * This is a pure function that receives the database instance.
 *
 * @param db - The SQL database instance
 * @param worktreePath - The worktree path to check
 * @returns The running execution if found, undefined otherwise
 */
export async function getRunningWorkflowExecutionByWorktreePath(
  db: SQL,
  worktreePath: string
): Promise<WorkflowExecution | undefined> {
  const rows = (await db`
      SELECT * FROM workflow_executions 
      WHERE worktree_path = ${worktreePath} 
        AND status = 'running'
      ORDER BY created_at DESC
      LIMIT 1
    `) as WorkflowExecutionRow[];

  const row = rows[0];
  if (!row) {
    return undefined;
  }

  return mapRowToExecution(row);
}
