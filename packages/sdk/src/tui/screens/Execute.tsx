import { useState } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import { useStore } from "../store";

const PROVIDERS = [
  { id: "opencode", name: "OpenCode" },
  { id: "claude-code", name: "Claude Code" },
  { id: "aider", name: "Aider" },
];

export function Execute() {
  const {
    setScreen,
    task,
    setTask,
    provider,
    setProvider,
    addExecution,
    setCurrentExecution,
  } = useStore();
  const [step, setStep] = useState<"provider" | "task">("provider");
  const [selectedIndex, setSelectedIndex] = useState(0);

  useInput((input, key) => {
    // Escape vuelve al dashboard
    if (key.escape) {
      setScreen("dashboard");
      return;
    }

    // Paso 1: Seleccionar Provider
    if (step === "provider") {
      if (key.upArrow) {
        setSelectedIndex((i) => Math.max(0, i - 1));
      } else if (key.downArrow) {
        setSelectedIndex((i) => Math.min(PROVIDERS.length - 1, i + 1));
      } else if (key.return) {
        setProvider(PROVIDERS[selectedIndex].id);
        setStep("task");
      }
      return;
    }

    // Paso 2: Escribir Task
    if (step === "task") {
      if (key.return && task.trim()) {
        // Crear ejecución
        const execution = {
          id: `exec_${Date.now()}`,
          task: task.trim(),
          provider,
          status: "pending" as const,
          startedAt: new Date(),
        };
        addExecution(execution);
        setCurrentExecution(execution);
        setTask(""); // Limpiar para la próxima
        setStep("provider"); // Resetear step
        setScreen("running");
      }
      return;
    }
  });

  return (
    <Box flexDirection="column" gap={1}>
      {/* Header */}
      <Text bold color="cyan">
        🚀 New Execution
      </Text>
      <Text color="gray">{"─".repeat(60)}</Text>

      {/* Paso 1: Provider */}
      <Box flexDirection="column" gap={1}>
        <Text
          bold={step === "provider"}
          color={step === "provider" ? "cyan" : "gray"}
        >
          1. Select Provider{" "}
          {step !== "provider" &&
            `(${PROVIDERS.find((p) => p.id === provider)?.name})`}
        </Text>

        {step === "provider" && (
          <Box flexDirection="column" paddingLeft={2}>
            {PROVIDERS.map((p, index) => (
              <Box key={p.id} flexDirection="row" gap={1}>
                <Text color={index === selectedIndex ? "yellow" : "gray"}>
                  {index === selectedIndex ? "▶" : " "}
                </Text>
                <Text
                  color={index === selectedIndex ? "white" : "gray"}
                  bold={index === selectedIndex}
                >
                  {p.name}
                </Text>
              </Box>
            ))}
            <Text color="gray" dimColor>
              Press Enter to select
            </Text>
          </Box>
        )}
      </Box>

      <Text color="gray">{"─".repeat(60)}</Text>

      {/* Paso 2: Task */}
      <Box flexDirection="column" gap={1}>
        <Text bold={step === "task"} color={step === "task" ? "cyan" : "gray"}>
          2. Describe Task
        </Text>

        {step === "task" && (
          <Box flexDirection="column" paddingLeft={2} gap={1}>
            <Box borderStyle="single" borderColor="yellow" padding={1}>
              <TextInput
                value={task}
                onChange={setTask}
                placeholder="What should the AI do?"
              />
            </Box>
            <Text color="gray" dimColor>
              {task.trim() ? "Press Enter to execute" : "Type your task..."}
            </Text>
          </Box>
        )}
      </Box>

      <Text color="gray">{"─".repeat(60)}</Text>

      {/* Help */}
      <Text color="gray">↑↓ Navigate • Enter Confirm • Esc Cancel</Text>
    </Box>
  );
}
