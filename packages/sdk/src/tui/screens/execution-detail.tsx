import { getDb, getWorkflows } from "@openfarm/core/db";
import { Box, Text, useInput } from "ink";
import { useEffect, useState } from "react";
import { useStore } from "../store";

export function ExecutionDetail() {
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
      <Text bold color="cyan">
        📋 Execution Details
      </Text>
      <Text color="gray">{"─".repeat(60)}</Text>

      {/* Basic Info */}
      <Box flexDirection="column" gap={1}>
        <Text>
          <Text color="gray">Task: </Text>
          <Text color="white">{task}</Text>
        </Text>
        <Text>
          <Text color="gray">Provider: </Text>
          <Text color="white">{provider}</Text>
        </Text>
        {workflowId && (
          <Text>
            <Text color="gray">Workflow: </Text>
            <Text color="white">{workflowName || workflowId}</Text>
          </Text>
        )}
        {model && (
          <Text>
            <Text color="gray">Model: </Text>
            <Text color="white">{model}</Text>
          </Text>
        )}
        <Text>
          <Text color="gray">Status: </Text>
          <Text color={getStatusColor(status)}>
            {getStatusIcon(status)} {status}
          </Text>
        </Text>
        <Text>
          <Text color="gray">Started: </Text>
          <Text color="white">{startedAt.toLocaleString()}</Text>
        </Text>
        {completedAt && (
          <Text>
            <Text color="gray">Completed: </Text>
            <Text color="white">{completedAt.toLocaleString()}</Text>
          </Text>
        )}
        {duration && (
          <Text>
            <Text color="gray">Duration: </Text>
            <Text color="white">{(duration / 1000).toFixed(2)}s</Text>
          </Text>
        )}
        {diff && (
          <Text>
            <Text color="gray">Changes: </Text>
            <Text color="green">Yes (view with 'd' key)</Text>
          </Text>
        )}
      </Box>

      <Text color="gray">{"─".repeat(60)}</Text>

      {/* Output */}
      <Text bold color="cyan">
        Output
      </Text>
      <Box
        borderColor="gray"
        borderStyle="single"
        flexDirection="column"
        padding={1}
      >
        {output ? (
          <Text color="white">{output.slice(-2000)}</Text> // Show last 2000 chars
        ) : (
          <Text color="gray">No output available</Text>
        )}
      </Box>

      {/* Error if any */}
      {error && (
        <>
          <Text bold color="red">
            Error
          </Text>
          <Box
            borderColor="red"
            borderStyle="single"
            flexDirection="column"
            padding={1}
          >
            <Text color="red">{error}</Text>
          </Box>
        </>
      )}

      <Text color="gray">{"─".repeat(60)}</Text>

      {/* Help */}
      <Text color="gray">
        Esc back
        {currentExecution?.status === "running" && " • c cancel"}
        {currentExecution?.diff && " • d view diff"}
        {" • r rerun"}
      </Text>
    </Box>
  );
}

function getStatusColor(status: string): string {
  switch (status) {
    case "completed":
      return "green";
    case "failed":
      return "red";
    case "cancelled":
      return "yellow";
    case "running":
      return "cyan";
    default:
      return "gray";
  }
}

function getStatusIcon(status: string): string {
  switch (status) {
    case "completed":
      return "✓";
    case "failed":
      return "✗";
    case "cancelled":
      return "⊘";
    case "running":
      return "◐";
    default:
      return "○";
  }
}
