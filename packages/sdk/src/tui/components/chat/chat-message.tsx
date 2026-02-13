/**
 * ChatMessage Component
 *
 * Renders a single chat message with support for different roles,
 * status indicators, and command blocks.
 */

import type { CommandBlock, WarpMessage } from "@openfarm/core/db";
import { Box, Text } from "@openfarm/tui-opentui";
import { useThemeColors } from "../../theme/hooks";
import { formatDistanceToNow } from "./utils";

export interface ChatMessageProps {
  /** The message to render */
  message: WarpMessage;
  /** Whether this is the last message (for scrolling) */
  isLast?: boolean;
}

/**
 * Renders a chat message with role-based styling
 */
export function ChatMessage({ message }: ChatMessageProps) {
  const colors = useThemeColors();

  const roleConfig = getRoleConfig(message.role, colors);
  const timestamp = formatDistanceToNow(message.createdAt);

  return (
    <Box flexDirection="column" gap={1} paddingX={1} paddingY={1}>
      {/* Header: Role indicator + timestamp */}
      <Box flexDirection="row" gap={2}>
        <Text {...roleConfig.style}>{roleConfig.label}</Text>
        <Text color={colors.muted} dimColor>
          {timestamp}
        </Text>
        {message.status === "streaming" && <Text color={colors.info}>●</Text>}
      </Box>

      {/* Content */}
      <Box flexDirection="column" paddingLeft={2}>
        <MessageContent content={message.content} />
      </Box>

      {/* Command Blocks */}
      {message.blocks && message.blocks.length > 0 && (
        <Box flexDirection="column" gap={1} paddingLeft={2}>
          {message.blocks.map((block) => (
            <CommandBlockView block={block} key={block.id} />
          ))}
        </Box>
      )}
    </Box>
  );
}

/**
 * Renders message content with basic markdown support
 */
function MessageContent({ content }: { content: string }) {
  const colors = useThemeColors();

  if (!content) {
    return (
      <Text color={colors.muted} dimColor>
        ...
      </Text>
    );
  }

  // Split content by code blocks
  const parts = content.split(/(```[\s\S]*?```)/g);

  return (
    <Box flexDirection="column">
      {parts.map((part, index) => {
        if (part.startsWith("```")) {
          // Code block
          const code = part.replace(/```(\w+)?\n?/, "").replace(/```$/, "");
          return (
            <Box
              borderColor={colors.border}
              borderStyle="round"
              flexDirection="column"
              key={index}
              paddingX={1}
              paddingY={1}
            >
              {code.split("\n").map((line, i) => (
                <Text color={colors.foreground} key={i}>
                  {line || " "}
                </Text>
              ))}
            </Box>
          );
        }

        // Regular text - split into lines
        return part.split("\n").map((line, lineIndex) => (
          <Text color={colors.foreground} key={`${index}-${lineIndex}`}>
            {line || " "}
          </Text>
        ));
      })}
    </Box>
  );
}

/**
 * Renders a command block
 */
function CommandBlockView({ block }: { block: CommandBlock }) {
  const colors = useThemeColors();

  const statusIcon = {
    pending: "○",
    running: "⟳",
    success: "✓",
    error: "✗",
  }[block.status];

  const statusColor = {
    pending: colors.muted,
    running: colors.info,
    success: colors.success,
    error: colors.error,
  }[block.status];

  return (
    <Box
      borderColor={statusColor}
      borderStyle="single"
      flexDirection="column"
      paddingX={1}
      paddingY={1}
    >
      {/* Command header */}
      <Box flexDirection="row" gap={1}>
        <Text color={statusColor}>{statusIcon}</Text>
        <Text bold color={colors.foreground}>
          $
        </Text>
        <Text color={colors.foreground}>{block.command}</Text>
        {block.executionTimeMs && (
          <Text color={colors.muted} dimColor>
            ({formatDuration(block.executionTimeMs)})
          </Text>
        )}
      </Box>

      {/* Output */}
      {block.output && (
        <Box flexDirection="column" paddingLeft={2} paddingTop={1}>
          {block.output
            .split("\n")
            .slice(-10)
            .map((line, i) => (
              <Text color={colors.muted} dimColor key={i}>
                {line}
              </Text>
            ))}
        </Box>
      )}

      {/* Exit code */}
      {block.exitCode !== undefined && block.exitCode !== 0 && (
        <Text color={colors.error} dimColor>
          Exit code: {block.exitCode}
        </Text>
      )}
    </Box>
  );
}

// ============================================================================
// HELPERS
// ============================================================================

interface RoleConfig {
  label: string;
  style: { color: string; bold?: boolean };
}

function getRoleConfig(
  role: WarpMessage["role"],
  colors: ReturnType<typeof useThemeColors>
): RoleConfig {
  switch (role) {
    case "user":
      return {
        label: "You",
        style: { color: colors.primary, bold: true },
      };
    case "assistant":
      return {
        label: "AI",
        style: { color: colors.success, bold: true },
      };
    case "system":
      return {
        label: "System",
        style: { color: colors.muted, bold: true },
      };
    default:
      return {
        label: "Unknown",
        style: { color: colors.muted },
      };
  }
}

function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  if (ms < 60_000) {
    return `${(ms / 1000).toFixed(1)}s`;
  }
  return `${(ms / 60_000).toFixed(1)}m`;
}
