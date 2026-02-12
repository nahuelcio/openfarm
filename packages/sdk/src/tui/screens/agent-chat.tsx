/**
 * AgentChat Screen
 *
 * Main chat interface for interacting with AI agents.
 * This is the core of the Warp Terminal experience.
 */

import { Box, Text, useInput } from "@openfarm/tui-opentui";
import { useEffect, useState } from "react";
import { KeyHelpBar } from "../components";
import { ChatPanel } from "../components/chat";
import { OverlayContainer } from "../components/task-loop/overlay-container";
import { useNavigationKeys } from "../hooks";
import { useStore } from "../store";
import { useChatStore } from "../store/chat-store";
import { useThemeColors } from "../theme/hooks";

export function AgentChat() {
  const { setScreen } = useStore();
  const colors = useThemeColors();
  const [helpVisible, setHelpVisible] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);

  const {
    conversations,
    currentConversationId,
    loadConversations,
    selectConversation,
    createConversation,
    deleteConversation,
  } = useChatStore();

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Use standardized navigation keys
  const { showingHelp } = useNavigationKeys({
    screen: "agent-chat",
    parentScreen: "dashboard",
    enableHelp: true,
    onNavigate: setScreen,
    onToggleHelp: setHelpVisible,
  });

  // Screen-specific shortcuts
  useInput((input, key) => {
    if (showingHelp || helpVisible) {
      return;
    }

    if (key.ctrl && input === "n") {
      createConversation();
    } else if (key.ctrl && input === "b") {
      setSidebarVisible((prev) => !prev);
    } else if (key.ctrl && input === "f") {
      setScreen("file-explorer");
    } else if (input === "n" && sidebarVisible) {
      createConversation();
    }
  });

  // Help content
  const helpContent = (
    <>
      <Box flexDirection="column">
        <Text bold>Chat Commands</Text>
        <Text> Ctrl+N - New conversation</Text>
        <Text> Ctrl+B - Toggle sidebar</Text>
        <Text> Enter - Send message</Text>
        <Text> Shift+Enter - New line</Text>
        <Text> / - Show slash commands</Text>
      </Box>
      <Box flexDirection="column" marginTop={1}>
        <Text bold>Navigation</Text>
        <Text> d - Dashboard</Text>
        <Text> Ctrl+F - Files</Text>
        <Text> Esc - Back</Text>
        <Text> ? - Toggle Help</Text>
      </Box>
    </>
  );

  // Render help overlay
  if (showingHelp || helpVisible) {
    return (
      <Box flexDirection="column" height={24}>
        <Box flexDirection="row" justifyContent="space-between">
          <Text bold color={colors.primary}>
            💬 Agent Chat
          </Text>
          <Text color={colors.muted}>{conversations.length} conversations</Text>
        </Box>
        <Text color={colors.border}>{"─".repeat(60)}</Text>
        <OverlayContainer title="Chat Help">{helpContent}</OverlayContainer>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" height={24}>
      {/* Header */}
      <Box flexDirection="row" justifyContent="space-between">
        <Text bold color={colors.primary}>
          💬 Agent Chat
        </Text>
        <Box flexDirection="row" gap={2}>
          <Text color={colors.muted}>{conversations.length} conversations</Text>
          {currentConversationId && (
            <Text color={colors.info}>
              Active: {currentConversationId.slice(0, 8)}...
            </Text>
          )}
        </Box>
      </Box>

      <Text color={colors.border}>{"─".repeat(60)}</Text>

      {/* Main content */}
      <Box flexDirection="row" flexGrow={1} gap={1}>
        {/* Sidebar - Conversation list */}
        {sidebarVisible && (
          <Box
            borderColor={colors.border}
            borderStyle="single"
            flexDirection="column"
            paddingX={1}
            paddingY={1}
            width={25}
          >
            <Box
              flexDirection="row"
              justifyContent="space-between"
              marginBottom={1}
            >
              <Text bold color={colors.foreground}>
                Conversations
              </Text>
              <Text color={colors.primary}>(n) new</Text>
            </Box>

            {conversations.length === 0 ? (
              <Text color={colors.muted} dimColor>
                No conversations yet. Press Ctrl+N to create one.
              </Text>
            ) : (
              <Box flexDirection="column" gap={1}>
                {conversations.map((conv) => (
                  <ConversationItem
                    conversation={conv}
                    isActive={conv.id === currentConversationId}
                    key={conv.id}
                    onDelete={() => deleteConversation(conv.id)}
                    onSelect={() => selectConversation(conv.id)}
                  />
                ))}
              </Box>
            )}
          </Box>
        )}

        {/* Chat panel */}
        <Box flexDirection="column" flexGrow={1}>
          <ChatPanel height={20} />
        </Box>
      </Box>

      {/* Footer */}
      <KeyHelpBar
        hints={[
          { key: "Ctrl+N", label: "New Chat" },
          { key: "Ctrl+B", label: "Sidebar" },
          { key: "Ctrl+F", label: "Files" },
          { key: "d", label: "Dashboard" },
          { key: "?", label: "Help" },
          { key: "Esc", label: "Back" },
        ]}
      />
    </Box>
  );
}

// ============================================================================
// CONVERSATION ITEM COMPONENT
// ============================================================================

interface ConversationItemProps {
  conversation: {
    id: string;
    title: string;
    updatedAt: string;
  };
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

function ConversationItem({
  conversation,
  isActive,
  onSelect,
}: ConversationItemProps) {
  const colors = useThemeColors();

  useInput((input) => {
    if (isActive && input === "\r") {
      onSelect();
    }
  });

  return (
    <Box
      backgroundColor={isActive ? colors.selectedBg : undefined}
      flexDirection="column"
      paddingX={1}
      paddingY={1}
    >
      <Box flexDirection="row" gap={1}>
        <Text
          bold={isActive}
          color={isActive ? colors.selectedFg : colors.foreground}
        >
          {isActive ? "▶" : "○"}
        </Text>
        <Text
          bold={isActive}
          color={isActive ? colors.selectedFg : colors.foreground}
        >
          {conversation.title.length > 20
            ? `${conversation.title.slice(0, 20)}...`
            : conversation.title}
        </Text>
      </Box>
      <Text color={colors.muted} dimColor>
        {new Date(conversation.updatedAt).toLocaleDateString()}
      </Text>
    </Box>
  );
}
