import { err, ok, type Result } from "@openfarm/result";
import type { ChatSessionMessage } from "../types";
import { parseJson, toJson } from "./utils";

// Use any type to avoid importing from bun during bundling
type SQL = any;

interface ChatMessageRow {
  id: string;
  session_id: string;
  role: string;
  content: string;
  timestamp: string;
  cited_files: string | null;
  job_id: string | null;
}

/**
 * Retrieves all messages for a session, ordered by timestamp.
 */
export async function getSessionMessages(
  db: SQL,
  sessionId: string
): Promise<ChatSessionMessage[]> {
  try {
    const rows =
      (await db`SELECT * FROM chat_messages WHERE session_id = ${sessionId} ORDER BY timestamp ASC`) as ChatMessageRow[];

    return rows.map((row) => ({
      id: row.id,
      sessionId: row.session_id,
      role: row.role as ChatSessionMessage["role"],
      content: row.content,
      timestamp: row.timestamp,
      citedFiles: parseJson<string[]>(row.cited_files) || undefined,
      jobId: row.job_id || undefined,
    }));
  } catch (error) {
    console.error("[DB] Error in getSessionMessages:", error);
    return [];
  }
}

/**
 * Adds a message to the chat session.
 */
export async function addSessionMessage(
  db: SQL,
  message: ChatSessionMessage
): Promise<Result<string>> {
  try {
    await db`
      INSERT INTO chat_messages (
        id, session_id, role, content, timestamp, cited_files, job_id
      ) VALUES (
        ${message.id}, ${message.sessionId}, ${message.role}, 
        ${message.content}, ${message.timestamp}, 
        ${toJson(message.citedFiles)}, ${message.jobId || null}
      )
    `;
    return ok(message.id);
  } catch (error) {
    console.error("[DB] Error in addSessionMessage:", error);
    return err(new Error(`Failed to add session message: ${error}`));
  }
}

/**
 * Updates a session message content.
 */
export async function updateSessionMessage(
  db: SQL,
  messageId: string,
  content: string,
  citedFiles?: string[]
): Promise<Result<void>> {
  try {
    await db`
      UPDATE chat_messages SET
        content = ${content},
        cited_files = ${toJson(citedFiles)}
      WHERE id = ${messageId}
    `;
    return ok(undefined);
  } catch (error) {
    console.error("[DB] Error in updateSessionMessage:", error);
    return err(new Error(`Failed to update session message: ${error}`));
  }
}

/**
 * Deletes all messages after a specific message in a session.
 * Used when regenerating from a specific point in the conversation.
 */
export async function deleteMessagesAfter(
  db: SQL,
  sessionId: string,
  messageId: string
): Promise<Result<number>> {
  try {
    // Get the timestamp of the message to delete after
    const messageRow = (await db`
      SELECT timestamp FROM chat_messages 
      WHERE id = ${messageId} AND session_id = ${sessionId}
    `) as ChatMessageRow[];

    if (messageRow.length === 0) {
      return err(new Error("Message not found"));
    }

    const [firstRow] = messageRow;
    if (!firstRow) {
      return err(new Error("Message not found"));
    }
    const messageTimestamp = firstRow.timestamp;

    // Delete all messages after this timestamp in the same session
    const result = await db`
      DELETE FROM chat_messages 
      WHERE session_id = ${sessionId} AND timestamp > ${messageTimestamp}
    `;

    return ok(result.count || 0);
  } catch (error) {
    console.error("[DB] Error in deleteMessagesAfter:", error);
    return err(new Error(`Failed to delete messages after: ${error}`));
  }
}
