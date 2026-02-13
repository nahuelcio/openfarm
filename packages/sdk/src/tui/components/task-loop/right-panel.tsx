import { Box, Text } from "@openfarm/tui-opentui";
import type {
  IterationRecord,
  RightPanelMode,
  TaskLoopScreenTask,
  ViewMode,
} from "../../store/task-loop-store";
import { useTheme } from "../../store/theme-store";
import { formatDuration } from "../../utils/format-duration";

interface RightPanelProps {
  mode: RightPanelMode;
  viewMode: ViewMode;
  selectedTask?: TaskLoopScreenTask;
  selectedIteration?: IterationRecord;
  outputLines: string[];
  systemStatus?: {
    provider: string;
    model?: string;
    workflowId: string;
    workspace: string;
    executionCount: number;
  };
}

function renderStatus(status: string): string {
  if (status === "running") {
    return "▶ Running";
  }
  if (status === "completed") {
    return "✓ Completed";
  }
  if (status === "failed") {
    return "✗ Failed";
  }
  if (status === "skipped") {
    return "⏭ Skipped";
  }
  if (status === "blocked") {
    return "⊘ Blocked";
  }
  return "○ Pending";
}

export function RightPanel({
  mode,
  viewMode,
  selectedTask,
  selectedIteration,
  outputLines,
  systemStatus,
}: RightPanelProps) {
  const { colors } = useTheme();

  if (mode === "output") {
    return (
      <Box
        borderStyle="single"
        flexDirection="column"
        flexGrow={1}
        marginLeft={1}
      >
        <Box borderStyle="single" paddingX={1}>
          <Text bold>Output Stream</Text>
        </Box>
        <Box flexDirection="column" flexGrow={1} overflow="hidden" paddingX={1}>
          {outputLines.length === 0 ? (
            <Text color={colors.muted}>No output yet</Text>
          ) : (
            outputLines.slice(-30).map((line, index) => (
              <Text key={`${index}-${line}`} wrap="truncate-end">
                {line}
              </Text>
            ))
          )}
        </Box>
      </Box>
    );
  }

  const isIterationView = viewMode === "iterations";

  return (
    <Box
      borderStyle="single"
      flexDirection="column"
      flexGrow={1}
      marginLeft={1}
    >
      <Box borderStyle="single" paddingX={1}>
        <Text bold>
          {isIterationView ? "Iteration Details" : "Task Details"}
        </Text>
      </Box>
      <Box flexDirection="column" flexGrow={1} overflow="hidden" padding={1}>
        {isIterationView ? (
          selectedIteration ? (
            <>
              <Text>
                Iteration:{" "}
                <Text color={colors.primary}>#{selectedIteration.number}</Text>
              </Text>
              <Text>Status: {renderStatus(selectedIteration.status)}</Text>
              <Text>Task: {selectedIteration.taskTitle}</Text>
              <Text>Started: {selectedIteration.startedAt}</Text>
              {selectedIteration.completedAt && (
                <Text>Completed: {selectedIteration.completedAt}</Text>
              )}
              {selectedIteration.durationMs !== undefined && (
                <Text>
                  Duration: {formatDuration(selectedIteration.durationMs)}
                </Text>
              )}
              {selectedIteration.output && (
                <Box flexDirection="column" marginTop={1}>
                  <Text color={colors.primary}>Output:</Text>
                  <Text wrap="wrap">{selectedIteration.output}</Text>
                </Box>
              )}
            </>
          ) : (
            <Text color={colors.muted}>
              Select an iteration to inspect details
            </Text>
          )
        ) : selectedTask ? (
          <>
            <Text>
              Title: <Text color={colors.primary}>{selectedTask.title}</Text>
            </Text>
            <Text>Status: {renderStatus(selectedTask.status)}</Text>
            {selectedTask.priority && (
              <Text>Priority: {selectedTask.priority}</Text>
            )}
            {selectedTask.description && (
              <Box flexDirection="column" marginTop={1}>
                <Text color={colors.primary}>Description:</Text>
                <Text wrap="wrap">{selectedTask.description}</Text>
              </Box>
            )}
            {selectedTask.acceptanceCriteria && (
              <Box flexDirection="column" marginTop={1}>
                <Text color={colors.primary}>Acceptance Criteria:</Text>
                <Text wrap="wrap">{selectedTask.acceptanceCriteria}</Text>
              </Box>
            )}
            {selectedTask.error && (
              <Box flexDirection="column" marginTop={1}>
                <Text color={colors.error}>Error:</Text>
                <Text color={colors.error} wrap="wrap">
                  {selectedTask.error}
                </Text>
              </Box>
            )}
          </>
        ) : systemStatus ? (
          <>
            <Text>
              Provider:{" "}
              <Text color={colors.primary}>{systemStatus.provider}</Text>
            </Text>
            <Text>
              Workflow:{" "}
              <Text color={colors.primary}>{systemStatus.workflowId}</Text>
            </Text>
            {systemStatus.model ? (
              <Text>
                Model: <Text color={colors.primary}>{systemStatus.model}</Text>
              </Text>
            ) : null}
            <Text>
              Workspace:{" "}
              <Text color={colors.primary} wrap="truncate-end">
                {systemStatus.workspace}
              </Text>
            </Text>
            <Text>
              Executions:{" "}
              <Text color={colors.primary}>
                {String(systemStatus.executionCount)}
              </Text>
            </Text>
            <Box marginTop={1}>
              <Text color={colors.muted}>
                Press [s] to start, [r] to refresh tasks, [d] for dashboard
              </Text>
            </Box>
          </>
        ) : (
          <Text color={colors.muted}>Select a task to inspect details</Text>
        )}
      </Box>
    </Box>
  );
}
