/**
 * UnifiedInput Component
 *
 * Bottom input bar with chat/command toggle.
 */

import { useState } from "react";
import { Box, Text, useInput } from "@openfarm/tui-opentui";
import { useThemeColors } from "../../theme/hooks";

type InputMode = "chat" | "command";

export interface UnifiedInputProps {
  mode: InputMode;
  onModeChange: (mode: InputMode) => void;
  onChatSubmit: (message: string) => void;
  onCommandSubmit: (command: string) => void;
  disabled?: boolean;
  isStreaming?: boolean;
}

export function UnifiedInput({
  mode,
  onModeChange,
  onChatSubmit,
  onCommandSubmit,
  disabled = false,
  isStreaming = false,
}: UnifiedInputProps) {
  const colors = useThemeColors();
  const [content, setContent] = useState("");

  useInput((input, key) => {
    if (disabled) return;

    // Mode toggle
    if (key.tab) {
      onModeChange(mode === "chat" ? "command" : "chat");
      return;
    }

    // Submit
    if (key.return) {
      if (!content.trim()) return;

      if (mode === "chat") {
        onChatSubmit(content.trim());
      } else {
        onCommandSubmit(content.trim());
      }
      setContent("");
      return;
    }

    // Backspace
    if (key.backspace) {
      setContent((prev) => prev.slice(0, -1));
      return;
    }

    // Regular input
    if (input && !key.ctrl && !key.meta) {
      setContent((prev) => prev + input);
    }
  });

  const modeConfig = {
    chat: { icon: "💬", color: colors.primary, label: "Chat" },
    command: { icon: "⚡", color: colors.warning, label: "Command" },
  };

  const currentMode = modeConfig[mode];

  return (
    <Box
      borderColor={currentMode.color}
      borderStyle="bold"
      flexDirection="column"
      paddingX={1}
      paddingY={1}
    >
      {/* Mode indicator */}
      <Box flexDirection="row" gap={2} marginBottom={1}>
        <Text color={currentMode.color} bold>
          {currentMode.icon} {currentMode.label}
        </Text>
        <Text color={colors.muted} dimColor>
          Tab to switch • Enter to send
        </Text>
        {isStreaming && (
          <Text color={colors.info} bold>
            ◉ Streaming...
          </Text>
        )}
      </Box>

      {/* Input line */}
      <Box flexDirection="row" gap={1}>
        <Text color={currentMode.color} bold>
          {mode === "chat" ? ">" : "$"}
        </Text>
        <Text color={disabled ? colors.muted : colors.foreground}>
          {content || (
            <Text color={colors.muted} dimColor>
              {mode === "chat" ? "Ask the AI..." : "Run command..."}
            </Text>
          )}
        </Text>
        {!disabled && <Text color={currentMode.color}>_</Text>}
      </Box>
    </Box>
  );
}
