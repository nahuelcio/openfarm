/**
 * Footer Component
 *
 * Bottom status bar with keyboard shortcuts and system info.
 * Phase 5: Theme support
 */

import { Box, Text } from "ink";
import React from "react";
import { useTheme } from "../../store/theme-store";

interface FooterProps {
  shortcuts?: Array<{ key: string; label: string }>;
  message?: string;
}

const DEFAULT_SHORTCUTS = [
  { key: "s", label: "start" },
  { key: "p", label: "pause" },
  { key: "d", label: "dashboard" },
  { key: "q", label: "quit" },
  { key: "?", label: "help" },
];

export function Footer({
  shortcuts = DEFAULT_SHORTCUTS,
  message,
}: FooterProps) {
  const { colors } = useTheme();

  return (
    <Box
      borderStyle="single"
      borderColor={colors.border}
      paddingX={1}
      height={3}
      flexDirection="row"
      justifyContent="space-between"
    >
      <Box flexDirection="row" gap={1}>
        {shortcuts.map(({ key, label }) => (
          <Text key={key}>
            <Text color={colors.warning} bold>
              [{key}]
            </Text>
            <Text color={colors.muted}>{label}</Text>
            <Text> </Text>
          </Text>
        ))}
      </Box>

      {message && (
        <Text color={colors.primary} wrap="truncate-end">
          {message}
        </Text>
      )}
    </Box>
  );
}
