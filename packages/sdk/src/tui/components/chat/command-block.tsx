/**
 * CommandBlock Component
 *
 * Executable command block with output capture and actions.
 */

import { execSync } from "node:child_process";
import { Box, Text, useInput } from "@openfarm/tui-opentui";
import { useState } from "react";
import { useThemeColors } from "../../theme/hooks";
import { copyToClipboard } from "../../utils/clipboard";
import { formatDuration } from "../../utils/format-duration";

export interface CommandBlockData {
  id: string;
  command: string;
  output?: string;
  status: "pending" | "running" | "success" | "error";
  exitCode?: number;
  executionTimeMs?: number;
  workingDirectory?: string;
}

export interface CommandBlockProps {
  block: CommandBlockData;
  onUpdate?: (block: CommandBlockData) => void;
  onDelete?: () => void;
}

/**
 * Renders an executable command block
 */
export function CommandBlock({ block, onUpdate, onDelete }: CommandBlockProps) {
  const colors = useThemeColors();
  const [isExpanded, setIsExpanded] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(block.command);
  const [copied, setCopied] = useState(false);

  const statusConfig = {
    pending: { icon: "○", color: colors.muted, label: "Pending" },
    running: { icon: "⟳", color: colors.info, label: "Running" },
    success: { icon: "✓", color: colors.success, label: "Success" },
    error: { icon: "✗", color: colors.error, label: "Error" },
  };

  const status = statusConfig[block.status];

  const handleExecute = async () => {
    if (block.status === "running") return;

    onUpdate?.({
      ...block,
      status: "running",
      output: undefined,
      exitCode: undefined,
    });

    const startTime = Date.now();

    try {
      const output = execSync(block.command, {
        cwd: block.workingDirectory || process.cwd(),
        encoding: "utf-8",
        timeout: 30_000,
        maxBuffer: 1024 * 1024, // 1MB
      });

      onUpdate?.({
        ...block,
        status: "success",
        output: output.trim(),
        exitCode: 0,
        executionTimeMs: Date.now() - startTime,
      });
    } catch (error) {
      const err = error as {
        stdout?: string;
        stderr?: string;
        status?: number;
      };
      onUpdate?.({
        ...block,
        status: "error",
        output: err.stderr || err.stdout || String(error),
        exitCode: err.status || 1,
        executionTimeMs: Date.now() - startTime,
      });
    }
  };

  const handleSaveEdit = () => {
    onUpdate?.({
      ...block,
      command: editValue,
      status: "pending",
      output: undefined,
      exitCode: undefined,
    });
    setIsEditing(false);
  };

  useInput((input, key) => {
    if (isEditing) {
      if (key.return) {
        handleSaveEdit();
      } else if (key.escape) {
        setEditValue(block.command);
        setIsEditing(false);
      } else if (key.backspace) {
        setEditValue((prev) => prev.slice(0, -1));
      } else if (input && !key.ctrl && !key.meta) {
        setEditValue((prev) => prev + input);
      }
      return;
    }

    if (input === "r" || input === "R") {
      handleExecute();
    } else if (input === "c" || input === "C") {
      setCopied(copyToClipboard(block.command));
    } else if (input === "y" || input === "Y") {
      setCopied(copyToClipboard(block.output || ""));
    } else if (input === "e" || input === "E") {
      setIsEditing(true);
    } else if (input === "d" || input === "D") {
      onDelete?.();
    } else if (input === " " || key.return) {
      setIsExpanded((prev) => !prev);
    }
  });

  return (
    <Box
      borderColor={status.color}
      borderStyle="single"
      flexDirection="column"
      marginY={1}
      paddingX={1}
      paddingY={1}
    >
      {/* Header */}
      <Box flexDirection="row" justifyContent="space-between">
        <Box flexDirection="row" gap={1}>
          <Text color={status.color}>{status.icon}</Text>
          {isEditing ? (
            <Text color={colors.warning}>{editValue}</Text>
          ) : (
            <>
              <Text bold color={colors.foreground}>
                $
              </Text>
              <Text color={colors.foreground}>{block.command}</Text>
            </>
          )}
        </Box>

        <Box flexDirection="row" gap={2}>
          {block.executionTimeMs && (
            <Text color={colors.muted} dimColor>
              {formatDuration(block.executionTimeMs)}
            </Text>
          )}
          <Text color={colors.muted} dimColor>
            {isExpanded ? "▼" : "▶"}
          </Text>
        </Box>
      </Box>

      {/* Actions */}
      {!isEditing && (
        <Box flexDirection="row" gap={2} marginTop={1}>
          <Text color={colors.primary}>[R]un</Text>
          <Text color={colors.info}>[E]dit</Text>
          <Text color={copied ? colors.success : colors.muted}>
            {copied ? "✓ Copied!" : "[C]opy"}
          </Text>
          <Text color={colors.warning}>[Y]ank</Text>
          <Text color={colors.error}>[D]elete</Text>
          <Text color={colors.muted}>[Space] Toggle</Text>
        </Box>
      )}

      {/* Output */}
      {isExpanded && block.output && (
        <Box
          borderColor={colors.border}
          borderStyle="single"
          flexDirection="column"
          marginTop={1}
          paddingX={1}
          paddingY={1}
        >
          {block.output.split("\n").map((line, i) => (
            <Text color={colors.muted} dimColor key={i} wrap="truncate-end">
              {line}
            </Text>
          ))}
        </Box>
      )}

      {/* Exit code */}
      {block.exitCode !== undefined && block.exitCode !== 0 && (
        <Text color={colors.error} dimColor marginTop={1}>
          Exit code: {block.exitCode}
        </Text>
      )}

      {/* Editing hint */}
      {isEditing && (
        <Text color={colors.warning} marginTop={1}>
          Enter to save, Esc to cancel
        </Text>
      )}
    </Box>
  );
}
