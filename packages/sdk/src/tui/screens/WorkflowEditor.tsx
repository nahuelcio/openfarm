import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import { useState } from "react";
import { useStore } from "../store";
import { getDb, updateWorkflow } from "@openfarm/core/db";
import { StepType } from "@openfarm/core";
import type { Workflow, WorkflowStep } from "@openfarm/core";

type EditMode = "view" | "edit-id" | "edit-name" | "edit-desc";

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

  const saveToDb = async (updated: Workflow) => {
    try {
      const db = await getDb();
      const result = await updateWorkflow(db, updated.id, () => updated);
      
      if (!result.ok) {
        setMessage(`Error: ${result.error.message}`);
        return;
      }

      // Update local list
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

  useInput((input, key) => {
    if (key.escape) {
      if (mode !== "view") {
        setMode("view");
        setEditValue("");
      } else {
        setScreen("workflows");
      }
      return;
    }

    if (mode !== "view") {
      if (key.return && currentWorkflow) {
        const updated = { ...currentWorkflow, updatedAt: new Date().toISOString() };
        
        if (mode === "edit-id" && editValue.trim()) {
          updated.id = editValue.trim();
        } else if (mode === "edit-name") {
          updated.name = editValue.trim() || undefined;
        } else if (mode === "edit-desc") {
          updated.description = editValue.trim() || undefined;
        }
        
        setCurrentWorkflow(updated);
        saveToDb(updated);
        setMode("view");
        setEditValue("");
      }
      return;
    }

    const steps = currentWorkflow?.steps || [];
    const maxField = steps.length > 0 ? 3 : 2;

    if (key.upArrow) {
      if (selectedField === 3 && steps.length > 0) {
        setSelectedStep((s) => Math.max(0, s - 1));
      } else {
        setSelectedField((f) => Math.max(0, f - 1));
        setSelectedStep(0);
      }
    } else if (key.downArrow) {
      if (selectedField === 3 && steps.length > 0) {
        setSelectedStep((s) => Math.min(steps.length - 1, s + 1));
      } else {
        setSelectedField((f) => Math.min(maxField, f + 1));
        setSelectedStep(0);
      }
    } else if (key.return && currentWorkflow) {
      const field = ["id", "name", "description", "steps"][selectedField];
      if (field === "id") {
        setMode("edit-id");
        setEditValue(currentWorkflow.id);
      } else if (field === "name") {
        setMode("edit-name");
        setEditValue(currentWorkflow.name || "");
      } else if (field === "description") {
        setMode("edit-desc");
        setEditValue(currentWorkflow.description || "");
      }
    }

    if ((input === "s" || input === "S") && currentWorkflow) {
      saveToDb({ ...currentWorkflow, updatedAt: new Date().toISOString() });
    }

    if ((input === "a" || input === "A") && currentWorkflow) {
      const newStep: WorkflowStep = {
        id: `step_${steps.length + 1}`,
        type: StepType.CODE,
        action: "agent.code",
        config: {},
      };
      const updated = {
        ...currentWorkflow,
        steps: [...steps, newStep],
        updatedAt: new Date().toISOString(),
      };
      setCurrentWorkflow(updated);
      saveToDb(updated);
    }

    if (
      (input === "d" || input === "D") &&
      selectedField === 3 &&
      currentWorkflow?.steps &&
      currentWorkflow.steps.length > 0
    ) {
      const newSteps = [...currentWorkflow.steps];
      newSteps.splice(selectedStep, 1);
      const updated = { 
        ...currentWorkflow, 
        steps: newSteps,
        updatedAt: new Date().toISOString(),
      };
      setCurrentWorkflow(updated);
      saveToDb(updated);
      if (selectedStep >= newSteps.length) {
        setSelectedStep(Math.max(0, newSteps.length - 1));
      }
    }
  });

  const isEditing = (field: string) => mode === (`edit-${field}` as EditMode);

  if (!currentWorkflow) {
    return (
      <Box flexDirection="column" gap={1}>
        <Text color="red">No workflow selected</Text>
        <Text color="gray">Press Esc to go back</Text>
      </Box>
    );
  }

  const workflow = currentWorkflow;

  return (
    <Box flexDirection="column" gap={1}>
      <Box flexDirection="row" justifyContent="space-between">
        <Text bold color="cyan">
          Workflow Editor
        </Text>
        {message && (
          <Text color={message.startsWith("S") ? "green" : "red"}>{message}</Text>
        )}
      </Box>
      <Text color="gray">{"─".repeat(60)}</Text>

      <Box flexDirection="column" gap={1}>
        <Box flexDirection="column">
          <Text bold={selectedField === 0} color={selectedField === 0 ? "cyan" : "gray"}>
            ID: {isEditing("id") ? "" : workflow.id}
          </Text>
          {isEditing("id") && (
            <Box borderColor="yellow" borderStyle="single" padding={1}>
              <TextInput onChange={setEditValue} value={editValue} />
            </Box>
          )}
        </Box>

        <Box flexDirection="column">
          <Text bold={selectedField === 1} color={selectedField === 1 ? "cyan" : "gray"}>
            Name: {isEditing("name") ? "" : workflow.name || "(none)"}
          </Text>
          {isEditing("name") && (
            <Box borderColor="yellow" borderStyle="single" padding={1}>
              <TextInput onChange={setEditValue} value={editValue} />
            </Box>
          )}
        </Box>

        <Box flexDirection="column">
          <Text bold={selectedField === 2} color={selectedField === 2 ? "cyan" : "gray"}>
            Description:
          </Text>
          {isEditing("desc") ? (
            <Box borderColor="yellow" borderStyle="single" padding={1}>
              <TextInput onChange={setEditValue} value={editValue} />
            </Box>
          ) : (
            <Text color="gray" dimColor>
              {workflow.description || "(none)"}
            </Text>
          )}
        </Box>

        <Box flexDirection="column" gap={1}>
          <Text bold={selectedField === 3} color={selectedField === 3 ? "cyan" : "gray"}>
            Steps ({workflow.steps?.length || 0}):
          </Text>

          <Box flexDirection="column" paddingLeft={2}>
            {workflow.steps?.map((step, index) => {
              if (!isWorkflowStep(step)) return null;
              const timeout = step.timeout;
              return (
                <Box
                  key={`${step.id}-${index}`}
                  borderColor={selectedField === 3 && index === selectedStep ? "yellow" : undefined}
                  borderStyle={selectedField === 3 && index === selectedStep ? "single" : undefined}
                  flexDirection="row"
                  gap={1}
                  padding={1}
                >
                  <Text color={selectedField === 3 && index === selectedStep ? "yellow" : "gray"}>
                    {index + 1}.
                  </Text>
                  <Box flexDirection="column" gap={0}>
                    <Text
                      bold={selectedField === 3 && index === selectedStep}
                      color={selectedField === 3 && index === selectedStep ? "white" : "gray"}
                    >
                      {step.id} ({STEP_TYPE_LABELS[step.type] || step.type})
                    </Text>
                    <Text color="gray" dimColor>
                      Action: {step.action}
                      {timeout ? ` • timeout: ${timeout}ms` : ""}
                    </Text>
                  </Box>
                </Box>
              );
            })}
          </Box>
        </Box>
      </Box>

      <Text color="gray">{"─".repeat(60)}</Text>

      <Box flexDirection="column" gap={0}>
        <Text color="gray">Navigate: Up/Down • Edit: Enter • Save: S • Add Step: A</Text>
        <Text color="gray">
          {selectedField === 3 && workflow.steps?.length ? "Delete Step: D • " : ""}
          Back: Esc
        </Text>
      </Box>
    </Box>
  );
}
