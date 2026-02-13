import {
  addWarpContextFile,
  addWarpMessage,
  createWarpConversation,
  deleteWarpConversation,
  deleteWarpMessagesAfter,
  getDb,
  getWarpContextFiles,
  getWarpConversations,
  getWarpMessages,
  removeWarpContextFile,
  updateWarpConversation,
  updateWarpMessage,
  type WarpContextFile,
  type WarpConversation,
  type WarpMessage,
} from "@openfarm/core/db";
import {
  createAIServiceFromEnv,
  MockAIService,
} from "../services/ai-service";
import {
  detectSmartContext,
  buildContextPrompt,
} from "../services/context-resolver";

// Simple ID generator for chat messages
function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`;
}

import { create } from "zustand";

// ============================================================================
// TYPES
// ============================================================================

export interface ChatState {
  // Conversations
  conversations: WarpConversation[];
  currentConversationId: string | null;

  // Current conversation data
  messages: WarpMessage[];
  contextFiles: WarpContextFile[];

  // UI State
  isLoading: boolean;
  isStreaming: boolean;
  error: string | null;

  // Provider/Model
  currentProvider: string;
  currentModel: string | null;
}

export interface ChatActions {
  // Load operations
  loadConversations: () => Promise<void>;
  loadConversation: (id: string) => Promise<void>;

  // Conversation operations
  createConversation: (title?: string) => Promise<string>;
  selectConversation: (id: string) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  updateConversationTitle: (id: string, title: string) => Promise<void>;

  // Message operations
  sendMessage: (content: string) => Promise<void>;
  streamResponse: (
    conversationId: string
  ) => AsyncGenerator<string, void, unknown>;
  stopStreaming: () => void;
  regenerateMessage: (messageId: string) => Promise<void>;

  // Context files
  addContextFile: (filePath: string, contentSnapshot?: string) => Promise<void>;
  removeContextFile: (filePath: string) => Promise<void>;

  // Provider/Model
  setProvider: (provider: string) => void;
  setModel: (model: string) => Promise<void>;

  // Reset
  reset: () => void;
}

export type ChatStore = ChatState & ChatActions;

// ============================================================================
// DEFAULT STATE
// ============================================================================

const defaultState: ChatState = {
  conversations: [],
  currentConversationId: null,
  messages: [],
  contextFiles: [],
  isLoading: false,
  isStreaming: false,
  error: null,
  currentProvider: "openai",
  currentModel: null,
};

// ============================================================================
// STORE
// ============================================================================

// Abort controller for stopping streaming
let currentAbortController: AbortController | null = null;

export const useChatStore = create<ChatStore>((set, get) => ({
  ...defaultState,

  // ==========================================================================
  // LOAD OPERATIONS
  // ==========================================================================

  loadConversations: async () => {
    try {
      const db = await getDb();
      const conversations = await getWarpConversations(db);
      set({ conversations });
    } catch (error) {
      console.error("[ChatStore] Error loading conversations:", error);
      set({ error: "Failed to load conversations" });
    }
  },

  loadConversation: async (id: string) => {
    try {
      set({ isLoading: true, error: null });
      const db = await getDb();

      const [messages, contextFiles] = await Promise.all([
        getWarpMessages(db, id),
        getWarpContextFiles(db, id),
      ]);

      set({
        currentConversationId: id,
        messages,
        contextFiles,
        isLoading: false,
      });
    } catch (error) {
      console.error("[ChatStore] Error loading conversation:", error);
      set({ error: "Failed to load conversation", isLoading: false });
    }
  },

  // ==========================================================================
  // CONVERSATION OPERATIONS
  // ==========================================================================

  createConversation: async (title?: string) => {
    const { currentProvider, currentModel, loadConversations } = get();

    try {
      const db = await getDb();
      const id = generateId();

      const conversation = await createWarpConversation(db, {
        id,
        title: title || "New Conversation",
        provider: currentProvider,
        model: currentModel,
        workspacePath: process.cwd(),
      });

      if (!conversation.ok) {
        throw conversation.error;
      }

      await loadConversations();
      await get().loadConversation(id);

      return id;
    } catch (error) {
      console.error("[ChatStore] Error creating conversation:", error);
      set({ error: "Failed to create conversation" });
      throw error;
    }
  },

  selectConversation: async (id: string) => {
    await get().loadConversation(id);
  },

  deleteConversation: async (id: string) => {
    try {
      const db = await getDb();
      const result = await deleteWarpConversation(db, id);

      if (!result.ok) {
        throw result.error;
      }

      const { currentConversationId, loadConversations } = get();

      if (currentConversationId === id) {
        set({
          currentConversationId: null,
          messages: [],
          contextFiles: [],
        });
      }

      await loadConversations();
    } catch (error) {
      console.error("[ChatStore] Error deleting conversation:", error);
      set({ error: "Failed to delete conversation" });
    }
  },

  updateConversationTitle: async (id: string, title: string) => {
    try {
      const db = await getDb();
      const result = await updateWarpConversation(db, id, { title });

      if (!result.ok) {
        throw result.error;
      }

      await get().loadConversations();
    } catch (error) {
      console.error("[ChatStore] Error updating conversation:", error);
      set({ error: "Failed to update conversation" });
    }
  },

  // ==========================================================================
  // MESSAGE OPERATIONS
  // ==========================================================================

  sendMessage: async (content: string) => {
    const {
      currentConversationId,
      createConversation,
      messages,
      contextFiles,
    } = get();

    try {
      // Create conversation if needed
      let conversationId = currentConversationId;
      if (!conversationId) {
        conversationId = await createConversation();
      }

      const db = await getDb();

      // Add user message
      const userMessage: Omit<WarpMessage, "createdAt"> = {
        id: generateId(),
        conversationId,
        role: "user",
        content,
        status: "complete",
      };

      const userResult = await addWarpMessage(db, userMessage);
      if (!userResult.ok) {
        throw userResult.error;
      }

      set({ messages: [...messages, userResult.value] });

      // Add assistant message placeholder
      const assistantMessage: Omit<WarpMessage, "createdAt"> = {
        id: generateId(),
        conversationId,
        role: "assistant",
        content: "",
        status: "streaming",
      };

      const assistantResult = await addWarpMessage(db, assistantMessage);
      if (!assistantResult.ok) {
        throw assistantResult.error;
      }

      set({
        messages: [...get().messages, assistantResult.value],
        isStreaming: true,
      });

      // Build context with file mentions
      const _context = buildContext(content, contextFiles);

      // Stream response
      const stream = get().streamResponse(conversationId);
      let fullContent = "";

      try {
        for await (const chunk of stream) {
          fullContent += chunk;

          // Update message in DB and state
          await updateWarpMessage(db, assistantMessage.id, {
            content: fullContent,
            status: "streaming",
          });

          // Update local state
          set((state) => ({
            messages: state.messages.map((m) =>
              m.id === assistantMessage.id
                ? { ...m, content: fullContent, status: "streaming" }
                : m
            ),
          }));
        }

        // Mark as complete
        await updateWarpMessage(db, assistantMessage.id, {
          status: "complete",
        });

        set((state) => ({
          isStreaming: false,
          messages: state.messages.map((m) =>
            m.id === assistantMessage.id ? { ...m, status: "complete" } : m
          ),
        }));
      } catch (streamError) {
        // Check if aborted
        if (streamError instanceof Error && streamError.name === "AbortError") {
          await updateWarpMessage(db, assistantMessage.id, {
            content: fullContent || "[Cancelled]",
            status: "complete",
          });

          set((state) => ({
            isStreaming: false,
            messages: state.messages.map((m) =>
              m.id === assistantMessage.id
                ? {
                    ...m,
                    content: fullContent || "[Cancelled]",
                    status: "complete",
                  }
                : m
            ),
          }));
        } else {
          throw streamError;
        }
      }
    } catch (error) {
      console.error("[ChatStore] Error sending message:", error);
      set({ error: "Failed to send message", isStreaming: false });
    }
  },

  async *streamResponse(conversationId: string) {
    const { messages, contextFiles } = get();

    // Create abort controller for this stream
    currentAbortController = new AbortController();
    const { signal } = currentAbortController;

    // Initialize AI service
    const aiService = createAIServiceFromEnv();
    const service = aiService || new MockAIService();

    try {
      // Build context from files and smart detection
      const workspace = process.cwd();
      const smartContext = await detectSmartContext(workspace);
      const contextPrompt = buildContextPrompt(smartContext);

      // Format messages for AI service
      const aiMessages = messages.map((m) => ({
        role: m.role as "user" | "assistant" | "system",
        content: m.content,
      }));

      // Add context files as system message if present
      if (contextFiles.length > 0) {
        const fileContext = contextFiles
          .map((f) => `File: ${f.filePath}\n${f.contentSnapshot || ""}`)
          .join("\n\n");
        aiMessages.unshift({
          role: "system",
          content: `Context files:\n${fileContext}\n\n${contextPrompt}`,
        });
      } else if (contextPrompt) {
        aiMessages.unshift({
          role: "system",
          content: contextPrompt,
        });
      }

      // Stream from AI service
      const stream = service.streamFromMessages(
        aiMessages,
        undefined,
        (_chunk: string) => {
          if (signal.aborted) {
            throw new Error("AbortError");
          }
        }
      );

      for await (const chunk of stream) {
        if (signal.aborted) {
          throw new Error("AbortError");
        }
        yield chunk;
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw error;
      }
      // Return error message as stream
      yield `\n[Error: ${error instanceof Error ? error.message : "Unknown error"}]`;
      console.error("[ChatStore] Streaming error:", error);
    } finally {
      currentAbortController = null;
    }
  },

  stopStreaming: () => {
    if (currentAbortController) {
      currentAbortController.abort();
      currentAbortController = null;
    }
    set({ isStreaming: false });
  },

  regenerateMessage: async (messageId: string) => {
    const { currentConversationId, messages, sendMessage } = get();

    if (!currentConversationId) {
      return;
    }

    try {
      // Find the user message before this assistant message
      const messageIndex = messages.findIndex((m) => m.id === messageId);
      if (messageIndex <= 0) {
        return;
      }

      const userMessage = messages[messageIndex - 1];
      if (userMessage.role !== "user") {
        return;
      }

      // Delete this and subsequent messages
      const db = await getDb();
      await deleteWarpMessagesAfter(db, currentConversationId, userMessage.id);

      // Reload messages
      const updatedMessages = await getWarpMessages(db, currentConversationId);
      set({ messages: updatedMessages });

      // Resend the user message
      await sendMessage(userMessage.content);
    } catch (error) {
      console.error("[ChatStore] Error regenerating message:", error);
      set({ error: "Failed to regenerate message" });
    }
  },

  // ==========================================================================
  // CONTEXT FILES
  // ==========================================================================

  addContextFile: async (filePath: string, contentSnapshot?: string) => {
    const { currentConversationId } = get();

    if (!currentConversationId) {
      return;
    }

    try {
      // Read file content if not provided
      let content: string | null = contentSnapshot ?? null;
      if (contentSnapshot === undefined) {
        try {
          const { readFileSync } = await import("node:fs");
          content = readFileSync(filePath, "utf-8");
        } catch {
          content = null;
        }
      }

      const db = await getDb();
      await addWarpContextFile(db, {
        conversationId: currentConversationId,
        filePath,
        contentSnapshot: content,
      });

      const updatedFiles = await getWarpContextFiles(db, currentConversationId);
      set({ contextFiles: updatedFiles });
    } catch (error) {
      console.error("[ChatStore] Error adding context file:", error);
      set({ error: "Failed to add context file" });
    }
  },

  removeContextFile: async (filePath: string) => {
    const { currentConversationId } = get();

    if (!currentConversationId) {
      return;
    }

    try {
      const db = await getDb();
      await removeWarpContextFile(db, currentConversationId, filePath);

      const updatedFiles = await getWarpContextFiles(db, currentConversationId);
      set({ contextFiles: updatedFiles });
    } catch (error) {
      console.error("[ChatStore] Error removing context file:", error);
      set({ error: "Failed to remove context file" });
    }
  },

  // ==========================================================================
  // PROVIDER/MODEL
  // ==========================================================================

  setProvider: (provider: string) => {
    set({ currentProvider: provider, currentModel: null });
  },

  setModel: async (model: string) => {
    const { currentConversationId } = get();

    set({ currentModel: model });

    if (currentConversationId) {
      try {
        const db = await getDb();
        await updateWarpConversation(db, currentConversationId, { model });
      } catch (error) {
        console.error("[ChatStore] Error updating model:", error);
      }
    }
  },

  // ==========================================================================
  // RESET
  // ==========================================================================

  reset: () => {
    if (currentAbortController) {
      currentAbortController.abort();
      currentAbortController = null;
    }
    set(defaultState);
  },
}));

// ============================================================================
// HELPERS
// ============================================================================

function buildContext(
  content: string,
  contextFiles: WarpContextFile[]
): string {
  if (contextFiles.length === 0) {
    return content;
  }

  const fileContext = contextFiles
    .map((f) => {
      if (f.contentSnapshot) {
        return `<file path="${f.filePath}">\n${f.contentSnapshot}\n</file>`;
      }
      return `<file path="${f.filePath}" />`;
    })
    .join("\n\n");

  return `${fileContext}\n\n${content}`;
}
