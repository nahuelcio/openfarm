import { Box, Text, useInput } from "@openfarm/tui-opentui";
import { useState } from "react";
import { useStore } from "../store";
import { useAgentPoolStore } from "../utils/agent-pool";
import { runAgentsParallel } from "../utils/multi-agent-runner";

export function MultiAgentDashboard() {
  const { setScreen } = useStore();
  const poolStore = useAgentPoolStore();
  const agents = poolStore.agents;
  const [inputValue, setInputValue] = useState("");
  const [numAgents, setNumAgents] = useState(1);
  const [mode, setMode] = useState<"list" | "spawn">("list");

  useInput((input, key) => {
    if (mode === "list") {
      if (key.escape || input === "q") {
        setScreen("dashboard");
      } else if (input === "n" || input === "1") {
        setMode("spawn");
        setInputValue("");
      }
    } else if (mode === "spawn") {
      if (key.escape) {
        setMode("list");
        setInputValue("");
      } else if (input === "j" || key.downArrow) {
        setNumAgents((prev) => Math.max(1, prev - 1));
      } else if (input === "k" || key.upArrow) {
        setNumAgents((prev) => Math.min(8, prev + 1));
      } else if (key.return && inputValue.trim()) {
        spawnAgents(inputValue);
      } else if (key.backspace) {
        setInputValue((v) => v.slice(0, -1));
      } else if (input) {
        setInputValue((v) => v + input);
      }
    }
  });

  async function spawnAgents(taskDesc: string) {
    const configs = [];
    for (let i = 0; i < numAgents; i++) {
      configs.push({
        task: taskDesc,
        workspace: process.cwd(),
        provider: "external-agent",
        branchName: `agent-${Date.now()}-${i}`,
      });
    }
    await runAgentsParallel(configs);
    setMode("list");
    setInputValue("");
  }

  if (mode === "spawn") {
    return (
      <Box flexDirection="column" padding={3} gap={2}>
        <Text bold fontSize={18}>
          Spawn Agents
        </Text>

        <Box flexDirection="column" gap={1}>
          <Text>Task description:</Text>
          <Text color="cyan">
            {" > "}
            {inputValue}
          </Text>
        </Box>

        <Box flexDirection="column" gap={1} marginTop={2}>
          <Text>Number of agents: {numAgents}</Text>
          <Text color="gray" dim>
            Press j/k to adjust (1-8)
          </Text>
        </Box>

        <Text color="gray" marginTop={2}>
          Enter to spawn | Esc to cancel
        </Text>
      </Box>
    );
  }

  const stats = {
    total: agents.length,
    running: agents.filter((a) => a.status === "running").length,
    completed: agents.filter((a) => a.status === "completed").length,
    failed: agents.filter((a) => a.status === "failed").length,
  };

  return (
    <Box flexDirection="column" padding={3} gap={2}>
      <Text bold fontSize={18}>
        Multi-Agent Dashboard
      </Text>

      <Box flexDirection="row" gap={4}>
        <Text>Total: {stats.total}</Text>
        <Text color="cyan">Running: {stats.running}</Text>
        <Text color="green">Done: {stats.completed}</Text>
        <Text color="red">Failed: {stats.failed}</Text>
      </Box>

      <Text color="gray">{"─".repeat(40)}</Text>

      {agents.length === 0 ? (
        <Box flexDirection="column" gap={1}>
          <Text color="gray">No agents running.</Text>
          <Text>Press n to spawn new agents.</Text>
        </Box>
      ) : (
        <Box flexDirection="column" gap={1}>
          {agents.map((agent) => (
            <Box key={agent.id} flexDirection="row" gap={2}>
              <Text>
                {agent.status === "running"
                  ? "🔄"
                  : agent.status === "completed"
                    ? "✅"
                    : agent.status === "failed"
                      ? "❌"
                      : "⏳"}
              </Text>
              <Text numberOfLines={1}>{agent.config.task.slice(0, 40)}</Text>
            </Box>
          ))}
        </Box>
      )}

      <Text color="gray">{"─".repeat(40)}</Text>
      <Text color="gray">n: new agent | q: back to home</Text>
    </Box>
  );
}
