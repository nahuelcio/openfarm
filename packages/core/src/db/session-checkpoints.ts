// Use any type to avoid importing from bun during bundling
type SQL = any;

import { parseJson, toJson } from "./utils";

export type SessionCheckpointType = "task-loop";
export type SessionCheckpointStatus =
  | "idle"
  | "running"
  | "paused"
  | "completed"
  | "failed"
  | "resuming";

interface SessionCheckpointRow {
  session_id: string;
  session_type: string;
  status: string;
  current_task_id: string | null;
  current_task_title: string | null;
  completed_tasks: number;
  failed_tasks: number;
  total_tasks: number;
  started_at: string;
  updated_at: string;
  resumed_from_id: string | null;
  metadata: string | null;
}

export interface SessionCheckpoint {
  sessionId: string;
  sessionType: SessionCheckpointType;
  status: SessionCheckpointStatus;
  currentTaskId?: string;
  currentTaskTitle?: string;
  completedTasks: number;
  failedTasks: number;
  totalTasks: number;
  startedAt: string;
  updatedAt: string;
  resumedFromId?: string;
  metadata?: Record<string, unknown>;
}

export interface UpsertSessionCheckpointInput {
  sessionId: string;
  sessionType: SessionCheckpointType;
  status: SessionCheckpointStatus;
  currentTaskId?: string;
  currentTaskTitle?: string;
  completedTasks: number;
  failedTasks: number;
  totalTasks: number;
  startedAt: string;
  updatedAt?: string;
  resumedFromId?: string;
  metadata?: Record<string, unknown>;
}

function rowToSessionCheckpoint(row: SessionCheckpointRow): SessionCheckpoint {
  return {
    sessionId: row.session_id,
    sessionType: row.session_type as SessionCheckpointType,
    status: row.status as SessionCheckpointStatus,
    currentTaskId: row.current_task_id || undefined,
    currentTaskTitle: row.current_task_title || undefined,
    completedTasks: row.completed_tasks,
    failedTasks: row.failed_tasks,
    totalTasks: row.total_tasks,
    startedAt: row.started_at,
    updatedAt: row.updated_at,
    resumedFromId: row.resumed_from_id || undefined,
    metadata: parseJson<Record<string, unknown>>(row.metadata) || undefined,
  };
}

export async function upsertSessionCheckpoint(
  db: SQL,
  input: UpsertSessionCheckpointInput
): Promise<void> {
  const updatedAt = input.updatedAt || new Date().toISOString();

  await db`
    INSERT INTO session_checkpoints (
      session_id,
      session_type,
      status,
      current_task_id,
      current_task_title,
      completed_tasks,
      failed_tasks,
      total_tasks,
      started_at,
      updated_at,
      resumed_from_id,
      metadata
    ) VALUES (
      ${input.sessionId},
      ${input.sessionType},
      ${input.status},
      ${input.currentTaskId || null},
      ${input.currentTaskTitle || null},
      ${input.completedTasks},
      ${input.failedTasks},
      ${input.totalTasks},
      ${input.startedAt},
      ${updatedAt},
      ${input.resumedFromId || null},
      ${toJson(input.metadata)}
    )
    ON CONFLICT(session_id) DO UPDATE SET
      session_type = EXCLUDED.session_type,
      status = EXCLUDED.status,
      current_task_id = EXCLUDED.current_task_id,
      current_task_title = EXCLUDED.current_task_title,
      completed_tasks = EXCLUDED.completed_tasks,
      failed_tasks = EXCLUDED.failed_tasks,
      total_tasks = EXCLUDED.total_tasks,
      started_at = EXCLUDED.started_at,
      updated_at = EXCLUDED.updated_at,
      resumed_from_id = EXCLUDED.resumed_from_id,
      metadata = EXCLUDED.metadata
  `;
}

export async function getSessionCheckpoint(
  db: SQL,
  sessionId: string
): Promise<SessionCheckpoint | null> {
  const rows = (await db`
    SELECT * FROM session_checkpoints
    WHERE session_id = ${sessionId}
    LIMIT 1
  `) as SessionCheckpointRow[];

  if (rows.length === 0) {
    return null;
  }

  return rowToSessionCheckpoint(rows[0]);
}

export async function getResumableSessionCheckpoints(
  db: SQL,
  sessionType: SessionCheckpointType = "task-loop",
  limit = 10
): Promise<SessionCheckpoint[]> {
  const rows = (await db`
    SELECT * FROM session_checkpoints
    WHERE session_type = ${sessionType}
      AND status IN ('running', 'paused', 'resuming')
    ORDER BY updated_at DESC
    LIMIT ${limit}
  `) as SessionCheckpointRow[];

  return rows.map(rowToSessionCheckpoint);
}

export async function deleteSessionCheckpoint(
  db: SQL,
  sessionId: string
): Promise<void> {
  await db`
    DELETE FROM session_checkpoints
    WHERE session_id = ${sessionId}
  `;
}
