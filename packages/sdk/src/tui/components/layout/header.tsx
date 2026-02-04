/**
 * Header Component
 *
 * Top bar with logo, status indicator, and quick actions.
 * Phase 5: Theme support
 */

import { Box, Text } from "ink";
import React from "react";
import { useTheme } from "../../store/theme-store";

interface HeaderProps {
  title?: string;
  status?: "idle" | "running" | "paused" | "error";
  sessionId?: string;
}

export function Header({
  title = "OpenFarm",
  status = "idle",
  sessionId,
}: HeaderProps) {
  const { colors, getColor } = useTheme();

  const getStatusConfig = () => {
    switch (status) {
      case "idle":
        return { color: getColor("statusIdle"), symbol: "○", label: "Idle" };
      case "running":
        return {
          color: getColor("statusRunning"),
          symbol: "▶",
          label: "Running",
        };
      case "paused":
        return {
          color: getColor("statusPaused"),
          symbol: "⏸",
          label: "Paused",
        };
      case "error":
        return { color: getColor("statusError"), symbol: "✗", label: "Error" };
      default:
        return { color: getColor("statusIdle"), symbol: "○", label: "Idle" };
    }
  };

  const config = getStatusConfig();

  return (
    <Box
      borderStyle="single"
      borderColor={colors.border}
      paddingX={1}
      height={3}
      flexDirection="row"
      justifyContent="space-between"
    >
      <Box>
        <Text bold color={colors.headerFg}>
          🚜 {title}
        </Text>
        {sessionId && (
          <Text color={colors.muted} dimColor>
            {" "}
            [{sessionId.slice(0, 8)}...]
          </Text>
        )}
      </Box>

      <Box flexDirection="row" gap={2}>
        <Text color={config.color}>
          {config.symbol} {config.label}
        </Text>
        <Text color={colors.muted}>| ? Help</Text>
      </Box>
    </Box>
  );
}
