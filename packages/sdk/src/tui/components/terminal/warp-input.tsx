/**
 * WarpInput Component
 *
 * Unified input bar like Warp terminal:
 * - AI mode: sends messages to AI agent
 * - Terminal mode: executes commands in real shell
 */

import { useState, useEffect } from "react";
import { Box, Text, useInput } from "@openfarm/tui-opentui";
import { useThemeColors } from "../../theme/hooks";
import { executeCommand } from "./integrated-terminal";

type InputMode = "ai" | "terminal";

export interface WarpInputProps {
  /** Current mode */
  mode: InputMode;
  /** When mode changes */
  onModeChange: (mode: InputMode) => void;
  /** When AI message is submitted */
  onAIMessage: (message: string) => void;
  /** When terminal command is submitted */
  onTerminalCommand?: (
    command: string,
    output: string,
    exitCode: number
  ) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Is AI streaming */
  isStreaming?: boolean;
  /** Suggested commands from AI */
  suggestions?: string[];
}

/**
 * Warp-style unified input bar
 *
 * Tab: Toggle between AI and Terminal mode
 * Enter: Submit
 * Arrow Up/Down: Navigate history
 */
export function WarpInput({
  mode,
  onModeChange,
  onAIMessage,
  onTerminalCommand,
  placeholder,
  disabled = false,
  isStreaming = false,
  suggestions = [],
}: WarpInputProps) {
  const colors = useThemeColors();
  const [content, setContent] = useState("");
  const [cursorPos, setCursorPos] = useState(0);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isExecuting, setIsExecuting] = useState(false);

  // Load history from store
  useEffect(() => {
    // Could load from SQLite here
    setHistory([]);
  }, []);

  useInput((input, key) => {
    if (disabled || isExecuting || isStreaming) return;

    // Mode toggle with Tab
    if (key.tab) {
      onModeChange(mode === "ai" ? "terminal" : "ai");
      setContent("");
      setCursorPos(0);
      return;
    }

    // History navigation
    if (key.upArrow && history.length > 0) {
      const newIndex =
        historyIndex < history.length - 1 ? historyIndex + 1 : historyIndex;
      setHistoryIndex(newIndex);
      if (newIndex >= 0) {
        setContent(history[history.length - 1 - newIndex] || "");
        setCursorPos(content.length);
      }
      return;
    }

    if (key.downArrow && historyIndex >= 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      if (newIndex < 0) {
        setContent("");
      } else {
        setContent(history[history.length - 1 - newIndex] || "");
      }
      setCursorPos(content.length);
      return;
    }

    // Submit on Enter
    if (key.return && content.trim()) {
      const trimmed = content.trim();

      // Add to history
      setHistory((prev) => [...prev, trimmed]);
      setHistoryIndex(-1);

      if (mode === "ai") {
        onAIMessage(trimmed);
      } else {
        // Execute in terminal
        setIsExecuting(true);
        executeCommand(trimmed).then((result) => {
          onTerminalCommand?.(trimmed, result.output, result.exitCode);
          setIsExecuting(false);
        });
      }

      setContent("");
      setCursorPos(0);
      return;
    }

    // Backspace
    if (key.backspace || key.delete) {
      if (cursorPos > 0) {
        const before = content.slice(0, cursorPos - 1);
        const after = content.slice(cursorPos);
        setContent(before + after);
        setCursorPos(cursorPos - 1);
      }
      return;
    }

    // Cursor movement
    if (key.leftArrow) {
      setCursorPos((prev) => Math.max(0, prev - 1));
      return;
    }

    if (key.rightArrow) {
      setCursorPos((prev) => Math.min(content.length, prev + 1));
      return;
    }

    // Home/End
    if (key.home) {
      setCursorPos(0);
      return;
    }

    if (key.end) {
      setCursorPos(content.length);
      return;
    }

    // Character input
    if (input && !key.ctrl && !key.meta) {
      const before = content.slice(0, cursorPos);
      const after = content.slice(cursorPos);
      setContent(before + input + after);
      setCursorPos(cursorPos + input.length);
    }
  });

  const modeConfig = {
    ai: { icon: "🤖", color: colors.primary, label: "AI", prompt: "❯" },
    terminal: {
      icon: "⚡",
      color: colors.warning,
      label: "Terminal",
      prompt: "$",
    },
  };

  const currentMode = modeConfig[mode];

  // Render content with cursor
  const renderContent = () => {
    const before = content.slice(0, cursorPos);
    const at = content[cursorPos] || " ";
    const after = content.slice(cursorPos + 1);

    return (
      <>
        <Text color={colors.foreground}>{before}</Text>
        <Text color={colors.background} backgroundColor={currentMode.color}>
          {at}
        </Text>
        <Text color={colors.foreground}>{after}</Text>
      </>
    );
  };

  return (
    <Box flexDirection="column">
      {/* Suggestions */}
      {suggestions.length > 0 && !content && (
        <Box flexDirection="column" marginBottom={1} paddingX={2}>
          <Text color={colors.muted} dimColor>
            Suggested:
          </Text>
          {suggestions.slice(0, 3).map((s, i) => (
            <Text key={i} color={colors.info}>
              {s}
            </Text>
          ))}
        </Box>
      )}

      {/* Input bar */}
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
            Tab to switch • ↑↓ History
          </Text>
          {isStreaming && (
            <Text color={colors.info} bold>
              ◉ AI thinking...
            </Text>
          )}
          {isExecuting && (
            <Text color={colors.warning} bold>
              ⟳ Running...
            </Text>
          )}
        </Box>

        {/* Input line */}
        <Box flexDirection="row" gap={1}>
          <Text color={currentMode.color} bold>
            {currentMode.prompt}
          </Text>
          {content ? (
            renderContent()
          ) : (
            <Text color={colors.muted} dimColor>
              {placeholder ||
                (mode === "ai"
                  ? "Ask the AI..."
                  : "Run command (e.g., ls, git status)")}
            </Text>
          )}
        </Box>
      </Box>
    </Box>
  );
}
