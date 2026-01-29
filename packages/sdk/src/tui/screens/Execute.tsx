import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import { useState } from "react";
import { useStore } from "../store";

const PROVIDERS = [
  { id: "opencode", name: "OpenCode" },
  { id: "claude-code", name: "Claude Code" },
  { id: "aider", name: "Aider" },
];

type Step = "provider" | "workspace" | "task";

export function Execute() {
  const {
    setScreen,
    task,
    setTask,
    provider,
    setProvider,
    workspace,
    setWorkspace,
    addExecution,
    setCurrentExecution,
  } = useStore();
  const [step, setStep] = useState<Step>("provider");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [customPath, setCustomPath] = useState("");

  useInput((input, key) => {
    // Escape vuelve al dashboard
    if (key.escape) {
      if (step === "workspace") {
        setStep("provider");
      } else if (step === "task") {
        setStep("workspace");
      } else {
        setScreen("dashboard");
      }
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
        setSelectedIndex(0);
        setStep("workspace");
      }
      return;
    }

    // Paso 2: Seleccionar Workspace
    if (step === "workspace") {
      if (key.upArrow) {
        setSelectedIndex((i) => Math.max(0, i - 1));
      } else if (key.downArrow) {
        setSelectedIndex((i) => Math.min(1, i + 1));
      } else if (key.return) {
        if (selectedIndex === 0) {
          // Current directory
          setWorkspace(process.cwd());
          setStep("task");
        } else {
          // Custom path - seguir editando el path
          if (customPath.trim()) {
            setWorkspace(customPath.trim());
            setStep("task");
          }
        }
      }
      return;
    }

    // Paso 3: Escribir Task
    if (step === "task") {
      if (key.return && task.trim()) {
        // Crear ejecución
        const execution = {
          id: `exec_${Date.now()}`,
          task: task.trim(),
          provider,
          workspace,
          status: "pending" as const,
          startedAt: new Date(),
        };
        addExecution(execution);
        setCurrentExecution(execution);
        setTask(""); // Limpiar para la próxima
        setCustomPath(""); // Limpiar custom path
        setStep("provider"); // Resetear step
        setSelectedIndex(0);
        setScreen("running");
      }
      return;
    }
  });

  const currentWorkspace =
    step === "workspace" && selectedIndex === 1 && customPath
      ? customPath
      : workspace;

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
              <Box flexDirection="row" gap={1} key={p.id}>
                <Text color={index === selectedIndex ? "yellow" : "gray"}>
                  {index === selectedIndex ? "▶" : " "}
                </Text>
                <Text
                  bold={index === selectedIndex}
                  color={index === selectedIndex ? "white" : "gray"}
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

      {/* Paso 2: Workspace */}
      <Box flexDirection="column" gap={1}>
        <Text
          bold={step === "workspace"}
          color={step === "workspace" ? "cyan" : "gray"}
        >
          2. Select Workspace {step === "task" && `(${workspace})`}
        </Text>

        {step === "workspace" && (
          <Box flexDirection="column" gap={1} paddingLeft={2}>
            {/* Current Directory */}
            <Box flexDirection="row" gap={1}>
              <Text color={selectedIndex === 0 ? "yellow" : "gray"}>
                {selectedIndex === 0 ? "▶" : " "}
              </Text>
              <Text
                bold={selectedIndex === 0}
                color={selectedIndex === 0 ? "white" : "gray"}
              >
                Current Directory
              </Text>
              <Text color="gray" dimColor>
                ({process.cwd()})
              </Text>
            </Box>

            {/* Custom Path */}
            <Box flexDirection="row" gap={1}>
              <Text color={selectedIndex === 1 ? "yellow" : "gray"}>
                {selectedIndex === 1 ? "▶" : " "}
              </Text>
              <Text
                bold={selectedIndex === 1}
                color={selectedIndex === 1 ? "white" : "gray"}
              >
                Custom Path
              </Text>
            </Box>

            {selectedIndex === 1 && (
              <Box flexDirection="column" gap={1} paddingLeft={2}>
                <Box borderColor="yellow" borderStyle="single" padding={1}>
                  <TextInput
                    onChange={setCustomPath}
                    placeholder="/path/to/project"
                    value={customPath}
                  />
                </Box>
              </Box>
            )}

            <Text color="gray" dimColor>
              {selectedIndex === 1 && !customPath.trim()
                ? "Type a path..."
                : "Press Enter to confirm"}
            </Text>
          </Box>
        )}
      </Box>

      <Text color="gray">{"─".repeat(60)}</Text>

      {/* Paso 3: Task */}
      <Box flexDirection="column" gap={1}>
        <Text bold={step === "task"} color={step === "task" ? "cyan" : "gray"}>
          3. Describe Task
        </Text>

        {step === "task" && (
          <Box flexDirection="column" gap={1} paddingLeft={2}>
            <Box flexDirection="column" gap={0}>
              <Text color="gray" dimColor>
                Working in: {currentWorkspace}
              </Text>
            </Box>
            <Box borderColor="yellow" borderStyle="single" padding={1}>
              <TextInput
                onChange={setTask}
                placeholder="What should the AI do?"
                value={task}
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
      <Text color="gray">↑↓ Navigate • Enter Confirm • Esc Back</Text>
    </Box>
  );
}
