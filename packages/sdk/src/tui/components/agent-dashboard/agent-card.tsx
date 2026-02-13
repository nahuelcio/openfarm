import { Box, Text } from "@openfarm/tui-opentui";
import type { Agent, AgentStatus } from "../../utils/agent-pool";

const statusConfig: Record<
  AgentStatus,
  { icon: string; color: string; label: string }
> = {
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

interface AgentCardProps {
  agent: Agent;
  isSelected: boolean;
  onSelect: () => void;
}

export function AgentCard({ agent, isSelected, onSelect }: AgentCardProps) {
  const status = statusConfig[agent.status];
  const borderColor = isSelected ? "cyan" : "gray";

  return (
    <Box
      borderColor={borderColor}
      borderStyle={isSelected ? "bold" : "round"}
      flexDirection="column"
      onClick={onSelect}
      padding={1}
    >
      <Box flexDirection="row" justifyContent="space-between">
        <Box flexDirection="row" gap={1}>
          <Text bold>{status.icon}</Text>
          <Text color={status.color}>{status.label}</Text>
        </Box>
        <Text color="gray">{formatDuration(agent.durationMs)}</Text>
      </Box>

      <Text ellipsis numberOfLines={1}>
        {agent.config.task.slice(0, 60)}
        {agent.config.task.length > 60 ? "..." : ""}
      </Text>

      <Box flexDirection="row" gap={2}>
        <Text color="gray" dim>
          {agent.branchName || agent.id.slice(0, 8)}
        </Text>
        <Text color="gray" dim>
          {agent.config.provider}
        </Text>
      </Box>

      {agent.status === "running" && agent.progress && (
        <Box flexDirection="column" marginTop={1}>
          <Text color="cyan" dim>
            {agent.progress.currentStep} ({agent.progress.stepProgress.current}/
            {agent.progress.stepProgress.total})
          </Text>
        </Box>
      )}

      {agent.error && (
        <Text color="red" numberOfLines={1}>
          Error: {agent.error}
        </Text>
      )}
    </Box>
  );
}
