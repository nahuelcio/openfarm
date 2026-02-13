/**
 * Header Component
 *
 * Top bar with logo, status indicator, and quick actions.
 * Phase 5: Theme support
 */

import { Box, Text } from "@openfarm/tui-opentui";
import { useTheme } from "../../store/theme-store";
import { StatusBadge } from "../status/status-badge";

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
        <StatusBadge status={status} />
        <Text color={colors.muted}>| ? Help</Text>
      </Box>
    </Box>
  );
}
