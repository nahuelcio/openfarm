import { Box, Text } from "@openfarm/tui-opentui";
import type { Agent } from "../../utils/agent-pool";

const statusConfig = {
  pending: { icon: "⏳", color: "gray", label: "Pending" },
  running: { icon: "🔄", color: "cyan", label: "Running" },
  completed: { icon: "✅", color: "green", label: "Completed" },
  failed: { icon: "❌", color: "red", label: "Failed" },
  killed: { icon: "🛑", color: "yellow", label: "Killed" },
  aborted: { icon: "⚠️", color: "yellow", label: "Aborted" },
};

function formatDuration(ms?: number): string {
  if (!ms) return "--";
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

function formatDate(date?: Date): string {
  if (!date) return "--";
  return date.toLocaleTimeString();
}

interface AgentDetailsPanelProps {
  agent: Agent;
}

export function AgentDetailsPanel({ agent }: AgentDetailsPanelProps) {
  const status = statusConfig[agent.status];

  return (
    <Box flexDirection="column" height="100%" padding={1}>
      <Text bold underline>
        Agent Details
      </Text>

      <Box flexDirection="column" gap={1} marginTop={1}>
        <Box flexDirection="row" gap={1}>
          <Text color="gray">ID:</Text>
          <Text>{agent.id.slice(0, 12)}...</Text>
        </Box>

        <Box flexDirection="row" gap={1}>
          <Text color="gray">Status:</Text>
          <Text color={status.color}>
            {status.icon} {status.label}
          </Text>
        </Box>

        <Box flexDirection="row" gap={1}>
          <Text color="gray">Provider:</Text>
          <Text>{agent.config.provider}</Text>
        </Box>

        {agent.config.model && (
          <Box flexDirection="row" gap={1}>
            <Text color="gray">Model:</Text>
            <Text>{agent.config.model}</Text>
          </Box>
        )}

        <Box flexDirection="row" gap={1}>
          <Text color="gray">Duration:</Text>
          <Text>{formatDuration(agent.durationMs)}</Text>
        </Box>

        <Box flexDirection="row" gap={1}>
          <Text color="gray">Started:</Text>
          <Text>{formatDate(agent.startedAt)}</Text>
        </Box>

        <Box flexDirection="row" gap={1}>
          <Text color="gray">Created:</Text>
          <Text>{formatDate(agent.createdAt)}</Text>
        </Box>
      </Box>

      <Text bold marginTop={2} underline>
        Task
      </Text>
      <Box marginTop={1}>
        <Text>{agent.config.task}</Text>
      </Box>

      <Text bold marginTop={2} underline>
        Workspace
      </Text>
      <Box flexDirection="column" gap={1} marginTop={1}>
        <Text color="gray">Branch:</Text>
        <Text>{agent.branchName || "--"}</Text>
        <Text color="gray">Path:</Text>
        <Text numberOfLines={3}>{agent.worktreePath || "--"}</Text>
      </Box>

      {agent.error && (
        <>
          <Text bold color="red" marginTop={2} underline>
            Error
          </Text>
          <Box marginTop={1}>
            <Text color="red">{agent.error}</Text>
          </Box>
        </>
      )}

      {agent.output && (
        <>
          <Text bold marginTop={2} underline>
            Output
          </Text>
          <Box flex={1} marginTop={1} overflow="visible">
            <Text dim numberOfLines={20}>
              {agent.output.slice(-2000)}
            </Text>
          </Box>
        </>
      )}
    </Box>
  );
}
