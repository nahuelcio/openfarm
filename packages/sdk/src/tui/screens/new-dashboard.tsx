/**
 * NewDashboard Screen
 *
 * Ralph TUI-style dashboard with:
 * - Active tasks panel
 * - Recent sessions
 * - Quick stats
 * - System status
 */

import { Box, Text, useInput } from "ink";
import React from "react";
import { useStore } from "../store";

interface StatCardProps {
  label: string;
  value: string | number;
  color?: string;
}

function StatCard({ label, value, color = "white" }: StatCardProps) {
  return (
    <Box
      borderStyle="single"
      borderColor="gray"
      paddingX={2}
      paddingY={1}
      width={20}
      flexDirection="column"
      alignItems="center"
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
  const completedExecutions = executions.filter((e) => e.status === "completed").length;
  const failedExecutions = executions.filter((e) => e.status === "failed").length;
  const runningExecutions = executions.filter((e) => e.status === "running").length;

  // Recent tasks (last 5)
  const recentTasks = executions.slice(0, 5);

  return (
    <Box flexDirection="column" padding={1} gap={1} flexGrow={1}>
      {/* Stats Row */}
      <Box flexDirection="row" gap={2}>
        <StatCard label="Total" value={totalExecutions} />
        <StatCard label="Completed" value={completedExecutions} color="green" />
        <StatCard label="Failed" value={failedExecutions} color="red" />
        <StatCard label="Running" value={runningExecutions} color="yellow" />
      </Box>

      {/* Main Content */}
      <Box flexDirection="row" gap={2} flexGrow={1}>
        {/* Active Tasks */}
        <Box
          borderStyle="single"
          borderColor="cyan"
          flexDirection="column"
          width="50%"
          paddingX={1}
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
                  key={task.id}
                  status={task.status}
                  title={task.task}
                  id={task.id.slice(0, 8)}
                />
              ))
            )}
          </Box>
        </Box>

        {/* System Status */}
        <Box
          borderStyle="single"
          borderColor="gray"
          flexDirection="column"
          width="50%"
          paddingX={1}
        >
          <Text bold>System Status</Text>
          <Box flexDirection="column" gap={1} marginTop={1}>
            <Box flexDirection="row" justifyContent="space-between">
              <Text color="gray">Provider:</Text>
              <Text>OpenCode</Text>
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
                  <Text color={currentExecution.status === "running" ? "yellow" : "white"}>
                    {currentExecution.status}
                  </Text>
                </Box>
              </>
            )}
          </Box>
        </Box>
      </Box>

      {/* Quick Actions */}
      <Box borderStyle="single" borderColor="gray" paddingX={1}>
        <Text color="gray">Quick Actions: </Text>
        <Text>[n] New execution [r] Resume [h] History [w] Workflows [t] Themes</Text>
      </Box>
    </Box>
  );
}
