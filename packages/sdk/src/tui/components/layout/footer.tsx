/**
 * Footer Component
 *
 * Bottom status bar with keyboard shortcuts and context message.
 */

import { Box, Text } from "@openfarm/tui-opentui";
import { useTheme } from "../../store/theme-store";

interface FooterProps {
  shortcuts?: Array<{ key: string; label: string }>;
  message?: string;
}

const DEFAULT_SHORTCUTS = [
  { key: "↑↓", label: "move" },
  { key: "Enter", label: "open" },
  { key: "[ ]", label: "section" },
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
      flexDirection="row"
      height={3}
      justifyContent="space-between"
      paddingX={1}
    >
      <Box flexDirection="row">
        {shortcuts.map(({ key, label }, index) => (
          <Text key={`${key}-${label}`}>
            <Text bold color={colors.primary}>
              {key}
            </Text>
            <Text color={colors.footerFg}> {label}</Text>
            {index < shortcuts.length - 1 ? (
              <Text color={colors.border}> | </Text>
            ) : null}
          </Text>
        ))}
      </Box>

      {message && (
        <Text color={colors.footerFg} wrap="truncate-end">
          {message}
        </Text>
      )}
    </Box>
  );
}
