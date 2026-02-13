import { Box, Text } from "@openfarm/tui-opentui";
import type { IterationRecord } from "../../store/task-loop-store";
import { useTheme } from "../../store/theme-store";
import { formatDuration } from "../../utils/format-duration";

interface IterationHistoryPanelProps {
  iterations: IterationRecord[];
  selectedIndex: number;
}

export function IterationHistoryPanel({
  iterations,
  selectedIndex,
}: IterationHistoryPanelProps) {
  const { colors } = useTheme();

  return (
    <Box borderStyle="single" flexDirection="column" width="34%">
      <Box borderStyle="single" paddingX={1}>
        <Text bold>Iterations ({iterations.length})</Text>
      </Box>
      <Box flexDirection="column" flexGrow={1} overflow="hidden" paddingX={1}>
        {iterations.length === 0 ? (
          <Text color={colors.muted}>No iterations yet</Text>
        ) : (
          iterations.map((iteration, index) => {
            const isSelected = selectedIndex === index;
            const statusColor =
              iteration.status === "completed"
                ? colors.success
                : iteration.status === "failed"
                  ? colors.error
                  : iteration.status === "running"
                    ? colors.warning
                    : colors.muted;
            return (
              <Box flexDirection="row" gap={1} key={iteration.id}>
                <Text color={isSelected ? colors.warning : colors.muted}>
                  {isSelected ? ">" : " "}
                </Text>
                <Text color={statusColor}>#{iteration.number}</Text>
                <Text color={statusColor}>
                  {iteration.status === "completed"
                    ? "✓"
                    : iteration.status === "failed"
                      ? "✗"
                      : iteration.status === "skipped"
                        ? "⏭"
                        : "▶"}
                </Text>
                <Text wrap="truncate-end">
                  {iteration.taskTitle}
                  {iteration.durationMs
                    ? ` (${formatDuration(iteration.durationMs)})`
                    : ""}
                </Text>
              </Box>
            );
          })
        )}
      </Box>
    </Box>
  );
}
