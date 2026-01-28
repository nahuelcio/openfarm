// Use any type to avoid importing from bun during bundling
type SQL = any;

// Type for database row results
interface JobRow {
  id: string;
  bug_id: string;
  status: string;
  result: string | null;
  output: string | null;
  logs: string | null;
  chat: string | null;
  questions: string | null;
  current_question_id: string | null;
  changes: string | null;
  created_at: string;
  completed_at: string | null;
  execution_time_seconds: number | null;
  model: string | null;
  project: string | null;
  repository_url: string | null;
  work_item_title: string | null;
  work_item_description: string | null;
  workflow_execution_id: string | null;
}

import { err, ok, type Result } from "@openfarm/result";
import type { AgentQuestion, ChatMessage, Job } from "../types";
import { parseJson, toJson } from "./utils";

/**
 * Helper to get execution time seconds
 */
function getExecutionTimeSeconds(
  value: number | null | undefined
): number | undefined {
  return value !== null && value !== undefined ? value : undefined;
}

/**
 * Helper to parse optional JSON field
 */
function parseOptionalJson<T>(value: string | null): T | undefined {
  return value ? parseJson<T>(value) || undefined : undefined;
}

/**
 * Converts a database row to a Job object
 */
function rowToJob(row: JobRow): Job {
  return {
    id: row.id,
    bugId: row.bug_id,
    status: row.status as Job["status"],
    result: row.result || undefined,
    output: row.output || undefined,
    logs: parseJson<string[]>(row.logs) || [],
    chat: parseOptionalJson<ChatMessage[]>(row.chat),
    questions: parseOptionalJson<AgentQuestion[]>(row.questions),
    currentQuestionId: row.current_question_id || undefined,
    changes: parseOptionalJson<Job["changes"]>(row.changes),
    createdAt: row.created_at,
    completedAt: row.completed_at || undefined,
    executionTimeSeconds: getExecutionTimeSeconds(row.execution_time_seconds),
    model: row.model || undefined,
    project: row.project || undefined,
    repositoryUrl: row.repository_url || undefined,
    workItemTitle: row.work_item_title || undefined,
    workItemDescription: row.work_item_description || undefined,
    workflowExecutionId: row.workflow_execution_id || undefined,
  };
}

/**
 * Retrieves all jobs from the database.
 * This is a pure function that receives the database instance.
 *
 * @param db - The SQL database instance
 * @returns Array of all jobs
 *
 * @example
 * ```typescript
 * const jobs = await getJobs(db);
 * console.log(`Found ${jobs.length} jobs`);
 * ```
 */
export async function getJobs(db: SQL): Promise<Job[]> {
  const rows = (await db`SELECT * FROM jobs`) as JobRow[];
  return rows.map(rowToJob);
}

/**
 * Retrieves a single job by ID.
 * This is a pure function that receives the database instance.
 *
 * @param db - The SQL database instance
 * @param jobId - The ID of the job to retrieve
 * @returns The job if found, undefined otherwise
 *
 * @example
 * ```typescript
 * const job = await getJob(db, 'job-123');
 * if (job) {
 *   console.log(`Job status: ${job.status}`);
 * }
 * ```
 */
export async function getJob(db: SQL, jobId: string): Promise<Job | undefined> {
  const rows = (await db`SELECT * FROM jobs WHERE id = ${jobId}`) as JobRow[];
  const row = rows[0];
  if (!row) {
    return undefined;
  }

  return rowToJob(row);
}

/**
 * Adds a new job to the database.
 * This is a pure function that receives the database instance.
 *
 * @param db - The SQL database instance
 * @param job - The job to add
 * @returns Result indicating success or failure
 *
 * @example
 * ```typescript
 * const result = await addJob(db, {
 *   id: 'job-123',
 *   bugId: 'bug-456',
 *   status: 'pending',
 *   logs: [],
 *   createdAt: new Date().toISOString()
 * });
 *
 * if (result.ok) {
 *   console.log('Job added successfully');
 * }
 * ```
 */
