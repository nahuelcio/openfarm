/**
 * Session Manager
 *
 * Manages persistence of task loop sessions.
 * Allows resuming execution after crashes or interruptions.
 */

// Use any type to avoid importing from bun during bundling
type SQL = any;

import {
  deleteSessionCheckpoint,
  upsertSessionCheckpoint,
} from "@openfarm/core/db/session-checkpoints";
import type {
  TaskLoopConfig,
  TaskLoopSession,
  TaskLoopSessionRow,
  TaskLoopSessionStatus,
} from "./types";

const MAX_LOG_ENTRIES = 1000;

function safeJsonParse<T>(value: string, fallback: T, label: string): T {
  try {
    return JSON.parse(value) as T;
  } catch (error) {
    console.warn(`[TaskLoop] Failed to parse ${label}:`, error);
    return fallback;
  }
}

/**
 * Generate a unique session ID
 */
export function generateSessionId(): string {
  return `tls-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Serialize session to database row
 */
function serializeSession(session: TaskLoopSession): TaskLoopSessionRow {
  return {
    id: session.id,
    status: session.status,
    config: JSON.stringify(session.config),
    tasks: JSON.stringify(session.tasks),
    current_task_index: session.currentTaskIndex,
    completed_tasks: session.completedTasks,
    failed_tasks: session.failedTasks,
    skipped_tasks: session.skippedTasks,
    started_at: session.startedAt,
    updated_at: session.updatedAt,
    completed_at: session.completedAt || null,
    logs: JSON.stringify(session.logs),
    metadata: session.metadata ? JSON.stringify(session.metadata) : null,
  };
}

/**
 * Deserialize session from database row
 */
function deserializeSession(row: TaskLoopSessionRow): TaskLoopSession {
  return {
    id: row.id,
    status: row.status as TaskLoopSessionStatus,
    config: safeJsonParse(row.config, {} as TaskLoopConfig, "config"),
    tasks: safeJsonParse(row.tasks, [], "tasks"),
    currentTaskIndex: row.current_task_index,
    completedTasks: row.completed_tasks,
    failedTasks: row.failed_tasks,
    skippedTasks: row.skipped_tasks,
    startedAt: row.started_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at || undefined,
    logs: safeJsonParse(row.logs, [], "logs"),
    metadata: row.metadata
      ? safeJsonParse(row.metadata, undefined, "metadata")
      : undefined,
  };
}

async function persistCheckpoint(
  db: SQL,
  session: TaskLoopSession
): Promise<void> {
  const currentTask = session.tasks[session.currentTaskIndex];

  await upsertSessionCheckpoint(db, {
    sessionId: session.id,
    sessionType: "task-loop",
    status: session.status,
    currentTaskId: currentTask?.id,
    currentTaskTitle: currentTask?.title,
    completedTasks: session.completedTasks,
    failedTasks: session.failedTasks,
    totalTasks: session.tasks.length,
    startedAt: session.startedAt,
    updatedAt: session.updatedAt,
    metadata: {
      currentTaskIndex: session.currentTaskIndex,
      skippedTasks: session.skippedTasks,
    },
  });
}

/**
 * Create a new session
 */
export function createSession(
  config: TaskLoopConfig,
  sessionId?: string
): TaskLoopSession {
  const now = new Date().toISOString();
  return {
    id: sessionId || generateSessionId(),
    status: "idle",
    config,
    tasks: [],
    currentTaskIndex: 0,
    completedTasks: 0,
    failedTasks: 0,
    skippedTasks: 0,
    startedAt: now,
    updatedAt: now,
    logs: [],
  };
}

/**
 * Save session to database
 */
export async function saveSession(
  db: SQL,
  session: TaskLoopSession
): Promise<void> {
  const row = serializeSession(session);

  await db`
    INSERT INTO task_loop_sessions (
      id, status, config, tasks, current_task_index,
      completed_tasks, failed_tasks, skipped_tasks,
      started_at, updated_at, completed_at, logs, metadata
    ) VALUES (
      ${row.id}, ${row.status}, ${row.config}, ${row.tasks}, ${row.current_task_index},
      ${row.completed_tasks}, ${row.failed_tasks}, ${row.skipped_tasks},
      ${row.started_at}, ${row.updated_at}, ${row.completed_at}, ${row.logs}, ${row.metadata}
    )
    ON CONFLICT (id) DO UPDATE SET
      status = EXCLUDED.status,
      config = EXCLUDED.config,
      tasks = EXCLUDED.tasks,
      current_task_index = EXCLUDED.current_task_index,
      completed_tasks = EXCLUDED.completed_tasks,
      failed_tasks = EXCLUDED.failed_tasks,
      skipped_tasks = EXCLUDED.skipped_tasks,
      updated_at = EXCLUDED.updated_at,
      completed_at = EXCLUDED.completed_at,
      logs = EXCLUDED.logs,
      metadata = EXCLUDED.metadata
  `;
}

/**
 * Get session by ID
 */
export async function getSession(
  db: SQL,
  sessionId: string
): Promise<TaskLoopSession | undefined> {
  const rows = await db`
    SELECT * FROM task_loop_sessions WHERE id = ${sessionId}
  `;

  if (rows.length === 0) {
    return undefined;
  }

  return deserializeSession(rows[0] as TaskLoopSessionRow);
}

/**
 * Get all active (non-completed) sessions
 */
export async function getActiveSessions(db: SQL): Promise<TaskLoopSession[]> {
  const rows = await db`
    SELECT * FROM task_loop_sessions
    WHERE status NOT IN ('completed', 'failed')
    ORDER BY updated_at DESC
  `;

  return rows.map((r: TaskLoopSessionRow) => deserializeSession(r));
}

/**
 * Get recent sessions
 */
export async function getRecentSessions(
  db: SQL,
  limit = 10
): Promise<TaskLoopSession[]> {
  const rows = await db`
    SELECT * FROM task_loop_sessions
    ORDER BY updated_at DESC
    LIMIT ${limit}
  `;

  return rows.map((r: TaskLoopSessionRow) => deserializeSession(r));
}

/**
 * Delete a session
 */
export async function deleteSession(db: SQL, sessionId: string): Promise<void> {
  await db`
    DELETE FROM task_loop_sessions WHERE id = ${sessionId}
  `;
}

/**
 * Add log entry to session
 */
export async function addSessionLog(
  db: SQL,
  sessionId: string,
  message: string
): Promise<void> {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message}`;

  await db`
    UPDATE task_loop_sessions
    SET logs = CASE
        WHEN json_array_length(logs) >= ${MAX_LOG_ENTRIES}
          THEN json_remove(json_insert(logs, '$[#]', ${logEntry}), '$[0]')
        ELSE json_insert(logs, '$[#]', ${logEntry})
      END,
      updated_at = ${timestamp}
    WHERE id = ${sessionId}
  `;
}

