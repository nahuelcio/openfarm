import { Box, Text, useInput } from "@openfarm/tui-opentui";
import { useState } from "react";
import { useStore } from "../store";
import type { AgentConfig } from "../utils/agent-pool";
import { runAgentsParallel } from "../utils/multi-agent-runner";

interface SpawnAgentScreenProps {
  onClose: () => void;
}

export function SpawnAgentScreen({ onClose }: SpawnAgentScreenProps) {
  const { workspace, provider } = useStore();
  const [task, setTask] = useState("");
  const [numAgents, setNumAgents] = useState(1);
  const [selectedProvider, setSelectedProvider] = useState(
    provider || "external-agent"
  );
  const [step, setStep] = useState<"task" | "provider" | "count" | "confirm">(
    "task"
  );
  const [spawning, setSpawning] = useState(false);

  const providers = [
    { id: "external-agent", label: "External Agent (CLI)" },
    { id: "aider", label: "Aider" },
    { id: "claude", label: "Claude Code" },
  ];

  useInput((input, key) => {
    if (spawning) return;

    if (step === "task") {
      if (key.return) {
        if (task.trim()) {
          setStep("provider");
        }
      } else if (key.escape) {
        onClose();
      } else if (key.backspace) {
        setTask((t) => t.slice(0, -1));
      } else if (input) {
        setTask((t) => t + input);
      }
    } else if (step === "provider") {
      if (key.return) {
        setStep("count");
      } else if (key.escape) {
        setStep("task");
      } else if (input === "j" || key.downArrow) {
        const idx = providers.findIndex((p) => p.id === selectedProvider);
        setSelectedProvider(providers[(idx + 1) % providers.length].id);
      } else if (input === "k" || key.upArrow) {
        const idx = providers.findIndex((p) => p.id === selectedProvider);
        setSelectedProvider(
          providers[(idx - 1 + providers.length) % providers.length].id
        );
      }
    } else if (step === "count") {
      if (key.return) {
        setStep("confirm");
      } else if (key.escape) {
        setStep("provider");
      } else if (input === "j" || key.downArrow) {
        setNumAgents((n) => Math.min(n + 1, 8));
      } else if (input === "k" || key.upArrow) {
        setNumAgents((n) => Math.max(n - 1, 1));
      }
    } else if (step === "confirm") {
      if (key.return) {
        handleSpawn();
      } else if (key.escape) {
        setStep("count");
      }
    }
  });

  async function handleSpawn() {
    if (!task.trim() || spawning) return;

    setSpawning(true);

    const configs: AgentConfig[] = [];
    for (let i = 0; i < numAgents; i++) {
      configs.push({
        task,
        workspace,
        provider: selectedProvider,
        branchName: `agent-${Date.now()}-${i}`,
      });
    }

    await runAgentsParallel(configs);
    onClose();
  }

  return (
    <Box flexDirection="column" height="100%" padding={3}>
      <Text bold underline>
        🚀 Spawn New Agents
      </Text>

      <Box marginTop={3}>
        <Text bold>[1] Task Description</Text>
        {step === "task" && <Text color="cyan"> ◄</Text>}
      </Box>
      <Box marginTop={1} paddingLeft={2}>
        <Text>{task || "(enter task description...)"}</Text>
        {task && <Text color="green"> ✓</Text>}
      </Box>

      <Box marginTop={2}>
        <Text bold>[2] Provider</Text>
        {step === "provider" && <Text color="cyan"> ◄</Text>}
      </Box>
      <Box flexDirection="column" gap={1} marginTop={1} paddingLeft={2}>
        {providers.map((p) => (
          <Box flexDirection="row" gap={1} key={p.id}>
            {selectedProvider === p.id && <Text color="cyan">▶ </Text>}
            <Text color={selectedProvider === p.id ? "cyan" : "gray"}>
              {p.label}
            </Text>
          </Box>
        ))}
      </Box>

      <Box marginTop={2}>
        <Text bold>[3] Number of Agents</Text>
        {step === "count" && <Text color="cyan"> ◄</Text>}
      </Box>
      <Box marginTop={1} paddingLeft={2}>
        <Text bold fontSize={24}>
          {numAgents}
        </Text>
        <Text color="gray"> (max 8)</Text>
      </Box>
      <Box marginTop={1} paddingLeft={2}>
        <Text color="gray" dim>
          ↑/↓ to adjust
        </Text>
      </Box>

      <Box borderColor="cyan" borderStyle="round" marginTop={3} padding={2}>
        <Text bold>Summary:</Text>
        <Text>
          {" "}
          {numAgents}x {providers.find((p) => p.id === selectedProvider)?.label}
        </Text>
        <Text color="gray"> for: </Text>
        <Text numberOfLines={1}>
          {task.slice(0, 40)}
          {task.length > 40 ? "..." : ""}
        </Text>
      </Box>

      <Box marginTop={2}>
        {spawning ? (
          <Text color="yellow">Spawning agents...</Text>
        ) : step === "confirm" ? (
          <Text>
            Press{" "}
            <Text bold color="green">
              [Enter]
            </Text>{" "}
            to spawn | <Text bold>[Esc]</Text> to go back
          </Text>
        ) : (
          <Text color="gray">
            Use ↑/↓ to navigate, Enter to select, Esc to go back
          </Text>
        )}
      </Box>
    </Box>
  );
}
