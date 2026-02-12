/**
 * Terminal Command Block Component
 *
 * Displays executed terminal commands with their real output.
 * Like Warp's command blocks but for OpenFarm.
 */

import { useState } from "react";
import { Box, Text, useInput } from "@openfarm/tui-opentui";
import { useClipboard } from "../../hooks/use-clipboard";
import { useThemeColors } from "../../theme/hooks";
import { executeCommand } from "./integrated-terminal";

export interface TerminalBlockData {
  id: string;
  command: string;
  output: string;
  status: "pending" | "running" | "success" | "error";
  exitCode: number;
  duration: number;
  timestamp: Date;
}

export interface TerminalBlockProps {
  block: TerminalBlockData;
  onRerun?: () => void;
  onCopy?: () => void;
  onDelete?: () => void;
}

/**
 * Displays a terminal command block with output
 */
export function TerminalBlock({ block, onRerun, onDelete }: TerminalBlockProps) {
  const colors = useThemeColors();
  const [isExpanded, setIsExpanded] = useState(true);
  const [isRerunning, setIsRerunning] = useState(false);
  const [newOutput, setNewOutput] = useState<string | null>(null);
  const [newStatus, setNewStatus] = useState<TerminalBlockData["status"] | null>(null);
  const { copy, copied } = useClipboard();

  const displayOutput = newOutput !== null ? newOutput : block.output;
  const displayStatus = newStatus !== null ? newStatus : block.status;

  const statusConfig = {
    pending: { icon: "○", color: colors.muted },
    running: { icon: "⟳", color: colors.info },
    success: { icon: "✓", color: colors.success },
    error: { icon: "✗", color: colors.error },
  };

  const status = statusConfig[displayStatus];

  const handleRerun = async () => {
    if (isRerunning) return;

    setIsRerunning(true);
    setNewStatus("running");
    onRerun?.();

    const result = await executeCommand(block.command);

    setNewOutput(result.output);
    setNewStatus(result.exitCode === 0 ? "success" : "error");
    setIsRerunning(false);
  };

  useInput((input, key) => {
    if (input === "r" || input === "R") {
      handleRerun();
    } else if (input === "c" || input === "C") {
      // Copy command to clipboard
      copy(block.command);
    } else if (input === "y" || input === "Y") {
      // Copy output to clipboard (yank)
      copy(displayOutput);
    } else if (input === "d" || input === "D") {
      onDelete?.();
    } else if (input === " " || key.return) {
      setIsExpanded((prev) => !prev);
    }
  });

  // Truncate long output
  const outputLines = displayOutput.split("\n");
  const shouldTruncate = outputLines.length > 20;
  const displayLines = shouldTruncate && !isExpanded
    ? outputLines.slice(0, 20)
    : outputLines;

  return (
    <Box
      borderColor={status.color}
      borderStyle="single"
      flexDirection="column"
      marginY={1}
      paddingX={1}
      paddingY={1}
    >
      {/* Command header */}
      <Box flexDirection="row" gap={1} justifyContent="space-between">
        <Box flexDirection="row" gap={1}>
          <Text color={status.color}>{isRerunning ? "⟳" : status.icon}</Text>
          <Text color={colors.foreground} bold>
            $
          </Text>
          <Text color={colors.foreground}>{block.command}</Text>
        </Box>

        <Box flexDirection="row" gap={2}>
          {block.duration > 0 && (
            <Text color={colors.muted} dimColor>
              {formatDuration(block.duration)}
            </Text>
          )}
          <Text color={colors.muted} dimColor>
            {isExpanded ? "▼" : "▶"}
          </Text>
        </Box>
      </Box>

      {/* Actions */}
      <Box flexDirection="row" gap={2} marginTop={1}>
        <Text color={colors.primary}>[R]erun</Text>
        <Text color={copied ? colors.success : colors.info}>
          {copied ? "✓ Copied!" : "[C]opy cmd"}
        </Text>
        <Text color={colors.warning}>[Y]ank out</Text>
        <Text color={colors.error}>[D]elete</Text>
        <Text color={colors.muted}>[Space] Toggle</Text>
      </Box>

      {/* Output */}
      {isExpanded && (
        <Box
          borderColor={colors.border}
          borderStyle="single"
          flexDirection="column"
          marginTop={1}
          paddingX={1}
          paddingY={1}
        >
          {displayLines.length === 0 ? (
            <Text color={colors.muted} dimColor>
              (no output)
            </Text>
          ) : (
            displayLines.map((line, i) => (
              <Text key={i} color={colors.foreground} dimColor wrap="truncate-end">
                {line || " "}
              </Text>
            ))
          )}

          {shouldTruncate && !isExpanded && (
            <Text color={colors.muted} dimColor marginTop={1}>
              ... {outputLines.length - 20} more lines (Space to expand)
            </Text>
          )}
        </Box>
      )}

      {/* Exit code for errors */}
      {displayStatus === "error" && (
        <Text color={colors.error} dimColor marginTop={1}>
          Exit code: {block.exitCode}
        </Text>
      )}
    </Box>
  );
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}
