import { Box, Text } from "@openfarm/tui-opentui";
import type { Execution } from "../../store";
import type { TaskLoopScreenTask } from "../../store/task-loop-store";
import { useTheme } from "../../store/theme-store";

interface TaskListPanelProps {
  tasks: TaskLoopScreenTask[];
  selectedIndex: number;
  currentTaskId: string | null;
  recentExecutions?: Pick<Execution, "id" | "task" | "status">[];
}

const statusIconMap: Record<TaskLoopScreenTask["status"], string> = {
  completed: "✓",
  running: "▶",
  pending: "○",
  blocked: "⊘",
  failed: "✗",
  skipped: "⏭",
};

export function TaskListPanel({
  tasks,
  selectedIndex,
  currentTaskId,
  recentExecutions = [],
}: TaskListPanelProps) {
  const { colors } = useTheme();

  return (
    <Box borderStyle="single" flexDirection="column" width="34%">
      <Box borderStyle="single" paddingX={1}>
        <Text bold>{tasks.length > 0 ? "Tasks" : "Recent Executions"}</Text>
      </Box>
      <Box flexDirection="column" flexGrow={1} overflow="hidden" paddingX={1}>
        {tasks.length === 0 ? (
          recentExecutions.length > 0 ? (
            recentExecutions.slice(0, 8).map((execution) => {
              const statusIcon =
                execution.status === "completed"
                  ? "✓"
                  : execution.status === "failed"
                    ? "✗"
                    : execution.status === "running"
                      ? "▶"
                      : execution.status === "cancelled"
                        ? "⏸"
                        : "○";
              const statusColor =
                execution.status === "completed"
                  ? colors.success
                  : execution.status === "failed"
                    ? colors.error
                    : execution.status === "running"
                      ? colors.warning
                      : colors.muted;

              return (
                <Box flexDirection="row" gap={1} key={execution.id}>
                  <Text color={statusColor}>{statusIcon}</Text>
                  <Text wrap="truncate-end">
                    {execution.task} ({execution.id})
                  </Text>
                </Box>
              );
            })
          ) : (
            <Text color={colors.muted}>No tasks loaded yet</Text>
          )
        ) : (
          tasks.map((task, index) => {
            const isSelected = selectedIndex === index;
            const isCurrent = currentTaskId === task.id;
            return (
              <Box flexDirection="row" gap={1} key={task.id}>
                <Text color={isSelected ? colors.warning : colors.muted}>
                  {isSelected ? ">" : " "}
                </Text>
                <Text
                  color={
                    task.status === "completed"
                      ? colors.success
                      : task.status === "failed"
                        ? colors.error
                        : task.status === "running"
                          ? colors.warning
                          : colors.muted
                  }
                >
                  {isCurrent ? "▶" : statusIconMap[task.status]}
                </Text>
                <Text
                  bold={isSelected}
                  color={isSelected ? colors.foreground : colors.muted}
                  wrap="truncate-end"
                >
                  {task.title}
                </Text>
              </Box>
            );
          })
        )}
      </Box>
    </Box>
  );
}
