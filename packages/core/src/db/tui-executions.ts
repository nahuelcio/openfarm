// Use any type to avoid importing from bun during bundling
type SQL = any;

import { err, ok, type Result } from "@openfarm/result";
import { parseJson, toJson } from "./utils";

// Type for database row results
interface TuiExecutionRow {
  id: string;
  task: string;
  provider: string;
  model: string | null;
  workspace: string;
  workflow_id: string | null;
  status: string;
  started_at: string;
  completed_at: string | null;
  duration: number | null;
  output: string | null;
  error: string | null;
  tokens_used: number | null;
  files_modified: string | null;
  diff: string | null;
  created_at: string;
  updated_at: string;
}

// Type for TUI execution
export interface TuiExecution {
  id: string;
  task: string;
  provider: string;
  model?: string;
  workspace: string;
  workflowId?: string;
  status: "pending" | "running" | "completed" | "failed";
  startedAt: Date;
  completedAt?: Date;
  duration?: number;
  output?: string;
  error?: string;
  tokensUsed?: number;
  filesModified?: string[];
  diff?: string;
}

/**
 * Converts a database row to a TuiExecution object
 */
function rowToExecution(row: TuiExecutionRow): TuiExecution {
  return {
    id: row.id,
    task: row.task,
    provider: row.provider,
    model: row.model || undefined,
    workspace: row.workspace,
    workflowId: row.workflow_id || undefined,
    status: row.status as TuiExecution["status"],
    startedAt: new Date(row.started_at),
    completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
    duration: row.duration !== null ? row.duration : undefined,
    output: row.output || undefined,
    error: row.error || undefined,
    tokensUsed: row.tokens_used !== null ? row.tokens_used : undefined,
    filesModified: parseJson<string[]>(row.files_modified) || undefined,
    diff: row.diff || undefined,
  };
}

/**
 * Retrieves TUI executions from the database
 */
export async function getTuiExecutions(
  db: SQL,
  limit = 100
): Promise<TuiExecution[]> {
  const rows =
    (await db`SELECT * FROM tui_executions ORDER BY started_at DESC LIMIT ${limit}`) as TuiExecutionRow[];
  return rows.map(rowToExecution);
}

/**
 * Retrieves a single TUI execution by ID
 */
export async function getTuiExecutionById(
  db: SQL,
  id: string
): Promise<TuiExecution | null> {
  const rows =
    (await db`SELECT * FROM tui_executions WHERE id = ${id}`) as TuiExecutionRow[];
  const row = rows[0];
  if (!row) {
    return null;
  }
  return rowToExecution(row);
}

/**
 * Creates a new TUI execution in the database
 */
export async function createTuiExecution(
  db: SQL,
  execution: TuiExecution
): Promise<Result<void>> {
  try {
    const now = new Date().toISOString();
    await db`
      INSERT INTO tui_executions (
        id, task, provider, model, workspace, workflow_id,
        status, started_at, completed_at, duration, output, error,
        tokens_used, files_modified, diff, created_at, updated_at
      ) VALUES (
        ${execution.id}, ${execution.task}, ${execution.provider},
        ${execution.model || null}, ${execution.workspace},
        ${execution.workflowId || null}, ${execution.status},
        ${execution.startedAt.toISOString()},
        ${execution.completedAt?.toISOString() || null},
        ${execution.duration !== undefined ? execution.duration : null},
        ${execution.output || null}, ${execution.error || null},
        ${execution.tokensUsed !== undefined ? execution.tokensUsed : null},
        ${toJson(execution.filesModified)}, ${execution.diff || null},
        ${now}, ${now}
      )
    `;
    return ok(undefined);
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Updates an existing TUI execution in the database
 */
export async function updateTuiExecution(
  db: SQL,
  id: string,
  updates: Partial<TuiExecution>
): Promise<Result<void>> {
  try {
    const current = await getTuiExecutionById(db, id);
    if (!current) {
      return err(new Error(`TUI execution not found: ${id}`));
    }

    const updated: TuiExecution = {
      ...current,
      ...updates,
    };

    const now = new Date().toISOString();
    await db`
      UPDATE tui_executions SET
        task = ${updated.task},
        provider = ${updated.provider},
        model = ${updated.model || null},
        workspace = ${updated.workspace},
        workflow_id = ${updated.workflowId || null},
        status = ${updated.status},
        started_at = ${updated.startedAt.toISOString()},
        completed_at = ${updated.completedAt?.toISOString() || null},
        duration = ${updated.duration !== undefined ? updated.duration : null},
        output = ${updated.output || null},
        error = ${updated.error || null},
        tokens_used = ${updated.tokensUsed !== undefined ? updated.tokensUsed : null},
        files_modified = ${toJson(updated.filesModified)},
        diff = ${updated.diff || null},
        updated_at = ${now}
      WHERE id = ${id}
    `;
    return ok(undefined);
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Deletes a TUI execution from the database
 */
export async function deleteTuiExecution(
  db: SQL,
  id: string
): Promise<Result<void>> {
  try {
    await db`DELETE FROM tui_executions WHERE id = ${id}`;
    return ok(undefined);
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}
