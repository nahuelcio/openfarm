/**
 * KeyHelpBar Component
 *
 * Consistent keyboard help footer for all screens.
 */

import { Box, Text } from "ink";
import { useThemeColors } from "../theme/hooks";

export interface KeyHint {
  key: string;
  label: string;
}

export interface KeyHelpBarProps {
  hints: KeyHint[];
}

/**
 * Renders a consistent keyboard help bar at the bottom of screens
 *
 * @example
 * <KeyHelpBar hints={[
 *   { key: "↑↓", label: "Navigate" },
 *   { key: "Enter", label: "Select" },
 *   { key: "q", label: "Back" },
 * ]} />
 */
export function KeyHelpBar({ hints }: KeyHelpBarProps) {
  const colors = useThemeColors();

  return (
    <Box flexDirection="row" gap={2}>
      {hints.map((hint, index) => (
        <Box flexDirection="row" gap={1} key={`${hint.key}-${index}`}>
          <Text bold color={colors.primary}>
            {hint.key}
          </Text>
          <Text color={colors.muted}>{hint.label}</Text>
        </Box>
      ))}
    </Box>
  );
}
