import { Box, Text } from "@openfarm/tui-opentui";
import { useState } from "react";
import { getAgentStats, useAgentPoolStore } from "../../utils/agent-pool";
import { AgentCard } from "./agent-card";
import { AgentDetailsPanel } from "./agent-details-panel";

export function AgentDashboard() {
  const agents = useAgentPoolStore((state) => state.agents);
  const stats = getAgentStats(agents);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const selectedAgent = selectedAgentId
    ? agents.find((a) => a.id === selectedAgentId)
    : null;

  return (
    <Box flexDirection="column" height="100%">
      <Box
        borderBottom="single"
        borderColor="cyan"
        borderStyle="bold"
        flexDirection="row"
        justifyContent="space-between"
        paddingX={2}
        paddingY={1}
      >
        <Text bold color="cyan">
          🤖 Agent Dashboard
        </Text>
        <Text>
          Running: {stats.running} | Completed: {stats.completed} | Failed:{" "}
          {stats.failed} | Total: {stats.total}
        </Text>
      </Box>

      <Box flex={1} flexDirection="row" overflow="hidden">
        <Box flex={2} flexDirection="column" overflow="auto" padding={1}>
          {agents.length === 0 ? (
            <Box alignItems="center" flex={1} justifyContent="center">
              <Text color="gray">
                No agents running. Spawn one to get started!
              </Text>
            </Box>
          ) : (
            <Box flexDirection="column" gap={1}>
              {agents.map((agent) => (
                <AgentCard
                  agent={agent}
                  isSelected={selectedAgentId === agent.id}
                  key={agent.id}
                  onSelect={() => setSelectedAgentId(agent.id)}
                />
              ))}
            </Box>
          )}
        </Box>

        {selectedAgent && (
          <Box
            borderColor="gray"
            borderLeft="single"
            borderStyle="bold"
            overflow="auto"
            width={60}
          >
            <AgentDetailsPanel agent={selectedAgent} />
          </Box>
        )}
      </Box>

      <Box
        borderColor="gray"
        borderStyle="bold"
        borderTop="single"
        flexDirection="row"
        justifyContent="space-between"
        paddingX={2}
        paddingY={1}
      >
        <Text color="gray">
          [n] New Agent | [↑↓] Navigate | [Enter] View Details | [Esc] Back
        </Text>
        <Text color="gray">Max 8 concurrent agents</Text>
      </Box>
    </Box>
  );
}
