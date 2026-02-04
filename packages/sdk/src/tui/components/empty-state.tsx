/**
 * EmptyState Component
 *
 * Consistent empty state display across all screens.
 */

import { Box, Text } from "ink";
import { useThemeColors } from "../theme/hooks";

export interface EmptyStateProps {
  /** Main message to display */
  message: string;
  /** Optional hint text (e.g., "Press 'e' to start") */
  hint?: string;
  /** Optional icon to display */
  icon?: string;
}

/**
 * Renders a consistent empty state with optional hint
 *
 * @example
 * <EmptyState message="No executions yet" hint="Press 'e' to start" />
 * <EmptyState message="No items found" icon="📭" />
 */
export function EmptyState({ message, hint, icon }: EmptyStateProps) {
  const colors = useThemeColors();

  return (
    <Box flexDirection="column" gap={1} paddingY={1}>
      <Box flexDirection="row" gap={1}>
        {icon && <Text color={colors.muted}>{icon}</Text>}
        <Text color={colors.muted}>{message}</Text>
      </Box>
      {hint && (
        <Text color={colors.primary} dimColor>
          {hint}
        </Text>
      )}
    </Box>
  );
}
