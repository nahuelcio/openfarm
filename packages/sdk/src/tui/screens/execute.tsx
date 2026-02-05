import type { Workflow } from "@openfarm/core";
import { getDb } from "@openfarm/core/db";
import { Box, Text, useInput } from "@openfarm/tui-opentui";
import TextInput from "@openfarm/tui-opentui/text-input";
import { useEffect, useState } from "react";
import { useStore } from "../store";
import { getAvailableModels, preloadModels } from "../utils/models";
import {
  DEFAULT_WORKFLOWS,
  syncWorkflowsInBackground,
} from "../utils/workflow-loader";

const PROVIDERS = [
  { id: "opencode", name: "OpenCode" },
  { id: "claude", name: "Claude Code" },
  { id: "aider", name: "Aider" },
  { id: "external-agent", name: "🔗 Connect External Agent" },
];

const AGENT_PRESETS = [
  {
    id: "codex",
    name: "⚡ Codex",
    cli: "codex",
    description: "OpenAI's official CLI agent",
  },
  {
    id: "droid",
    name: "🤖 Droid",
    cli: "droid",
    description: "External CLI agent",
  },
  {
    id: "custom",
    name: "✏️  Custom Command",
    cli: "",
    description: "Type your own command",
  },
];

// Default workflow ID
const DEFAULT_WORKFLOW_ID = "oneshot";

type Step =
  | "workflow"
  | "provider"
  | "externalAgentConfig"
  | "model"
  | "workspace"
  | "task";

