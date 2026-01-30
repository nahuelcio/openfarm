import { readdir, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import type { Workflow } from "@openfarm/core";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import YAML from "js-yaml";
import { useEffect, useState } from "react";
import { useStore } from "../store";
import { getAvailableModels } from "../utils/models";

const PROVIDERS = [
  { id: "opencode", name: "OpenCode" },
  { id: "claude-code", name: "Claude Code" },
  { id: "aider", name: "Aider" },
];

// Default workflow ID
const DEFAULT_WORKFLOW_ID = "task_runner";

type Step = "workflow" | "provider" | "model" | "workspace" | "task";

async function loadWorkflowsFromYaml(): Promise<Workflow[]> {
  const possiblePaths = [
    resolve(process.cwd(), "packages/core/workflows"),
    resolve(process.cwd(), "../core/workflows"),
    resolve(process.cwd(), "../../core/workflows"),
    resolve(__dirname, "../../../../../core/workflows"),
    "/Users/nahuelcioffi/Proyectos/openfarm/packages/core/workflows",
  ];

  for (const dir of possiblePaths) {
    try {
      const files = await readdir(dir);
      const yamlFiles = files.filter(
        (f) => f.endsWith(".yaml") || f.endsWith(".yml")
      );

      if (yamlFiles.length === 0) {
        continue;
      }

      const workflows: Workflow[] = [];
      for (const file of yamlFiles) {
        try {
          const content = await readFile(join(dir, file), "utf-8");
          const workflow = YAML.load(content) as Workflow;
          if (!workflow.createdAt) {
            workflow.createdAt = new Date().toISOString();
          }
          if (!workflow.updatedAt) {
            workflow.updatedAt = new Date().toISOString();
          }
          workflows.push(workflow);
        } catch {
          // Skip invalid files
        }
      }

      // Sort: task_runner first, then alphabetically
      return workflows.sort((a, b) => {
        if (a.id === DEFAULT_WORKFLOW_ID) {
          return -1;
        }
        if (b.id === DEFAULT_WORKFLOW_ID) {
          return 1;
        }
        return (a.name || a.id).localeCompare(b.name || b.id);
      });
    } catch {
      // Try next path
    }
  }

  return [];
}

export function Execute() {
  const {
    setScreen,
    task,
    setTask,
    provider,
    setProvider,
    model,
    setModel,
    workspace,
    setWorkspace,
    addExecution,
    setCurrentExecution,
    selectedWorkflowId,
    setSelectedWorkflowId,
  } = useStore();
  const [step, setStep] = useState<Step>("workflow");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [customPath, setCustomPath] = useState("");
  const [modelSearch, setModelSearch] = useState("");
  const [modelOptions, setModelOptions] = useState<string[]>([]);
  const [isSelectingFromList, setIsSelectingFromList] = useState(false);

  // Load workflows
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [workflowsLoading, setWorkflowsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const data = await loadWorkflowsFromYaml();
      setWorkflows(data);
      // Find index of default workflow
      const defaultIndex = data.findIndex((w) => w.id === selectedWorkflowId);
      if (defaultIndex >= 0) {
        setSelectedIndex(defaultIndex);
      }
      setWorkflowsLoading(false);
    };
    load();
  }, [selectedWorkflowId]);

  // Load available models when provider changes
  useEffect(() => {
    let mounted = true;

    async function loadModels() {
      const models = await getAvailableModels(provider);
      if (mounted) {
        setModelOptions(models);
      }
    }

    loadModels();

    return () => {
      mounted = false;
    };
  }, [provider]);

  // Filter models based on search
  const filteredModels = modelOptions
    .filter((m) => m.toLowerCase().includes(modelSearch.toLowerCase()))
    .slice(0, 10);

  useInput((input, key) => {
    // Escape vuelve al dashboard o paso anterior
    if (key.escape) {
      if (step === "workflow") {
        setScreen("dashboard");
      } else if (step === "provider") {
        setStep("workflow");
        // Reset to current workflow index
        const currentIndex = workflows.findIndex(
          (w) => w.id === selectedWorkflowId
        );
        setSelectedIndex(currentIndex >= 0 ? currentIndex : 0);
      } else if (step === "model") {
        if (isSelectingFromList) {
          setIsSelectingFromList(false);
          setSelectedIndex(0);
        } else {
          setModelSearch("");
          setStep("provider");
          setSelectedIndex(PROVIDERS.findIndex((p) => p.id === provider) || 0);
        }
      } else if (step === "workspace") {
        setStep("model");
        setSelectedIndex(0);
      } else if (step === "task") {
        setStep("workspace");
        setSelectedIndex(0);
      }
      return;
    }

    // Paso 0: Seleccionar Workflow
    if (step === "workflow") {
      if (key.upArrow) {
        setSelectedIndex((i) => Math.max(0, i - 1));
      } else if (key.downArrow) {
        setSelectedIndex((i) => Math.min(workflows.length - 1, i + 1));
      } else if (key.return) {
        const selected = workflows[selectedIndex];
        if (selected) {
          setSelectedWorkflowId(selected.id);
          setSelectedIndex(PROVIDERS.findIndex((p) => p.id === provider) || 0);
          setStep("provider");
        }
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
        setStep("model");
      }
      return;
    }

    // Paso 2: Buscar/Seleccionar Model (opcional)
    if (step === "model") {
      if (key.downArrow && !isSelectingFromList && filteredModels.length > 0) {
        setIsSelectingFromList(true);
        setSelectedIndex(0);
      } else if (key.upArrow && isSelectingFromList) {
        if (selectedIndex === 0) {
          setIsSelectingFromList(false);
        } else {
          setSelectedIndex((i) => i - 1);
        }
      } else if (key.downArrow && isSelectingFromList) {
        setSelectedIndex((i) => Math.min(filteredModels.length - 1, i + 1));
      } else if (key.return) {
        if (isSelectingFromList && filteredModels.length > 0) {
          setModel(filteredModels[selectedIndex]);
        } else {
          setModel(modelSearch);
        }
        setModelSearch("");
        setIsSelectingFromList(false);
        setSelectedIndex(0);
        setStep("workspace");
      }
      return;
    }

    // Paso 3: Seleccionar Workspace
    if (step === "workspace") {
      if (key.upArrow) {
        setSelectedIndex((i) => Math.max(0, i - 1));
      } else if (key.downArrow) {
        setSelectedIndex((i) => Math.min(1, i + 1));
      } else if (key.return) {
        if (selectedIndex === 0) {
          setWorkspace(process.cwd());
          setStep("task");
        } else {
          if (customPath.trim()) {
            setWorkspace(customPath.trim());
            setStep("task");
          }
        }
      }
      return;
    }

    // Paso 4: Escribir Task
    if (step === "task") {
      if (key.return && task.trim()) {
        const execution = {
          id: `exec_${Date.now()}`,
          task: task.trim(),
          provider,
          model: model || undefined,
          workspace,
          status: "pending" as const,
          startedAt: new Date(),
        };
        addExecution(execution);
        setCurrentExecution(execution);
        setTask("");
        setModel("");
        setModelSearch("");
        setCustomPath("");
        setIsSelectingFromList(false);
        setStep("workflow");
        setSelectedIndex(
          workflows.findIndex((w) => w.id === selectedWorkflowId) || 0
        );
        setScreen("running");
      }
      return;
    }
  });

  const currentWorkspace =
    step === "workspace" && selectedIndex === 1 && customPath
      ? customPath
      : workspace;

  const currentWorkflow = workflows.find((w) => w.id === selectedWorkflowId);
  const _selectedWorkflow = workflows[selectedIndex];

  return (
    <Box flexDirection="column" gap={1}>
      {/* Header */}
      <Text bold color="cyan">
        🚀 New Execution
      </Text>
      <Text color="gray">{"─".repeat(60)}</Text>

      {/* Paso 0: Workflow */}
      <Box flexDirection="column" gap={1}>
        <Text
          bold={step === "workflow"}
          color={step === "workflow" ? "cyan" : "gray"}
        >
          0. Select Workflow{" "}
          {step !== "workflow" &&
            currentWorkflow &&
            `(${currentWorkflow.name || currentWorkflow.id})`}
        </Text>

        {step === "workflow" && (
          <Box flexDirection="column" paddingLeft={2}>
            {workflowsLoading ? (
              <Text color="yellow">Loading workflows...</Text>
            ) : workflows.length === 0 ? (
              <Text color="red">No workflows found</Text>
            ) : (
              <>
                {workflows.map((w, index) => (
                  <Box flexDirection="row" gap={1} key={w.id}>
                    <Text color={index === selectedIndex ? "yellow" : "gray"}>
                      {index === selectedIndex ? "▶" : " "}
                    </Text>
                    <Box flexDirection="row" gap={1}>
                      <Text
                        bold={index === selectedIndex}
                        color={index === selectedIndex ? "white" : "gray"}
                      >
                        {w.name || w.id}
                      </Text>
                      {w.id === DEFAULT_WORKFLOW_ID && (
                        <Text color="green">(default)</Text>
                      )}
                    </Box>
                  </Box>
                ))}
                <Box marginTop={1}>
                  <Text color="gray" dimColor>
                    Default: Task Runner (branch → worktree → execute → cleanup)
                  </Text>
                </Box>
              </>
            )}
            <Text color="gray" dimColor>
              Press Enter to select
            </Text>
          </Box>
        )}
      </Box>

      <Text color="gray">{"─".repeat(60)}</Text>

      {/* Paso 1: Provider */}
      <Box flexDirection="column" gap={1}>
        <Text
          bold={step === "provider"}
          color={step === "provider" ? "cyan" : "gray"}
        >
          1. Select Provider{" "}
          {step !== "workflow" &&
            step !== "provider" &&
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

      {/* Paso 2: Model */}
      <Box flexDirection="column" gap={1}>
        <Text
          bold={step === "model"}
          color={step === "model" ? "cyan" : "gray"}
        >
          2. Select Model (optional){" "}
          {step !== "workflow" &&
            step !== "provider" &&
            step !== "model" &&
            model &&
            `(${model})`}
        </Text>

        {step === "model" && (
          <Box flexDirection="column" gap={1} paddingLeft={2}>
            <Box flexDirection="column" gap={0}>
              <Text color="gray" dimColor>
                {modelOptions.length > 0
                  ? `Search ${modelOptions.length} models or type custom:`
                  : "Type model name:"}
              </Text>
              <Box
                borderColor={isSelectingFromList ? "gray" : "yellow"}
                borderStyle="single"
                padding={1}
              >
                <TextInput
                  onChange={setModelSearch}
                  placeholder="e.g. claude, gemini, gpt..."
                  value={modelSearch}
                />
              </Box>
            </Box>

            {filteredModels.length > 0 && (
              <Box flexDirection="column" gap={0} marginTop={1}>
                <Text color="gray" dimColor>
                  {filteredModels.length} match
                  {filteredModels.length !== 1 ? "es" : ""}:
                </Text>
                {filteredModels.map((m, index) => (
                  <Box flexDirection="row" gap={1} key={m}>
                    <Text
                      color={
                        isSelectingFromList && index === selectedIndex
                          ? "yellow"
                          : "gray"
                      }
                    >
                      {isSelectingFromList && index === selectedIndex
                        ? "▶"
                        : " "}
                    </Text>
                    <Text
                      bold={isSelectingFromList && index === selectedIndex}
                      color={
                        isSelectingFromList && index === selectedIndex
                          ? "white"
                          : "gray"
                      }
                    >
                      {m}
                    </Text>
                  </Box>
                ))}
              </Box>
            )}

            <Box marginTop={1}>
              <Text color="gray" dimColor>
                {isSelectingFromList
                  ? "↑↓ Navigate • Enter Select • Esc Back"
                  : modelSearch.trim()
                    ? "↓ Select from list • Enter Use custom"
                    : "Type to search • Enter Skip (use default)"}
              </Text>
            </Box>
          </Box>
        )}
      </Box>

      <Text color="gray">{"─".repeat(60)}</Text>

      {/* Paso 3: Workspace */}
      <Box flexDirection="column" gap={1}>
        <Text
          bold={step === "workspace"}
          color={step === "workspace" ? "cyan" : "gray"}
        >
          3. Select Workspace {step === "task" && `(${workspace})`}
        </Text>

        {step === "workspace" && (
          <Box flexDirection="column" gap={1} paddingLeft={2}>
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

      {/* Paso 4: Task */}
      <Box flexDirection="column" gap={1}>
        <Text bold={step === "task"} color={step === "task" ? "cyan" : "gray"}>
          4. Describe Task
        </Text>

        {step === "task" && (
          <Box flexDirection="column" gap={1} paddingLeft={2}>
            <Box flexDirection="column" gap={0}>
              <Text color="gray" dimColor>
                Using workflow:{" "}
                <Text bold color="cyan">
                  {currentWorkflow?.name || selectedWorkflowId}
                </Text>
              </Text>
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
