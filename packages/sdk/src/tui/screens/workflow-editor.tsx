import type { Workflow, WorkflowStep } from "@openfarm/core";
import { StepType } from "@openfarm/core";
import { getDb, updateWorkflow } from "@openfarm/core/db";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import { useState } from "react";
import { useStore } from "../store";

type EditMode =
  | "view"
  | "edit-id"
  | "edit-name"
  | "edit-desc"
  | "edit-step-id"
  | "edit-step-action"
  | "edit-step-type"
  | "edit-step-prompt"
  | "edit-step-timeout"
  | "edit-step-retry"
  | "edit-step-model";

const STEP_TYPE_LABELS: Record<string, string> = {
  [StepType.GIT]: "git",
  [StepType.CODE]: "code",
  [StepType.LLM]: "llm",
  [StepType.COMMAND]: "command",
  [StepType.PLATFORM]: "platform",
  [StepType.PLANNING]: "planning",
  [StepType.HUMAN]: "human",
  [StepType.REVIEW]: "review",
  [StepType.CONDITIONAL]: "conditional",
  [StepType.LOOP]: "loop",
  [StepType.PARALLEL]: "parallel",
};

const STEP_TYPES = Object.values(StepType);

function isWorkflowStep(step: unknown): step is WorkflowStep {
  return (
    typeof step === "object" &&
    step !== null &&
    "id" in step &&
    "type" in step &&
    "action" in step
  );
}

