/**
 * NewDashboard Screen
 *
 * Ralph TUI-style dashboard with:
 * - Active tasks panel
 * - Recent sessions
 * - Quick stats
 * - System status
 */

import { Box, Text, useInput } from "@openfarm/tui-opentui";
import { useStore } from "../store";

interface StatCardProps {
  label: string;
  value: string | number;
  color?: string;
}

function StatCard({ label, value, color = "white" }: StatCardProps) {
  return (
    <Box
      alignItems="center"
      borderColor="gray"
      borderStyle="single"
      flexDirection="column"
      paddingX={2}
      paddingY={1}
      width={20}
    >
      <Text color="gray" dimColor>
        {label}
      </Text>
      <Text bold color={color}>
        {value}
      </Text>
    </Box>
  );
}

interface TaskItemProps {
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  title: string;
  id: string;
}

function TaskItem({ status, title, id }: TaskItemProps) {
  const statusConfig = {
    pending: { symbol: "○", color: "gray" },
    running: { symbol: "▶", color: "yellow" },
    completed: { symbol: "✓", color: "green" },
    failed: { symbol: "✗", color: "red" },
    cancelled: { symbol: "⊘", color: "gray" },
  };

  const config = statusConfig[status];

  return (
    <Box flexDirection="row" gap={1}>
      <Text color={config.color}>{config.symbol}</Text>
      <Text wrap="truncate-end">
        {title} <Text color="gray">({id})</Text>
      </Text>
    </Box>
  );
}

export function NewDashboard() {
  const { executions, currentExecution, setScreen } = useStore();

  useInput((input, key) => {
    if (input === "t") {
      setScreen("theme-selector");
    }
  });

  // Calculate stats
  const totalExecutions = executions.length;
  const completedExecutions = executions.filter(
    (e) => e.status === "completed"
  ).length;
  const failedExecutions = executions.filter(
    (e) => e.status === "failed"
  ).length;
  const runningExecutions = executions.filter(
    (e) => e.status === "running"
  ).length;

  // Recent tasks (last 5)
  const recentTasks = executions.slice(0, 5);

  return (
    <Box flexDirection="column" flexGrow={1} gap={1} padding={1}>
      {/* Stats Row */}
      <Box flexDirection="row" gap={2}>
        <StatCard label="Total" value={totalExecutions} />
        <StatCard color="green" label="Completed" value={completedExecutions} />
        <StatCard color="red" label="Failed" value={failedExecutions} />
        <StatCard color="yellow" label="Running" value={runningExecutions} />
      </Box>

      {/* Main Content */}
      <Box flexDirection="row" flexGrow={1} gap={2}>
        {/* Active Tasks */}
        <Box
          borderColor="cyan"
          borderStyle="single"
          flexDirection="column"
          paddingX={1}
          width="50%"
        >
          <Text bold color="cyan">
            Recent Executions
          </Text>
          <Box flexDirection="column" gap={1} marginTop={1}>
            {recentTasks.length === 0 ? (
              <Text color="gray">No executions yet</Text>
            ) : (
              recentTasks.map((task) => (
                <TaskItem
                  id={task.id.slice(0, 8)}
                  key={task.id}
                  status={task.status}
                  title={task.task}
                />
              ))
            )}
          </Box>
        </Box>

        {/* System Status */}
        <Box
          borderColor="gray"
          borderStyle="single"
          flexDirection="column"
          paddingX={1}
          width="50%"
        >
          <Text bold>System Status</Text>
          <Box flexDirection="column" gap={1} marginTop={1}>
            <Box flexDirection="row" justifyContent="space-between">
              <Text color="gray">Provider:</Text>
              <Text>External Agent</Text>
            </Box>
            <Box flexDirection="row" justifyContent="space-between">
              <Text color="gray">Workflow:</Text>
              <Text>task_runner</Text>
            </Box>
            <Box flexDirection="row" justifyContent="space-between">
              <Text color="gray">Workspace:</Text>
              <Text wrap="truncate-end">{process.cwd()}</Text>
            </Box>
            {currentExecution && (
              <>
                <Box flexDirection="row" justifyContent="space-between">
                  <Text color="gray">Current Task:</Text>
                  <Text wrap="truncate-end">{currentExecution.task}</Text>
                </Box>
                <Box flexDirection="row" justifyContent="space-between">
                  <Text color="gray">Status:</Text>
                  <Text
                    color={
                      currentExecution.status === "running" ? "yellow" : "white"
                    }
                  >
                    {currentExecution.status}
                  </Text>
                </Box>
              </>
            )}
          </Box>
        </Box>
      </Box>

      {/* Quick Actions */}
      <Box borderColor="gray" borderStyle="single" paddingX={1}>
        <Text color="gray">Quick Actions: </Text>
        <Text>
          [n] New execution [r] Resume [h] History [w] Workflows [t] Themes
        </Text>
      </Box>
    </Box>
  );
}
