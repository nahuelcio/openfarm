import { err, ok, type Result } from "@openfarm/result";
import type { ChatSession } from "../types";

// Use any type to avoid importing from bun during bundling
type SQL = any;

interface ChatSessionRow {
  id: string;
  user_id: string;
  project_id: string;
  repository_url: string;
  branch_name: string;
  status: string;
  created_at: string;
  expires_at: string;
  resource_id: string | null;
  context: string | null;
}

/**
 * Retrieves a chat session by ID.
 */
export async function getChatSession(
  db: SQL,
  sessionId: string
): Promise<ChatSession | undefined> {
  try {
    const rows =
      (await db`SELECT * FROM chat_sessions WHERE id = ${sessionId}`) as ChatSessionRow[];

    if (rows.length === 0) {
      return undefined;
    }

    const [row] = rows;
    if (!row) {
      return undefined;
    }
    return {
      id: row.id,
      userId: row.user_id,
      projectId: row.project_id,
      repositoryUrl: row.repository_url,
      branchName: row.branch_name,
      status: row.status as ChatSession["status"],
      createdAt: row.created_at,
      expiresAt: row.expires_at,
      resourceId: row.resource_id || undefined,
      context: row.context || undefined,
    };
  } catch (error) {
    console.error("[DB] Error in getChatSession:", error);
    return undefined;
  }
}

/**
 * Creates a new chat session.
 */
export async function createChatSession(
  db: SQL,
  session: ChatSession
): Promise<Result<string>> {
  try {
    await db`
      INSERT INTO chat_sessions (
        id, user_id, project_id, repository_url, branch_name, 
        status, created_at, expires_at, resource_id, context
      ) VALUES (
        ${session.id}, ${session.userId}, ${session.projectId}, 
        ${session.repositoryUrl}, ${session.branchName}, ${session.status}, 
        ${session.createdAt}, ${session.expiresAt}, 
        ${session.resourceId || null}, ${session.context || null}
      )
    `;
    return ok(session.id);
  } catch (error) {
    console.error("[DB] Error in createChatSession:", error);
    return err(new Error(`Failed to create chat session: ${error}`));
  }
}

/**
 * Updates a chat session status or resourceId.
 */
export async function updateChatSession(
  db: SQL,
  sessionId: string,
  updater: (session: ChatSession) => Partial<ChatSession>
): Promise<Result<void>> {
  try {
    const current = await getChatSession(db, sessionId);
    if (!current) {
      return err(new Error(`Chat session not found: ${sessionId}`));
    }

    const updates = updater(current);
    const merged = { ...current, ...updates };

    await db`
      UPDATE chat_sessions SET
        status = ${merged.status},
        resource_id = ${merged.resourceId || null},
        context = ${merged.context || null},
        expires_at = ${merged.expiresAt}
      WHERE id = ${sessionId}
    `;

    return ok(undefined);
  } catch (error) {
    console.error("[DB] Error in updateChatSession:", error);
    return err(new Error(`Failed to update chat session: ${error}`));
  }
}

/**
 * Lists active chat sessions (not archived).
 */
export async function getActiveChatSessions(db: SQL): Promise<ChatSession[]> {
  try {
    const rows =
      (await db`SELECT * FROM chat_sessions WHERE status != 'archived' ORDER BY created_at DESC`) as ChatSessionRow[];

    return rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      projectId: row.project_id,
      repositoryUrl: row.repository_url,
      branchName: row.branch_name,
      status: row.status as ChatSession["status"],
      createdAt: row.created_at,
      expiresAt: row.expires_at,
      resourceId: row.resource_id || undefined,
      context: row.context || undefined,
    }));
  } catch (error) {
    console.error("[DB] Error in getActiveChatSessions:", error);
    return [];
  }
}
