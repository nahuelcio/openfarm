/**
 * ChatPanel Component
 *
 * Main chat interface combining messages, input, and context.
 */

import { Box, Text, useInput } from "@openfarm/tui-opentui";
import { useEffect, useRef } from "react";
import { useChatStore } from "../../store/chat-store";
import { useThemeColors } from "../../theme/hooks";
import { EmptyState } from "../empty-state";
import { ChatInput } from "./chat-input";
import { ChatMessage } from "./chat-message";
import { TypingIndicator } from "./typing-indicator";

export interface ChatPanelProps {
  /** Height of the panel */
  height?: number;
}

/**
 * Main chat panel component
 */
export function ChatPanel({ height = 20 }: ChatPanelProps) {
  const colors = useThemeColors();
  const scrollRef = useRef<number>(0);

  const {
    messages,
    isStreaming,
    isLoading,
    error,
    currentConversationId,
    conversations,
    sendMessage,
    stopStreaming,
    loadConversations,
    createConversation,
  } = useChatStore();

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollRef.current = Math.max(0, messages.length - 1);
  }, [messages.length]);

  // Keyboard shortcuts
  useInput((input, key) => {
    if (key.ctrl && input === "n") {
      createConversation();
    }
  });

  const handleSubmit = (content: string) => {
    if (currentConversationId) {
      sendMessage(content);
    } else {
      createConversation().then(() => {
        sendMessage(content);
      });
    }
  };

  // Calculate visible message range
  const maxVisibleMessages = Math.max(1, Math.floor((height - 8) / 4));
  const startIndex = Math.max(
    0,
    messages.length - maxVisibleMessages - scrollRef.current
  );
  const endIndex = Math.min(messages.length, startIndex + maxVisibleMessages);
  const visibleMessages = messages.slice(startIndex, endIndex);

  return (
    <Box flexDirection="column" height={height}>
      {/* Header */}
      <ChatHeader
        conversationCount={conversations.length}
        currentId={currentConversationId}
      />

      {/* Messages area */}
      <Box
        borderColor={colors.border}
        borderStyle="single"
        flexDirection="column"
        flexGrow={1}
        overflow="hidden"
        paddingY={1}
      >
        {isLoading ? (
          <Box alignItems="center" flexDirection="column" paddingY={2}>
            <Text color={colors.muted}>Loading...</Text>
          </Box>
        ) : messages.length === 0 ? (
          <EmptyState
            hint="Type a message to start chatting with the AI"
            icon="💬"
            message="No messages yet"
          />
        ) : (
          <Box flexDirection="column">
            {startIndex > 0 && (
              <Box alignItems="center" paddingY={1}>
                <Text color={colors.muted} dimColor>
                  ↑ {startIndex} more messages
                </Text>
              </Box>
            )}

            {visibleMessages.map((message, index) => (
              <ChatMessage
                isLast={index === visibleMessages.length - 1 && !isStreaming}
                key={message.id}
                message={message}
              />
            ))}

            {isStreaming && <TypingIndicator />}

            {endIndex < messages.length && (
              <Box alignItems="center" paddingY={1}>
                <Text color={colors.muted} dimColor>
                  ↓ {messages.length - endIndex} more messages
                </Text>
              </Box>
            )}
          </Box>
        )}

        {error && (
          <Box
            borderColor={colors.error}
            borderStyle="single"
            flexDirection="column"
            marginTop={1}
            padding={1}
          >
            <Text color={colors.error}>Error: {error}</Text>
          </Box>
        )}
      </Box>

      {/* Input area */}
      <Box flexDirection="column" marginTop={1}>
        <ChatInput
          disabled={isLoading}
          isStreaming={isStreaming}
          onCancel={stopStreaming}
          onSubmit={handleSubmit}
        />
      </Box>
    </Box>
  );
}

/**
 * Chat header showing conversation info
 */
function ChatHeader({
  conversationCount,
  currentId,
}: {
  conversationCount: number;
  currentId: string | null;
}) {
  const colors = useThemeColors();

  return (
    <Box
      borderColor={colors.border}
      borderStyle="single"
      flexDirection="row"
      justifyContent="space-between"
      paddingX={1}
      paddingY={1}
    >
      <Box flexDirection="row" gap={1}>
        <Text bold color={colors.primary}>
          💬
        </Text>
        <Text bold color={colors.foreground}>
          Chat
        </Text>
        {currentId && (
          <Text color={colors.muted} dimColor>
            ({currentId.slice(0, 8)}...)
          </Text>
        )}
      </Box>

      <Box flexDirection="row" gap={2}>
        <Text color={colors.muted} dimColor>
          {conversationCount} conversations
        </Text>
        <Text color={colors.muted} dimColor>
          Ctrl+N: New
        </Text>
      </Box>
    </Box>
  );
}
