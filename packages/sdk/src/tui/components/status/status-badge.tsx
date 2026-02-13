/**
 * StatusBadge Component
 *
 * Displays execution status with consistent styling.
 * Uses centralized status helpers from status-helpers.ts.
 */

import { Box, Text } from "@openfarm/tui-opentui";
import type { ExecutionStatus } from "../../utils/status-helpers";
import { getStatusStyle } from "../../utils/status-helpers";

export interface StatusBadgeProps {
  /** Execution status to display */
  status: ExecutionStatus;

  /** Whether to show the status label alongside the icon */
  showLabel?: boolean;

  /** Custom status text to display instead of the status value */
  label?: string;
}

/**
 * StatusBadge component
 *
 * Renders a status icon with appropriate color, optionally showing the label.
 * Uses the centralized status helpers for consistency across all TUI screens.
 */
export function StatusBadge({ status, showLabel, label }: StatusBadgeProps) {
  const { color, icon } = getStatusStyle(status);
  const displayLabel =
    label || (typeof status === "string" ? status : undefined);

  return (
    <Box alignItems="center" flexDirection="row" gap={1}>
      <Text color={color}>{icon}</Text>
      {(showLabel || displayLabel) && (
        <Text color={color} dimColor>
          {displayLabel ? ` ${displayLabel}` : ` ${status}`}
        </Text>
      )}
    </Box>
  );
}
