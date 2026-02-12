import { err, ok, type Result } from "@openfarm/result";
import { parseJson, toJson } from "./utils";

// Use any type to avoid importing from bun during bundling
type SQL = any;

// ============================================================================
// TYPES
// ============================================================================

export type MessageRole = "user" | "assistant" | "system";
export type MessageStatus = "sending" | "streaming" | "complete" | "error";
export type CommandBlockStatus = "pending" | "running" | "success" | "error";

export interface WarpConversation {
  id: string;
  title: string;
  provider: string;
  model: string | null;
  workspacePath: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WarpMessage {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  status: MessageStatus;
  blocks?: CommandBlock[];
  tokensUsed?: number;
  createdAt: string;
}

export interface CommandBlock {
  id: string;
  command: string;
  output?: string;
  status: CommandBlockStatus;
  exitCode?: number;
  executionTimeMs?: number;
  workingDirectory?: string;
}

export interface WarpContextFile {
  conversationId: string;
  filePath: string;
  contentSnapshot: string | null;
}

// ============================================================================
// DATABASE OPERATIONS - Conversations
// ============================================================================

interface ConversationRow {
  id: string;
  title: string;
  provider: string;
  model: string | null;
  workspace_path: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Get all conversations ordered by most recent first.
 */
export async function getWarpConversations(
  db: SQL
): Promise<WarpConversation[]> {
  try {
    const rows = (await db`
      SELECT * FROM warp_conversations 
      ORDER BY updated_at DESC
    `) as ConversationRow[];

    return rows.map(rowToConversation);
  } catch (error) {
    console.error("[DB] Error in getWarpConversations:", error);
    return [];
  }
}

/**
 * Get a single conversation by ID.
 */
export async function getWarpConversation(
  db: SQL,
  id: string
): Promise<WarpConversation | undefined> {
  try {
    const rows = (await db`
      SELECT * FROM warp_conversations WHERE id = ${id}
    `) as ConversationRow[];

    if (rows.length === 0) {
      return undefined;
    }
    return rowToConversation(rows[0]);
  } catch (error) {
    console.error("[DB] Error in getWarpConversation:", error);
    return undefined;
  }
}

/**
 * Create a new conversation.
 */
export async function createWarpConversation(
  db: SQL,
  conversation: Omit<WarpConversation, "createdAt" | "updatedAt">
): Promise<Result<WarpConversation>> {
  try {
    const now = new Date().toISOString();
    await db`
      INSERT INTO warp_conversations (
        id, title, provider, model, workspace_path, created_at, updated_at
      ) VALUES (
        ${conversation.id}, ${conversation.title}, ${conversation.provider},
        ${conversation.model}, ${conversation.workspacePath}, ${now}, ${now}
      )
    `;

    return ok({
      ...conversation,
      createdAt: now,
      updatedAt: now,
    });
  } catch (error) {
    console.error("[DB] Error in createWarpConversation:", error);
    return err(new Error(`Failed to create conversation: ${error}`));
  }
}

/**
 * Update conversation title or model.
 */
export async function updateWarpConversation(
  db: SQL,
  id: string,
  updates: Partial<Pick<WarpConversation, "title" | "model">>
): Promise<Result<void>> {
  try {
    const now = new Date().toISOString();

    if (updates.title !== undefined) {
      await db`
        UPDATE warp_conversations 
        SET title = ${updates.title}, updated_at = ${now}
        WHERE id = ${id}
      `;
    }

    if (updates.model !== undefined) {
      await db`
        UPDATE warp_conversations 
        SET model = ${updates.model}, updated_at = ${now}
        WHERE id = ${id}
      `;
    }

    return ok(undefined);
  } catch (error) {
    console.error("[DB] Error in updateWarpConversation:", error);
    return err(new Error(`Failed to update conversation: ${error}`));
  }
}

/**
 * Delete a conversation and all its messages.
 */
export async function deleteWarpConversation(
  db: SQL,
  id: string
): Promise<Result<void>> {
  try {
    await db`DELETE FROM warp_conversations WHERE id = ${id}`;
    return ok(undefined);
  } catch (error) {
    console.error("[DB] Error in deleteWarpConversation:", error);
    return err(new Error(`Failed to delete conversation: ${error}`));
  }
}

// ============================================================================
// DATABASE OPERATIONS - Messages
// ============================================================================

interface MessageRow {
  id: string;
  conversation_id: string;
  role: string;
  content: string;
  status: string;
  blocks: string | null;
  tokens_used: number | null;
  created_at: string;
}

/**
 * Get all messages for a conversation, ordered chronologically.
 */
export async function getWarpMessages(
  db: SQL,
  conversationId: string
): Promise<WarpMessage[]> {
  try {
    const rows = (await db`
      SELECT * FROM warp_messages 
      WHERE conversation_id = ${conversationId}
      ORDER BY created_at ASC
    `) as MessageRow[];

    return rows.map(rowToMessage);
  } catch (error) {
    console.error("[DB] Error in getWarpMessages:", error);
    return [];
  }
}

/**
 * Add a new message to a conversation.
 */
export async function addWarpMessage(
  db: SQL,
  message: Omit<WarpMessage, "createdAt">
): Promise<Result<WarpMessage>> {
  try {
    const now = new Date().toISOString();
    await db`
      INSERT INTO warp_messages (
        id, conversation_id, role, content, status, blocks, tokens_used, created_at
      ) VALUES (
        ${message.id}, ${message.conversationId}, ${message.role},
        ${message.content}, ${message.status}, ${toJson(message.blocks)},
        ${message.tokensUsed ?? null}, ${now}
      )
    `;

    // Update conversation's updated_at
    await db`
      UPDATE warp_conversations 
      SET updated_at = ${now} 
      WHERE id = ${message.conversationId}
    `;

    return ok({
      ...message,
      createdAt: now,
    });
  } catch (error) {
    console.error("[DB] Error in addWarpMessage:", error);
    return err(new Error(`Failed to add message: ${error}`));
  }
}

/**
 * Update message content and status (for streaming updates).
 */
export async function updateWarpMessage(
  db: SQL,
  messageId: string,
  updates: Partial<
    Pick<WarpMessage, "content" | "status" | "blocks" | "tokensUsed">
  >
): Promise<Result<void>> {
  try {
    const existing = (await db`
      SELECT * FROM warp_messages WHERE id = ${messageId}
    `) as MessageRow[];

    if (existing.length === 0) {
      return err(new Error("Message not found"));
    }

    const row = existing[0];
    const newContent = updates.content ?? row.content;
    const newStatus = updates.status ?? row.status;
    const newBlocks = updates.blocks ?? parseJson<CommandBlock[]>(row.blocks);
    const newTokens = updates.tokensUsed ?? row.tokens_used;

    await db`
      UPDATE warp_messages 
      SET content = ${newContent},
          status = ${newStatus},
          blocks = ${toJson(newBlocks)},
          tokens_used = ${newTokens ?? null}
      WHERE id = ${messageId}
    `;

    return ok(undefined);
  } catch (error) {
    console.error("[DB] Error in updateWarpMessage:", error);
    return err(new Error(`Failed to update message: ${error}`));
  }
}

/**
 * Delete all messages after a specific message (for regeneration).
 */
export async function deleteWarpMessagesAfter(
  db: SQL,
  conversationId: string,
  messageId: string
): Promise<Result<number>> {
  try {
    const messageRow = (await db`
      SELECT created_at FROM warp_messages 
      WHERE id = ${messageId} AND conversation_id = ${conversationId}
    `) as { created_at: string }[];

    if (messageRow.length === 0) {
      return err(new Error("Message not found"));
    }

    const result = await db`
      DELETE FROM warp_messages 
      WHERE conversation_id = ${conversationId} 
        AND created_at > ${messageRow[0].created_at}
    `;

    return ok(result.count || 0);
  } catch (error) {
    console.error("[DB] Error in deleteWarpMessagesAfter:", error);
    return err(new Error(`Failed to delete messages: ${error}`));
  }
}

// ============================================================================
// DATABASE OPERATIONS - Context Files
// ============================================================================

interface ContextFileRow {
  conversation_id: string;
  file_path: string;
  content_snapshot: string | null;
}

/**
 * Get all context files for a conversation.
 */
export async function getWarpContextFiles(
  db: SQL,
  conversationId: string
): Promise<WarpContextFile[]> {
  try {
    const rows = (await db`
      SELECT * FROM warp_context_files 
      WHERE conversation_id = ${conversationId}
    `) as ContextFileRow[];

    return rows.map((row) => ({
      conversationId: row.conversation_id,
      filePath: row.file_path,
      contentSnapshot: row.content_snapshot,
    }));
  } catch (error) {
    console.error("[DB] Error in getWarpContextFiles:", error);
    return [];
  }
}

/**
 * Add a context file to a conversation.
 */
export async function addWarpContextFile(
  db: SQL,
  file: WarpContextFile
): Promise<Result<void>> {
  try {
    await db`
      INSERT INTO warp_context_files (
        conversation_id, file_path, content_snapshot
      ) VALUES (
        ${file.conversationId}, ${file.filePath}, ${file.contentSnapshot}
      )
      ON CONFLICT(conversation_id, file_path) DO UPDATE SET
        content_snapshot = ${file.contentSnapshot}
    `;
    return ok(undefined);
  } catch (error) {
    console.error("[DB] Error in addWarpContextFile:", error);
    return err(new Error(`Failed to add context file: ${error}`));
  }
}

/**
 * Remove a context file from a conversation.
 */
export async function removeWarpContextFile(
  db: SQL,
  conversationId: string,
  filePath: string
): Promise<Result<void>> {
  try {
    await db`
      DELETE FROM warp_context_files 
      WHERE conversation_id = ${conversationId} AND file_path = ${filePath}
    `;
    return ok(undefined);
  } catch (error) {
    console.error("[DB] Error in removeWarpContextFile:", error);
    return err(new Error(`Failed to remove context file: ${error}`));
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function rowToConversation(row: ConversationRow): WarpConversation {
  return {
    id: row.id,
    title: row.title,
    provider: row.provider,
    model: row.model,
    workspacePath: row.workspace_path,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToMessage(row: MessageRow): WarpMessage {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    role: row.role as MessageRole,
    content: row.content,
    status: row.status as MessageStatus,
    blocks: parseJson<CommandBlock[]>(row.blocks) ?? undefined,
    tokensUsed: row.tokens_used ?? undefined,
    createdAt: row.created_at,
  };
}
