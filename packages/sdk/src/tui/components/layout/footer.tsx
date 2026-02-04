/**
 * Footer Component
 *
 * Bottom status bar with keyboard shortcuts and system info.
 * Phase 5: Theme support
 */

import { Box, Text } from "ink";
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
      borderColor={colors.border}
      borderStyle="single"
      flexDirection="row"
      height={3}
      justifyContent="space-between"
      paddingX={1}
    >
      <Box flexDirection="row" gap={1}>
        {shortcuts.map(({ key, label }) => (
          <Text key={key}>
            <Text bold color={colors.warning}>
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