/**
 * Update session status
 */
export async function updateSessionStatus(
  db: SQL,
  sessionId: string,
  status: TaskLoopSessionStatus
): Promise<void> {
  const now = new Date().toISOString();

  await db`
    UPDATE task_loop_sessions
    SET status = ${status},
        updated_at = ${now}
        ${status === "completed" || status === "failed" ? `, completed_at = ${now}` : ""}
    WHERE id = ${sessionId}
  `;
}

/**
 * SessionManager class for easier state management
 */
export class SessionManager {
  private currentSession: TaskLoopSession | null = null;

  constructor(private readonly db: SQL) {}

  /**
   * Create and save a new session
   */
  async create(
    config: TaskLoopConfig,
    sessionId?: string
  ): Promise<TaskLoopSession> {
    const session = createSession(config, sessionId);
    await saveSession(this.db, session);
    await persistCheckpoint(this.db, session);
    this.currentSession = session;
    return session;
  }

  /**
   * Load an existing session
   */
  async load(sessionId: string): Promise<TaskLoopSession | undefined> {
    const session = await getSession(this.db, sessionId);
    if (session) {
      this.currentSession = session;
    }
    return session;
  }

  /**
   * Save current session
   */
  async save(): Promise<void> {
    if (this.currentSession) {
      this.currentSession.updatedAt = new Date().toISOString();
      await saveSession(this.db, this.currentSession);
      await persistCheckpoint(this.db, this.currentSession);
    }
  }

  /**
   * Get current session
   */
  getCurrentSession(): TaskLoopSession | null {
    return this.currentSession;
  }

  /**
   * Update current session
   */
  async updateSession(
    updater: (session: TaskLoopSession) => TaskLoopSession
  ): Promise<void> {
    if (this.currentSession) {
      this.currentSession = updater(this.currentSession);
      await this.save();
    }
  }

  /**
   * Add log to current session
   */
  async log(message: string): Promise<void> {
    if (this.currentSession) {
      const timestamp = new Date().toISOString();
      this.currentSession.logs.push(`[${timestamp}] ${message}`);
      if (this.currentSession.logs.length > MAX_LOG_ENTRIES) {
        this.currentSession.logs.shift();
      }
      await addSessionLog(this.db, this.currentSession.id, message);
    }
  }

  /**
   * Get active sessions
   */
  async getActiveSessions(): Promise<TaskLoopSession[]> {
    return getActiveSessions(this.db);
  }

  /**
   * Get recent sessions
   */
  async getRecentSessions(limit?: number): Promise<TaskLoopSession[]> {
    return getRecentSessions(this.db, limit);
  }

  /**
   * Delete a session
   */
  async delete(sessionId: string): Promise<void> {
    await deleteSession(this.db, sessionId);
    await deleteSessionCheckpoint(this.db, sessionId);
    if (this.currentSession?.id === sessionId) {
      this.currentSession = null;
    }
  }
}
