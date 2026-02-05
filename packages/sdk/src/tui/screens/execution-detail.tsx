import { getDb, getWorkflows } from "@openfarm/core/db";
import { Box, Text, useInput } from "@openfarm/tui-opentui";
import { useEffect, useState } from "react";
import { KeyHelpBar } from "../components";
import { useStore } from "../store";
import { useThemeColors } from "../theme/hooks";
import { getStatusColor, getStatusIcon } from "../utils/status-helpers";

export function ExecutionDetail() {
  const colors = useThemeColors();
  const {
    setScreen,
    currentExecution,
    addExecution,
    updateExecution,
    setTask,
    setProvider,
    setModel,
    setWorkspace,
    setCurrentExecution,
    setSelectedWorkflowId,
  } = useStore();
  const [workflowName, setWorkflowName] = useState<string | null>(null);

  // Load workflow name
  useEffect(() => {
    const loadWorkflow = async () => {
      if (currentExecution?.workflowId) {
        try {
          const db = await getDb();
          const workflows = await getWorkflows(db);
          const workflow = workflows.find(
            (w) => w.id === currentExecution.workflowId
          );
          setWorkflowName(workflow?.name || currentExecution.workflowId);
        } catch {
          setWorkflowName(currentExecution.workflowId);
        }
      }
    };
    loadWorkflow();
  }, [currentExecution?.workflowId]);

  const rerunExecution = () => {
    if (!currentExecution) {
      return;
    }

    // Set up the task details from the previous execution
    setTask(currentExecution.task);
    setProvider(currentExecution.provider);
    if (currentExecution.model) {
      setModel(currentExecution.model);
    }
    setWorkspace(currentExecution.workspace);
    // Set the workflow from the previous execution (default to task_runner if not set)
    setSelectedWorkflowId(currentExecution.workflowId || "task_runner");

    // Create a new execution
    const newExecution = {
      id: `exec-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
      task: currentExecution.task,
      provider: currentExecution.provider,
      model: currentExecution.model,
      workspace: currentExecution.workspace,
      status: "pending" as const,
      startedAt: new Date(),
    };

    addExecution(newExecution);
    setCurrentExecution(newExecution);
    setScreen("running");
  };

  useInput((input, key) => {
    if (key.escape) {
      setScreen("history");
    }
    if (input === "r") {
      rerunExecution();
    }
    if (input === "d" && currentExecution?.diff) {
      setScreen("diff-viewer");
    }
    if (input === "c" && currentExecution?.status === "running") {
      // Cancel the running execution
      updateExecution(currentExecution.id, { status: "cancelled" });
    }
  });

  if (!currentExecution) {
    return (
      <Box flexDirection="column">
        <Text color="red">No execution selected</Text>
      </Box>
    );
  }

  const {
    task,
    provider,
    model,
    status,
    startedAt,
    completedAt,
    duration,
    output,
    error,
    diff,
    workflowId,
  } = currentExecution;

  return (
    <Box flexDirection="column" gap={1}>
      {/* Header */}
      <Text bold color={colors.primary}>
        📋 Execution Details
      </Text>
      <Text color={colors.border}>{"─".repeat(60)}</Text>

      {/* Basic Info */}
      <Box flexDirection="column" gap={1}>
        <Text>
          <Text color={colors.muted}>Task: </Text>
          <Text color={colors.foreground}>{task}</Text>
        </Text>
        <Text>
          <Text color={colors.muted}>Provider: </Text>
          <Text color={colors.foreground}>{provider}</Text>
        </Text>
        {workflowId && (
          <Text>
            <Text color={colors.muted}>Workflow: </Text>
            <Text color={colors.foreground}>{workflowName || workflowId}</Text>
          </Text>
        )}
        {model && (
          <Text>
            <Text color={colors.muted}>Model: </Text>
            <Text color={colors.foreground}>{model}</Text>
          </Text>
        )}
        <Text>
          <Text color={colors.muted}>Status: </Text>
          <Text color={getStatusColor(status)}>
            {getStatusIcon(status)} {status}
          </Text>
        </Text>
        <Text>
          <Text color={colors.muted}>Started: </Text>
          <Text color={colors.foreground}>{startedAt.toLocaleString()}</Text>
        </Text>
        {completedAt && (
          <Text>
            <Text color={colors.muted}>Completed: </Text>
            <Text color={colors.foreground}>
              {completedAt.toLocaleString()}
            </Text>
          </Text>
        )}
        {duration && (
          <Text>
            <Text color={colors.muted}>Duration: </Text>
            <Text color={colors.foreground}>
              {(duration / 1000).toFixed(2)}s
            </Text>
          </Text>
        )}
        {diff && (
          <Text>
            <Text color={colors.muted}>Changes: </Text>
            <Text color={colors.success}>Yes (view with 'd' key)</Text>
          </Text>
        )}
      </Box>

      <Text color={colors.border}>{"─".repeat(60)}</Text>

      {/* Output */}
      <Text bold color={colors.primary}>
        Output
      </Text>
      <Box
        borderColor={colors.border}
        borderStyle="single"
        flexDirection="column"
        padding={1}
      >
        {output ? (
          <Text color={colors.foreground}>{output.slice(-2000)}</Text>
        ) : (
          <Text color={colors.muted}>No output available</Text>
        )}
      </Box>

      {/* Error if any */}
      {error && (
        <>
          <Text bold color={colors.error}>
            Error
          </Text>
          <Box
            borderColor={colors.error}
            borderStyle="single"
            flexDirection="column"
            padding={1}
          >
            <Text color={colors.error}>{error}</Text>
          </Box>
        </>
      )}

      <Text color={colors.border}>{"─".repeat(60)}</Text>

      {/* Help */}
      <KeyHelpBar
        hints={[
          { key: "Esc", label: "Back" },
          ...(currentExecution?.status === "running"
            ? [{ key: "c", label: "Cancel" }]
            : []),
          ...(currentExecution?.diff ? [{ key: "d", label: "View diff" }] : []),
          { key: "r", label: "Rerun" },
        ]}
      />
    </Box>
  );
}
