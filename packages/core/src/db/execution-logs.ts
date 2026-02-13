// Use any type to avoid importing from bun during bundling
type SQL = any;

import { parseJson, toJson } from "./utils";

export type ExecutionLogLevel = "debug" | "info" | "warn" | "error";

interface ExecutionLogRow {
  id: number;
  session_id: string;
  timestamp: string;
  level: string;
  component: string;
  message: string;
  metadata: string | null;
}

export interface ExecutionLog {
  id: number;
  sessionId: string;
  timestamp: Date;
  level: ExecutionLogLevel;
  component: string;
  message: string;
  metadata?: Record<string, unknown>;
}

export interface CreateExecutionLogInput {
  sessionId: string;
  level: ExecutionLogLevel;
  component: string;
  message: string;
  metadata?: Record<string, unknown>;
  timestamp?: Date;
}

export interface GetExecutionLogsOptions {
  limit?: number;
  offset?: number;
  level?: ExecutionLogLevel;
  order?: "asc" | "desc";
}

function rowToExecutionLog(row: ExecutionLogRow): ExecutionLog {
  return {
    id: row.id,
    sessionId: row.session_id,
    timestamp: new Date(row.timestamp),
    level: row.level as ExecutionLogLevel,
    component: row.component,
    message: row.message,
    metadata: parseJson<Record<string, unknown>>(row.metadata) || undefined,
  };
}

export async function createExecutionLog(
  db: SQL,
  input: CreateExecutionLogInput
): Promise<void> {
  const timestamp = (input.timestamp || new Date()).toISOString();
  await db`
    INSERT INTO execution_logs (
      session_id, timestamp, level, component, message, metadata
    ) VALUES (
      ${input.sessionId},
      ${timestamp},
      ${input.level},
      ${input.component},
      ${input.message},
      ${toJson(input.metadata)}
    )
  `;
}

export async function getExecutionLogs(
  db: SQL,
  sessionId: string,
  options: GetExecutionLogsOptions = {}
): Promise<ExecutionLog[]> {
  const limit = options.limit ?? 500;
  const offset = options.offset ?? 0;
  const order = options.order === "asc" ? "ASC" : "DESC";

  const rows = options.level
    ? ((await db`
        SELECT * FROM execution_logs
        WHERE session_id = ${sessionId}
          AND level = ${options.level}
        ORDER BY timestamp ${order}
        LIMIT ${limit}
        OFFSET ${offset}
      `) as ExecutionLogRow[])
    : ((await db`
        SELECT * FROM execution_logs
        WHERE session_id = ${sessionId}
        ORDER BY timestamp ${order}
        LIMIT ${limit}
        OFFSET ${offset}
      `) as ExecutionLogRow[]);

  return rows.map(rowToExecutionLog);
}

export async function countExecutionLogs(
  db: SQL,
  sessionId: string
): Promise<number> {
  const rows = (await db`
    SELECT COUNT(*) as count
    FROM execution_logs
    WHERE session_id = ${sessionId}
  `) as Array<{ count: number }>;

  return Number(rows[0]?.count || 0);
}

export async function trimExecutionLogs(
  db: SQL,
  sessionId: string,
  maxEntries = 10_000,
  trimBatch = 1000
): Promise<number> {
  const total = await countExecutionLogs(db, sessionId);
  if (total <= maxEntries) {
    return 0;
  }

  const toDelete = Math.max(trimBatch, total - maxEntries);
  await db`
    DELETE FROM execution_logs
    WHERE id IN (
      SELECT id
      FROM execution_logs
      WHERE session_id = ${sessionId}
      ORDER BY timestamp ASC
      LIMIT ${toDelete}
    )
  `;

  return toDelete;
}