export function WorkflowEditor() {
  const {
    setScreen,
    currentWorkflow,
    setCurrentWorkflow,
    setWorkflows,
    workflows,
  } = useStore();
  const [mode, setMode] = useState<EditMode>("view");
  const [selectedField, setSelectedField] = useState(0);
  const [selectedStep, setSelectedStep] = useState(0);
  const [editValue, setEditValue] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);

  const workflow = currentWorkflow;
  const steps = workflow?.steps || [];
  const currentStep = steps[selectedStep] as WorkflowStep | undefined;

  const saveToDb = async (updated: Workflow) => {
    try {
      const db = await getDb();
      const result = await updateWorkflow(db, updated.id, () => updated);

      if (!result.ok) {
        setMessage(`Error: ${result.error.message}`);
        return;
      }

      const newWorkflows = workflows.map((w) =>
        w.id === updated.id ? updated : w
      );
      setWorkflows(newWorkflows);
      setMessage("Saved!");
      setTimeout(() => setMessage(null), 2000);
    } catch (e) {
      setMessage(`Error: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const updateStep = (index: number, updates: Partial<WorkflowStep>) => {
    if (!workflow) {
      return;
    }
    const newSteps = [...steps];
    newSteps[index] = { ...newSteps[index], ...updates } as WorkflowStep;
    const updated = {
      ...workflow,
      steps: newSteps,
      updatedAt: new Date().toISOString(),
    };
    setCurrentWorkflow(updated);
    return updated;
  };

  const updateStepConfig = (
    index: number,
    configUpdates: Record<string, unknown>
  ) => {
    if (!(workflow && currentStep)) {
      return;
    }
    const newConfig = { ...currentStep.config, ...configUpdates };
    return updateStep(index, { config: newConfig });
  };

  const getStepFieldValue = (field: EditMode): string => {
    if (!currentStep) {
      return "";
    }
    switch (field) {
      case "edit-step-id":
        return currentStep.id;
      case "edit-step-action":
        return currentStep.action;
      case "edit-step-type":
        return currentStep.type;
      case "edit-step-prompt":
        return currentStep.prompt || "";
      case "edit-step-timeout":
        return currentStep.timeout?.toString() || "";
      case "edit-step-retry":
        return currentStep.retryCount?.toString() || "0";
      case "edit-step-model":
        return (currentStep.config?.model as string) || "";
      default:
        return "";
    }
  };

  const saveEdit = () => {
    if (!workflow) {
      return;
    }

    const trimmed = editValue.trim();
    let updated: Workflow | undefined;

    switch (mode) {
      case "edit-id":
        if (trimmed) {
          updated = {
            ...workflow,
            id: trimmed,
            updatedAt: new Date().toISOString(),
          };
          setCurrentWorkflow(updated);
        }
        break;
      case "edit-name":
        updated = {
          ...workflow,
          name: trimmed || undefined,
          updatedAt: new Date().toISOString(),
        };
        setCurrentWorkflow(updated);
        break;
      case "edit-desc":
        updated = {
          ...workflow,
          description: trimmed || undefined,
          updatedAt: new Date().toISOString(),
        };
        setCurrentWorkflow(updated);
        break;
      case "edit-step-id":
        if (trimmed && currentStep) {
          updated = updateStep(selectedStep, { id: trimmed });
        }
        break;
      case "edit-step-action":
        if (trimmed && currentStep) {
          updated = updateStep(selectedStep, { action: trimmed });
        }
        break;
      case "edit-step-type":
        if (trimmed && currentStep) {
          updated = updateStep(selectedStep, { type: trimmed as StepType });
        }
        break;
      case "edit-step-prompt":
        if (currentStep) {
          updated = updateStep(selectedStep, { prompt: trimmed || undefined });
        }
        break;
      case "edit-step-timeout":
        if (currentStep) {
          const timeout = Number.parseInt(trimmed, 10);
          if (!Number.isNaN(timeout)) {
            updated = updateStep(selectedStep, { timeout });
          }
        }
        break;
      case "edit-step-retry":
        if (currentStep) {
          const retry = Number.parseInt(trimmed, 10);
          if (!Number.isNaN(retry)) {
            updated = updateStep(selectedStep, { retryCount: retry });
          }
        }
        break;
      case "edit-step-model":
        if (currentStep) {
          updated = updateStepConfig(selectedStep, {
            model: trimmed || undefined,
          });
        }
        break;
    }

    if (updated) {
      saveToDb(updated);
    }
    setMode("view");
    setEditValue("");
    setEditingField(null);
  };

  const startEdit = (field: EditMode) => {
    setMode(field);
    setEditValue(getStepFieldValue(field));
    setEditingField(field.replace("edit-step-", "").toUpperCase());
  };

  useInput((input, key) => {
    if (key.escape) {
      if (mode !== "view") {
        setMode("view");
        setEditValue("");
        setEditingField(null);
      } else {
        setScreen("workflows");
      }
      return;
    }

    if (mode !== "view") {
      if (key.return) {
        saveEdit();
      }
      return;
    }

    const maxField = steps.length > 0 ? 3 : 2;

    if (key.upArrow) {
      if (selectedField === 3 && steps.length > 0) {
        setSelectedStep((s) => Math.max(0, s - 1));
      } else {
        setSelectedField((f) => Math.max(0, f - 1));
      }
    } else if (key.downArrow) {
      if (selectedField === 3 && steps.length > 0) {
        setSelectedStep((s) => Math.min(steps.length - 1, s + 1));
      } else {
        setSelectedField((f) => Math.min(maxField, f + 1));
      }
    } else if (key.return) {
      if (!workflow) {
        return;
      }

      const field = ["id", "name", "description", "steps"][selectedField];

      if (field === "id") {
        setMode("edit-id");
        setEditValue(workflow.id);
        setEditingField("WORKFLOW ID");
      } else if (field === "name") {
        setMode("edit-name");
        setEditValue(workflow.name || "");
        setEditingField("WORKFLOW NAME");
      } else if (field === "description") {
        setMode("edit-desc");
        setEditValue(workflow.description || "");
        setEditingField("DESCRIPTION");
      } else if (field === "steps" && currentStep) {
        startEdit("edit-step-id");
      }
    }

    if ((input === "s" || input === "S") && workflow) {
      saveToDb({ ...workflow, updatedAt: new Date().toISOString() });
    }

    if ((input === "a" || input === "A") && workflow) {
      const newStep: WorkflowStep = {
        id: `step_${steps.length + 1}`,
        type: StepType.CODE,
        action: "agent.code",
        config: {},
      };
      const updated = {
        ...workflow,
        steps: [...steps, newStep],
        updatedAt: new Date().toISOString(),
      };
      setCurrentWorkflow(updated);
      saveToDb(updated);
      setSelectedStep(steps.length);
      setSelectedField(3);
    }

    if (
      (input === "d" || input === "D") &&
      selectedField === 3 &&
      steps.length > 0 &&
      workflow
    ) {
      const newSteps = [...steps];
      newSteps.splice(selectedStep, 1);
      const updated = {
        ...workflow,
        steps: newSteps,
        updatedAt: new Date().toISOString(),
      };
      setCurrentWorkflow(updated);
      saveToDb(updated);
      if (selectedStep >= newSteps.length) {
        setSelectedStep(Math.max(0, newSteps.length - 1));
      }
    }

    // Direct field editing with number keys
    if (selectedField === 3 && currentStep) {
      switch (input) {
        case "1":
          startEdit("edit-step-id");
          break;
        case "2":
          startEdit("edit-step-action");
          break;
        case "3":
          startEdit("edit-step-type");
          break;
        case "4":
          startEdit("edit-step-prompt");
          break;
        case "5":
          startEdit("edit-step-timeout");
          break;
        case "6":
          startEdit("edit-step-retry");
          break;
        case "7":
          startEdit("edit-step-model");
          break;
      }

      const currentTypeIndex = STEP_TYPES.indexOf(currentStep.type);
      if (key.leftArrow && currentTypeIndex > 0) {
        const updated = updateStep(selectedStep, {
          type: STEP_TYPES[currentTypeIndex - 1],
        });
        if (updated) {
          saveToDb(updated);
        }
      } else if (key.rightArrow && currentTypeIndex < STEP_TYPES.length - 1) {
        const updated = updateStep(selectedStep, {
          type: STEP_TYPES[currentTypeIndex + 1],
        });
        if (updated) {
          saveToDb(updated);
        }
      }
    }
  });

  if (!workflow) {
    return (
      <Box flexDirection="column" gap={1}>
        <Text color="red">No workflow selected</Text>
        <Text color="gray">Press Esc to go back</Text>
      </Box>
    );
  }

  const isEditing = mode !== "view";

  return (
    <Box flexDirection="column" gap={1}>
      <Box flexDirection="row" justifyContent="space-between">
        <Text bold color="cyan">
          Workflow Editor
        </Text>
        <Box flexDirection="row" gap={2}>
          {editingField && <Text color="yellow">Editing: {editingField}</Text>}
          {message && (
            <Text color={message.startsWith("S") ? "green" : "red"}>
              {message}
            </Text>
          )}
        </Box>
      </Box>
      <Text color="gray">{"─".repeat(60)}</Text>

      {isEditing && (
        <Box
          borderColor="yellow"
          borderStyle="double"
          flexDirection="column"
          gap={1}
          padding={1}
        >
          <Text bold color="yellow">
            ✏️ EDITING: {editingField}
          </Text>
          <TextInput
            onChange={setEditValue}
            placeholder={`Enter ${editingField?.toLowerCase()}...`}
            value={editValue}
          />
          <Text color="gray" dimColor>
            Press Enter to save • Esc to cancel
          </Text>
        </Box>
      )}

      <Box flexDirection="column" gap={1}>
        <Box flexDirection="column">
          <Text
            bold={selectedField === 0}
            color={selectedField === 0 ? "cyan" : "gray"}
          >
            ID: {workflow.id}
          </Text>
        </Box>

        <Box flexDirection="column">
          <Text
            bold={selectedField === 1}
            color={selectedField === 1 ? "cyan" : "gray"}
          >
            Name: {workflow.name || "(none)"}
          </Text>
        </Box>

        <Box flexDirection="column">
          <Text
            bold={selectedField === 2}
            color={selectedField === 2 ? "cyan" : "gray"}
          >
            Description:
          </Text>
          <Text color="gray" dimColor>
            {workflow.description || "(none)"}
          </Text>
        </Box>

        <Box flexDirection="column" gap={1}>
          <Text
            bold={selectedField === 3}
            color={selectedField === 3 ? "cyan" : "gray"}
          >
            Steps ({steps.length}):
          </Text>

          <Box flexDirection="column" paddingLeft={2}>
            {steps.map((step, index) => {
              if (!isWorkflowStep(step)) {
                return null;
              }
              const isSelected = selectedField === 3 && index === selectedStep;

              return (
                <Box
                  borderColor={isSelected ? "yellow" : undefined}
                  borderStyle={isSelected ? "single" : undefined}
                  flexDirection="column"
                  gap={0}
                  key={`${step.id}-${index}`}
                  padding={1}
                >
                  <Text color={isSelected ? "yellow" : "gray"}>
                    Step {index + 1}: {step.id}
                  </Text>

                  {isSelected && (
                    <Box flexDirection="column" gap={0} paddingLeft={2}>
                      <Text color="cyan">1-ID: {step.id}</Text>
                      <Text color="cyan">2-Action: {step.action}</Text>
                      <Text color="cyan">
                        3-Type: {STEP_TYPE_LABELS[step.type] || step.type}
                      </Text>
                      <Text color="cyan">
                        4-Prompt:{" "}
                        {step.prompt
                          ? `${step.prompt.slice(0, 40)}...`
                          : "(none)"}
                      </Text>
                      <Text color="cyan">
                        5-Timeout: {step.timeout || "(none)"}ms
                      </Text>
                      <Text color="cyan">6-Retry: {step.retryCount || 0}</Text>
                      <Text color="cyan">
                        7-Model: {(step.config?.model as string) || "(default)"}
                      </Text>
                    </Box>
                  )}

                  {!isSelected && (
                    <Text color="gray" dimColor>
                      {step.action} • {STEP_TYPE_LABELS[step.type] || step.type}
                      {step.config?.model ? ` • ${step.config.model}` : ""}
                    </Text>
                  )}
                </Box>
              );
            })}
          </Box>
        </Box>
      </Box>

      <Text color="gray">{"─".repeat(60)}</Text>

      <Box flexDirection="column" gap={0}>
        {selectedField === 3 && currentStep ? (
          <>
            <Text color="gray">
              Step: 1=ID 2=Action 3=Type 4=Prompt 5=Timeout 6=Retry 7=Model
            </Text>
            <Text color="gray">
              Type: ←/→ • Add: A • Delete: D • Save: S • Esc: Back
            </Text>
          </>
        ) : (
          <Text color="gray">
            Navigate: ↑/↓ • Edit: Enter • Add Step: A • Save: S • Esc: Back
          </Text>
        )}
      </Box>
    </Box>
  );
}