async function loadWorkflowsFromDatabase(): Promise<Workflow[]> {
  try {
    const { getWorkflows } = await import("@openfarm/core/db");
    const db = await getDb();
    const workflows = await getWorkflows(db);

    // If no workflows in DB, return empty (defaults will be used)
    if (!workflows || workflows.length === 0) {
      return [];
    }

    // Sort: default workflow first, then alphabetically
    return workflows.sort((a: Workflow, b: Workflow) => {
      if (a.id === DEFAULT_WORKFLOW_ID) {
        return -1;
      }
      if (b.id === DEFAULT_WORKFLOW_ID) {
        return 1;
      }
      return (a.name || a.id).localeCompare(b.name || b.id);
    });
  } catch (error) {
    console.error("Failed to load workflows from database:", error);
    return [];
  }
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
    externalAgentConfig,
    setExternalAgentConfig,
  } = useStore();
  const [step, setStep] = useState<Step>("workflow");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [customPath, setCustomPath] = useState("");
  const [modelSearch, setModelSearch] = useState("");
  const [modelOptions, setModelOptions] = useState<string[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [isSelectingFromList, setIsSelectingFromList] = useState(false);
  const [externalAgentStep, setExternalAgentStep] = useState<"preset" | "args">(
    "preset"
  );
  const [selectedPreset, setSelectedPreset] = useState(0);
  const [externalAgentArgs, setExternalAgentArgs] = useState("");

  // Start with hardcoded defaults - zero async, zero lag
  const [workflows, setWorkflows] = useState<Workflow[]>(DEFAULT_WORKFLOWS);

  // Defer ALL async work until after the first render cycle completes
  // This is the key to preventing the 2-3 second lag
  useEffect(() => {
    let mounted = true;

    // Use setImmediate to yield to the event loop FIRST
    // This ensures React has fully rendered and the UI is interactive
    const immediate = setImmediate(() => {
      if (!mounted) {
        return;
      }

      // Load workflows from DB cache (fast) then sync YAML in background
      loadWorkflowsFromDatabase().then((dbWorkflows) => {
        if (mounted && dbWorkflows.length > 0) {
          setWorkflows(dbWorkflows);
        }
        // Update YAML -> DB cache for next time (fire and forget)
        syncWorkflowsInBackground();
      });
    });

    return () => {
      mounted = false;
      clearImmediate(immediate);
    };
  }, []);

  // Lazy model loading - only load when user reaches the model step
  useEffect(() => {
    if (step !== "model") {
      return;
    }
    if (modelOptions.length > 0) {
      return; // Already loaded
    }

    let mounted = true;
    setLoadingModels(true);

    // For external-agent, pass the selected CLI to get appropriate models
    const cli =
      provider === "external-agent" ? externalAgentConfig.cli : undefined;
    getAvailableModels(provider, cli).then((models) => {
      if (mounted) {
        setModelOptions(models);
        setLoadingModels(false);
      }
    });

    return () => {
      mounted = false;
    };
  }, [step, provider, modelOptions.length, externalAgentConfig.cli]);

  // Filter models based on search
  const allFilteredModels = modelOptions.filter((m) =>
    m.toLowerCase().includes(modelSearch.toLowerCase())
  );
  const filteredModels = allFilteredModels.slice(0, 10);

  useEffect(() => {
    if (!isSelectingFromList) {
      return;
    }
    setSelectedIndex((current) =>
      Math.min(current, Math.max(filteredModels.length - 1, 0))
    );
  }, [filteredModels.length, isSelectingFromList]);

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
      } else if (step === "externalAgentConfig") {
        if (externalAgentStep === "args") {
          setExternalAgentStep("preset");
        } else {
          setStep("provider");
          setSelectedIndex(PROVIDERS.findIndex((p) => p.id === provider) || 0);
        }
      } else if (step === "model") {
        if (isSelectingFromList) {
          setIsSelectingFromList(false);
          setSelectedIndex(0);
        } else {
          setModelSearch("");
          if (provider === "external-agent") {
            setStep("externalAgentConfig");
          } else {
            setStep("provider");
            setSelectedIndex(
              PROVIDERS.findIndex((p) => p.id === provider) || 0
            );
          }
        }
      } else if (step === "workspace") {
        // Volver a modelo (funciona igual para todos los providers)
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
        const selectedProvider = PROVIDERS[selectedIndex].id;
        setProvider(selectedProvider);
        setSelectedIndex(0);
        setModelOptions([]); // Reset models for new provider
        // Preload models in background so they're ready when user gets to model step
        preloadModels(selectedProvider);
        // Si es external-agent, ir a configuración especial
        if (selectedProvider === "external-agent") {
          setStep("externalAgentConfig");
        } else {
          setStep("model");
        }
      }
      return;
    }

    // Paso 2: Configurar External Agent (preset + args opcionales)
    if (step === "externalAgentConfig") {
      if (externalAgentStep === "preset") {
        if (key.upArrow) {
          setSelectedPreset((i) => Math.max(0, i - 1));
        } else if (key.downArrow) {
          setSelectedPreset((i) => Math.min(AGENT_PRESETS.length - 1, i + 1));
        } else if (key.return) {
          const preset = AGENT_PRESETS[selectedPreset];
          if (preset.id === "custom") {
            // Para custom, vamos directo a args con el input vacío
            setExternalAgentArgs("");
          } else {
            // Para presets, guardamos el CLI y vamos a args
            setExternalAgentArgs(preset.cli);
            // Preload models in background (for CLI agents, fetches from API)
            preloadModels("external-agent", preset.cli);
          }
          setExternalAgentStep("args");
        }
      } else if (externalAgentStep === "args") {
        if (key.return) {
          // Parse final command
          const baseCmd = AGENT_PRESETS[selectedPreset].cli;
          const finalCli =
            baseCmd || externalAgentArgs.split(" ")[0] || "agent";
          const extraArgs = baseCmd
            ? externalAgentArgs
            : externalAgentArgs.split(" ").slice(1).join(" ");
          const agentName =
            finalCli.charAt(0).toUpperCase() + finalCli.slice(1);

          setExternalAgentConfig({
            cli: finalCli,
            args: extraArgs,
            agentName,
          });
          setExternalAgentStep("preset");
          setSelectedPreset(0);
          setExternalAgentArgs("");
          setModelOptions([]); // Reset so we load models for this CLI
          // Preload models from provider package (e.g. @openfarm/provider-aider)
          preloadModels("external-agent", finalCli);
          // Ir a seleccionar modelo (como los otros providers)
          setStep("model");
        }
      }
      return;
    }

    // Paso 3: Buscar/Seleccionar Model (opcional)
    if (step === "model") {
      if (key.tab && filteredModels.length > 0) {
        setIsSelectingFromList((current) => !current);
        if (!isSelectingFromList) {
          setSelectedIndex(0);
        }
      } else if (
        key.downArrow &&
        !isSelectingFromList &&
        filteredModels.length > 0
      ) {
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
          setModel(modelSearch.trim());
        }
        setModelSearch("");
        setIsSelectingFromList(false);
        setSelectedIndex(0);
        setStep("workspace");
      }
      return;
    }

    // Paso 4: Seleccionar Workspace
    if (step === "workspace") {
      if (key.upArrow) {
        setSelectedIndex((i) => Math.max(0, i - 1));
      } else if (key.downArrow) {
        setSelectedIndex((i) => Math.min(1, i + 1));
      } else if (key.return) {
        if (selectedIndex === 0) {
          setWorkspace(process.cwd());
          setSelectedIndex(0);
          setStep("task");
        } else {
          if (customPath.trim()) {
            setWorkspace(customPath.trim());
            setSelectedIndex(0);
            setStep("task");
          }
        }
      }
      return;
    }

    // Paso 5: Escribir Task
    if (step === "task") {
      if (key.return && task.trim()) {
        // Check if Task Loop workflow is selected
        if (selectedWorkflowId === "task_loop") {
          // Go to task loop screen
          setTask("");
          setModel("");
          setModelSearch("");
          setCustomPath("");
          setIsSelectingFromList(false);
          setStep("workflow");
          setSelectedIndex(0);
          setScreen("task-loop");
        } else {
          // Normal execution
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
            {workflows.length === 0 ? (
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

      {/* Paso 2: External Agent Config */}
      {provider === "external-agent" && (
        <Box flexDirection="column" gap={1}>
          <Text
            bold={step === "externalAgentConfig"}
            color={step === "externalAgentConfig" ? "cyan" : "gray"}
          >
            2. Connect Your Agent{" "}
            {step !== "workflow" &&
              step !== "provider" &&
              step !== "externalAgentConfig" &&
              externalAgentConfig.cli &&
              `(${externalAgentConfig.cli})`}
          </Text>

          {step === "externalAgentConfig" && (
            <Box flexDirection="column" gap={1} paddingLeft={2}>
              {externalAgentStep === "preset" ? (
                <>
                  <Text color="cyan">🚀 Choose an agent to connect</Text>
                  <Text color="gray" dimColor>
                    Select from popular CLI agents or use a custom command
                  </Text>

                  <Box flexDirection="column" gap={0}>
                    {AGENT_PRESETS.map((preset, index) => (
                      <Box flexDirection="row" gap={1} key={preset.id}>
                        <Text
                          color={index === selectedPreset ? "yellow" : "gray"}
                        >
                          {index === selectedPreset ? "▶" : " "}
                        </Text>
                        <Text
                          bold={index === selectedPreset}
                          color={index === selectedPreset ? "white" : "gray"}
                        >
                          {preset.name}
                        </Text>
                        <Text color="gray" dimColor>
                          {" "}
                          — {preset.description}
                        </Text>
                      </Box>
                    ))}
                  </Box>

                  <Text color="gray" dimColor>
                    Press <Text color="white">↑↓</Text> to navigate •{" "}
                    <Text color="white">Enter</Text> to select •{" "}
                    <Text color="white">Esc</Text> to go back
                  </Text>
                </>
              ) : (
                <>
                  <Text color="cyan">
                    ⚙️ Extra arguments for{" "}
                    <Text color="yellow">
                      {AGENT_PRESETS[selectedPreset].name.split(" ")[1]}
                    </Text>
                  </Text>
                  <Text color="gray" dimColor>
                    Optional flags like <Text color="yellow">--verbose</Text>,{" "}
                    <Text color="yellow">--model gpt-4</Text>, etc.
                  </Text>

                  <Box borderColor="yellow" borderStyle="single" padding={1}>
                    <TextInput
                      focus={step === "externalAgentConfig"}
                      onChange={setExternalAgentArgs}
                      placeholder="--verbose --project myapp"
                      value={externalAgentArgs}
                    />
                  </Box>

                  <Text color="gray" dimColor>
                    Press <Text color="white">Enter</Text> to confirm •{" "}
                    <Text color="white">Esc</Text> to change preset
                  </Text>
                </>
              )}
            </Box>
          )}
        </Box>
      )}

      {provider === "external-agent" && (
        <Text color="gray">{"─".repeat(60)}</Text>
      )}

      {/* Paso 3: Model (skip for external-agent) */}
      <Box flexDirection="column" gap={1}>
        <Text
          bold={step === "model"}
          color={step === "model" ? "cyan" : "gray"}
        >
          {provider === "external-agent" ? "3" : "2"}. Select Model (optional){" "}
          {step !== "workflow" &&
            step !== "provider" &&
            step !== "externalAgentConfig" &&
            step !== "model" &&
            model &&
            `(${model})`}
        </Text>

        {step === "model" && (
          <Box flexDirection="column" gap={1} paddingLeft={2}>
            <Box flexDirection="column" gap={0}>
              <Text color="gray" dimColor>
                {loadingModels
                  ? "Loading models..."
                  : modelOptions.length > 0
                    ? `Search ${modelOptions.length} models or type custom:`
                    : "Type model name:"}
              </Text>
              <Box
                borderColor={isSelectingFromList ? "gray" : "yellow"}
                borderStyle="single"
                padding={1}
              >
                <TextInput
                  focus={step === "model" && !isSelectingFromList}
                  onChange={setModelSearch}
                  placeholder="e.g. claude, gemini, gpt..."
                  value={modelSearch}
                />
              </Box>
            </Box>

            {filteredModels.length > 0 && (
              <Box flexDirection="column" gap={0} marginTop={1}>
                <Text color="gray" dimColor>
                  {allFilteredModels.length} match
                  {allFilteredModels.length !== 1 ? "es" : ""}
                  {allFilteredModels.length > filteredModels.length
                    ? ` (showing ${filteredModels.length})`
                    : ""}
                  :
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
                  ? "↑↓ Navigate • Enter Select • Tab Search • Esc Back"
                  : modelSearch.trim()
                    ? "↓ Select from list • Enter Use custom • Tab Results"
                    : "Type to search • Enter Skip (use default)"}
              </Text>
            </Box>
          </Box>
        )}
      </Box>

      <Text color="gray">{"─".repeat(60)}</Text>

      {/* Paso 4: Workspace */}
      <Box flexDirection="column" gap={1}>
        <Text
          bold={step === "workspace"}
          color={step === "workspace" ? "cyan" : "gray"}
        >
          {provider === "external-agent" ? "4" : "3"}. Select Workspace{" "}
          {step === "task" && `(${workspace})`}
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
                    focus={step === "workspace" && selectedIndex === 1}
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

      {/* Paso 5: Task */}
      <Box flexDirection="column" gap={1}>
        <Text bold={step === "task"} color={step === "task" ? "cyan" : "gray"}>
          {provider === "external-agent" ? "5" : "4"}. Describe Task
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
                focus={step === "task"}
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
