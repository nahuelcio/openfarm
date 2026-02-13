/**
 * ChatInput Component
 *
 * Multi-line input with slash command suggestions and file mention support.
 */

import { Box, Text, useInput } from "@openfarm/tui-opentui";
import { useCallback, useEffect, useState } from "react";
import { useThemeColors } from "../../theme/hooks";
import { parseSlashCommand, SLASH_COMMANDS } from "./utils";

export interface ChatInputProps {
  /** Called when user submits a message */
  onSubmit: (message: string) => void;
  /** Called when user cancels (e.g., Ctrl+C) */
  onCancel?: () => void;
  /** Placeholder text */
  placeholder?: string;
  /** Whether input is disabled */
  disabled?: boolean;
  /** Whether streaming is in progress */
  isStreaming?: boolean;
}

/**
 * Multi-line chat input with autocomplete
 */
export function ChatInput({
  onSubmit,
  onCancel,
  placeholder = "Type a message... (Shift+Enter for new line, Enter to send)",
  disabled = false,
  isStreaming = false,
}: ChatInputProps) {
  const colors = useThemeColors();
  const [content, setContent] = useState("");
  const [cursorPosition, setCursorPosition] = useState(0);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState(0);
  // Parse current slash command
  const { command } = parseSlashCommand(content);
  const isCommandMode =
    content.trim().startsWith("/") && !content.includes(" ");

  // Update suggestions visibility
  useEffect(() => {
    if (isCommandMode) {
      setShowSuggestions(true);
      setSelectedSuggestion(0);
    } else {
      setShowSuggestions(false);
    }
  }, [isCommandMode]);

  // Filter suggestions
  const filteredCommands = isCommandMode
    ? SLASH_COMMANDS.filter((cmd) =>
        cmd.command.toLowerCase().includes((command || "").toLowerCase())
      )
    : [];

  useInput(
    useCallback(
      (input, key) => {
        if (disabled) {
          return;
        }

        // Handle Ctrl+C for cancel
        if (key.ctrl && input === "c") {
          if (isStreaming) {
            onCancel?.();
            return;
          }
          // Clear input if not streaming
          setContent("");
          setCursorPosition(0);
          return;
        }

        // Handle suggestions navigation
        if (showSuggestions && filteredCommands.length > 0) {
          if (key.upArrow) {
            setSelectedSuggestion((prev) =>
              prev > 0 ? prev - 1 : filteredCommands.length - 1
            );
            return;
          }
          if (key.downArrow) {
            setSelectedSuggestion((prev) =>
              prev < filteredCommands.length - 1 ? prev + 1 : 0
            );
            return;
          }
          if (key.return) {
            // Accept suggestion
            const selected = filteredCommands[selectedSuggestion];
            if (selected) {
              setContent(`${selected.command} `);
              setCursorPosition(selected.command.length + 1);
              setShowSuggestions(false);
            }
            return;
          }
        }

        // Handle regular input
        if (key.return) {
          if (key.shift) {
            // Shift+Enter: insert newline
            const before = content.slice(0, cursorPosition);
            const after = content.slice(cursorPosition);
            setContent(`${before}\n${after}`);
            setCursorPosition(cursorPosition + 1);
          } else {
            // Enter: submit
            const trimmed = content.trim();
            if (trimmed && !isStreaming) {
              onSubmit(trimmed);
              setContent("");
              setCursorPosition(0);
            }
          }
          return;
        }

        if (key.backspace || key.delete) {
          if (cursorPosition > 0) {
            const before = content.slice(0, cursorPosition - 1);
            const after = content.slice(cursorPosition);
            setContent(before + after);
            setCursorPosition(cursorPosition - 1);
          }
          return;
        }

        if (key.leftArrow) {
          setCursorPosition((prev) => Math.max(0, prev - 1));
          return;
        }

        if (key.rightArrow) {
          setCursorPosition((prev) => Math.min(content.length, prev + 1));
          return;
        }

        if (key.upArrow && !showSuggestions) {
          // Navigate lines
          const lines = content.slice(0, cursorPosition).split("\n");
          if (lines.length > 1) {
            const currentLineLength = lines.at(-1).length;
            const previousLineLength = lines.at(-2).length;
            const newPosition =
              cursorPosition - currentLineLength - previousLineLength - 1;
            setCursorPosition(Math.max(0, newPosition));
          }
          return;
        }

        if (key.downArrow && !showSuggestions) {
          // Navigate lines
          const beforeCursor = content.slice(0, cursorPosition);
          const afterCursor = content.slice(cursorPosition);
          const linesBefore = beforeCursor.split("\n");
          const linesAfter = afterCursor.split("\n");
          if (linesAfter.length > 1) {
            const currentLineLength = linesBefore.at(-1).length;
            const nextLineLength = linesAfter[0].length;
            const newPosition =
              cursorPosition + (nextLineLength - currentLineLength) + 1;
            setCursorPosition(Math.min(content.length, newPosition));
          }
          return;
        }

        if (key.home) {
          // Go to start of line
          const beforeCursor = content.slice(0, cursorPosition);
          const lastNewline = beforeCursor.lastIndexOf("\n");
          setCursorPosition(lastNewline + 1);
          return;
        }

        if (key.end) {
          // Go to end of line
          const afterCursor = content.slice(cursorPosition);
          const nextNewline = afterCursor.indexOf("\n");
          if (nextNewline === -1) {
            setCursorPosition(content.length);
          } else {
            setCursorPosition(cursorPosition + nextNewline);
          }
          return;
        }

        // Regular character input
        if (input && !key.ctrl && !key.meta) {
          const before = content.slice(0, cursorPosition);
          const after = content.slice(cursorPosition);
          setContent(before + input + after);
          setCursorPosition(cursorPosition + input.length);
        }
      },
      [
        content,
        cursorPosition,
        disabled,
        isStreaming,
        onSubmit,
        onCancel,
        showSuggestions,
        filteredCommands,
        selectedSuggestion,
      ]
    )
  );

  // Render content with cursor
  const renderContent = () => {
    const lines = content.split("\n");
    let charCount = 0;

    return lines.map((line, lineIndex) => {
      const lineStart = charCount;
      const lineEnd = charCount + line.length;
      charCount = lineEnd + 1; // +1 for newline

      const cursorInLine =
        cursorPosition >= lineStart && cursorPosition <= lineEnd;
      const cursorChar = cursorInLine ? cursorPosition - lineStart : -1;

      if (!cursorInLine) {
        return (
          <Text color={colors.foreground} key={lineIndex}>
            {line || " "}
          </Text>
        );
      }

      const before = line.slice(0, cursorChar);
      const at = line[cursorChar] || " ";
      const after = line.slice(cursorChar + 1);

      return (
        <Text key={lineIndex}>
          <Text color={colors.foreground}>{before}</Text>
          <Text backgroundColor={colors.primary} color={colors.background}>
            {at}
          </Text>
          <Text color={colors.foreground}>{after}</Text>
        </Text>
      );
    });
  };

  return (
    <Box flexDirection="column">
      {/* Suggestions popup */}
      {showSuggestions && filteredCommands.length > 0 && (
        <Box
          borderColor={colors.border}
          borderStyle="single"
          flexDirection="column"
          marginBottom={1}
          paddingX={1}
          paddingY={1}
        >
          {filteredCommands.map((cmd, index) => (
            <Box
              backgroundColor={
                index === selectedSuggestion ? colors.selectedBg : undefined
              }
              flexDirection="row"
              gap={2}
              key={cmd.command}
            >
              <Text
                bold
                color={
                  index === selectedSuggestion
                    ? colors.selectedFg
                    : colors.primary
                }
              >
                {cmd.command}
              </Text>
              <Text
                color={
                  index === selectedSuggestion
                    ? colors.selectedFg
                    : colors.muted
                }
              >
                {cmd.description}
              </Text>
            </Box>
          ))}
        </Box>
      )}

      {/* Input area */}
      <Box
        borderColor={isStreaming ? colors.info : colors.border}
        borderStyle="single"
        flexDirection="column"
        paddingX={1}
        paddingY={1}
      >
        {/* Mode indicator */}
        <Box flexDirection="row" gap={1} marginBottom={1}>
          <Text color={colors.primary}>{isStreaming ? "◉" : "❯"}</Text>
          <Text color={colors.muted} dimColor>
            {isStreaming ? "Streaming... (Ctrl+C to stop)" : placeholder}
          </Text>
        </Box>

        {/* Content */}
        <Box flexDirection="column" opacity={disabled ? 0.5 : 1}>
          {content ? (
            renderContent()
          ) : (
            <Text color={colors.muted} dimColor>
              {placeholder}
            </Text>
          )}
        </Box>
      </Box>

      {/* Help line */}
      <Box flexDirection="row" gap={2} marginTop={1}>
        <Text color={colors.muted} dimColor>
          ↑↓ Navigate
        </Text>
        <Text color={colors.muted} dimColor>
          Shift+Enter New line
        </Text>
        <Text color={colors.muted} dimColor>
          Enter Send
        </Text>
        <Text color={colors.muted} dimColor>
          / for commands
        </Text>
      </Box>
    </Box>
  );
}