export async function addJob(db: SQL, job: Job): Promise<Result<void>> {
  try {
    await db`
            INSERT INTO jobs (
                id, bug_id, status, result, logs, chat, questions, current_question_id,
                changes, created_at, completed_at, execution_time_seconds, model, project, repository_url,
                work_item_title, work_item_description, workflow_execution_id
            ) VALUES (
                ${job.id}, ${job.bugId}, ${job.status}, ${job.result || null}, 
                ${toJson(job.logs)}, ${toJson(job.chat)}, ${toJson(job.questions)}, 
                ${job.currentQuestionId || null}, ${toJson(job.changes)}, 
                ${job.createdAt}, ${job.completedAt || null}, ${job.executionTimeSeconds !== undefined ? job.executionTimeSeconds : null}, 
                ${job.model || null}, ${job.project || null}, ${job.repositoryUrl || null}, 
                ${job.workItemTitle || null}, ${job.workItemDescription || null}, 
                ${job.workflowExecutionId || null}
            )
        `;

    return ok(undefined);
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Updates an existing job in the database.
 * Uses an updater function pattern for immutability.
 * This is a pure function that receives the database instance.
 *
 * @param db - The SQL database instance
 * @param jobId - The ID of the job to update
 * @param updater - Function that receives the current job and returns the updated job
 * @param existingTransaction - Optional existing transaction to use. If provided, the update will be executed within this transaction instead of creating a new one.
 * @returns Result indicating success or failure
 *
 * @example
 * ```typescript
 * const result = await updateJob(db, 'job-123', (job) => ({
 *   ...job,
 *   status: 'completed',
 *   completedAt: new Date().toISOString()
 * }));
 * ```
 *
 * @example
 * ```typescript
 * // Using within an existing transaction
 * await db.begin(async (tx) => {
 *   await updateJob(db, 'job-123', (job) => ({
 *     ...job,
 *     status: 'completed'
 *   }), tx);
 * });
 * ```
 */
/**
 * P1.2: Merge arrays to prevent loss of concurrent updates
 * Merges new items into existing arrays instead of replacing them
 */
function mergeJobArrays(
  current: Job,
  updated: Job
): {
  logs: string[];
  chat?: ChatMessage[];
  changes?: Job["changes"];
} {
  const MAX_LOGS_TO_KEEP = 500;
  const currentLogs = current.logs || [];
  const updatedLogs = updated.logs || [];
  const mergedLogs = Array.from(
    new Set([...currentLogs, ...updatedLogs])
  ).slice(-MAX_LOGS_TO_KEEP);

  // Merge chat: combine arrays, deduplicate by timestamp+role+content
  const currentChat = current.chat || [];
  const updatedChat = updated.chat || [];
  const chatMap = new Map<string, ChatMessage>();

  // Add current chat messages
  for (const msg of currentChat) {
    const key = `${msg.timestamp}-${msg.role}-${msg.content.substring(0, 50)}`;
    chatMap.set(key, msg);
  }

  // Add/update with new chat messages
  for (const msg of updatedChat) {
    const key = `${msg.timestamp}-${msg.role}-${msg.content.substring(0, 50)}`;
    chatMap.set(key, msg);
  }

  const mergedChat = Array.from(chatMap.values());

  // Merge changes: combine arrays for each change type
  const currentChanges = current.changes || {};
  const updatedChanges = updated.changes || {};

  const mergedChanges: Job["changes"] = {
    filesModified: Array.from(
      new Set([
        ...(currentChanges.filesModified || []),
        ...(updatedChanges.filesModified || []),
      ])
    ),
    filesCreated: Array.from(
      new Set([
        ...(currentChanges.filesCreated || []),
        ...(updatedChanges.filesCreated || []),
      ])
    ),
    filesDeleted: Array.from(
      new Set([
        ...(currentChanges.filesDeleted || []),
        ...(updatedChanges.filesDeleted || []),
      ])
    ),
    // Diff and summary: use updated if provided, otherwise keep current
    diff: updatedChanges.diff || currentChanges.diff,
    summary: updatedChanges.summary || currentChanges.summary,
  };

  return {
    logs: mergedLogs,
    chat: mergedChat.length > 0 ? mergedChat : undefined,
    changes: Object.keys(mergedChanges).length > 0 ? mergedChanges : undefined,
  };
}

export async function updateJob(
  db: SQL,
  jobId: string,
  updater: (job: Job) => Job,
  existingTransaction?: SQL
): Promise<Result<void>> {
  try {
    // Extract update logic to a reusable function
    const executeUpdate = async (tx: SQL) => {
      const currentJob = await getJob(tx, jobId);
      if (!currentJob) {
        throw new Error(`Job not found: ${jobId}`);
      }

      const updatedJob = updater(currentJob);

      // Re-read to get latest state (in case of concurrent updates)
      const latestJob = await getJob(tx, jobId);
      if (!latestJob) {
        throw new Error(`Job not found: ${jobId}`);
      }

      // Merge arrays to prevent loss of concurrent updates
      const merged = mergeJobArrays(latestJob, updatedJob);

      // Use merged arrays, but prefer updated values for non-array fields
      const finalJob: Job = {
        ...updatedJob,
        logs: merged.logs,
        chat: merged.chat,
        changes: merged.changes,
      };

      await tx`
            UPDATE jobs SET
                bug_id = ${finalJob.bugId}, 
                status = ${finalJob.status}, 
                result = ${finalJob.result || null}, 
                output = ${finalJob.output || null}, 
                logs = ${toJson(finalJob.logs)}, 
                chat = ${toJson(finalJob.chat)}, 
                questions = ${toJson(finalJob.questions)},
                current_question_id = ${finalJob.currentQuestionId || null}, 
                changes = ${toJson(finalJob.changes)}, 
                completed_at = ${finalJob.completedAt || null}, 
                execution_time_seconds = ${finalJob.executionTimeSeconds !== undefined ? finalJob.executionTimeSeconds : null},
                model = ${finalJob.model || null},
                project = ${finalJob.project || null}, 
                repository_url = ${finalJob.repositoryUrl || null}, 
                work_item_title = ${finalJob.workItemTitle || null}, 
                work_item_description = ${finalJob.workItemDescription || null}, 
                workflow_execution_id = ${finalJob.workflowExecutionId || null}
            WHERE id = ${jobId}
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

/**
 * Deletes a job from the database.
 * This is a pure function that receives the database instance.
 *
 * @param db - The SQL database instance
 * @param jobId - The ID of the job to delete
 * @returns Result indicating success or failure
 *
 * @example
 * ```typescript
 * const result = await deleteJob(db, 'job-123');
 * if (result.ok) {
 *   console.log('Job deleted successfully');
 * }
 * ```
 */
export async function deleteJob(db: SQL, jobId: string): Promise<Result<void>> {
  try {
    // P3.1: Cascade delete - also delete associated WorkflowExecution
    await db.begin(async (tx: SQL) => {
      // Get job to find workflowExecutionId
      const job = await getJob(tx, jobId);
      if (job?.workflowExecutionId) {
        // Delete associated WorkflowExecution
        await tx`DELETE FROM workflow_executions WHERE id = ${job.workflowExecutionId}`;
      }
      // Delete the job
      await tx`DELETE FROM jobs WHERE id = ${jobId}`;
    });
    return ok(undefined);
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Deletes all jobs from the database.
 * This is a pure function that receives the database instance.
 * Also deletes associated WorkflowExecutions to prevent orphaned records.
 *
 * @param db - The SQL database instance
 * @returns Result indicating success or failure and the count of deleted jobs
 *
 * @example
 * ```typescript
 * const result = await deleteJobs(db);
 * if (result.ok) {
 *   console.log(`Deleted ${result.value} jobs`);
 * }
 * ```
 */
export async function deleteJobs(db: SQL): Promise<Result<number>> {
  try {
    // P1: Delete associated WorkflowExecutions to prevent orphaned records
    let deletedCount = 0;
    await db.begin(async (tx: SQL) => {
      const jobs = await getJobs(tx);
      deletedCount = jobs.length;
      const workflowExecutionIds = jobs
        .map((job) => job.workflowExecutionId)
        .filter((id): id is string => id !== undefined);

      if (workflowExecutionIds.length > 0) {
        // Delete all associated WorkflowExecutions
        for (const executionId of workflowExecutionIds) {
          await tx`DELETE FROM workflow_executions WHERE id = ${executionId}`;
        }
      }

      // Delete all jobs
      await tx`DELETE FROM jobs`;
    });

    return ok(deletedCount);
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}
