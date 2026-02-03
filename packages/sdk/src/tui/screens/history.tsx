import { getDb, getWorkflows } from "@openfarm/core/db";
import { Box, Text, useInput } from "ink";
import { useEffect, useState } from "react";
import { type Execution, useStore } from "../store";

export function History() {
  const {
    setScreen,
    executions,
    setSelectedExecutionForDiff,
    setCurrentExecution,
    addExecution,
    setTask,
    setProvider,
    setModel,
    setWorkspace,
    setSelectedWorkflowId,
  } = useStore();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [workflowNames, setWorkflowNames] = useState<Record<string, string>>(
    {}
  );

  // Load workflow names
  useEffect(() => {
    const loadWorkflows = async () => {
      try {
        const db = await getDb();
        const workflows = await getWorkflows(db);
        const names: Record<string, string> = {};
        for (const w of workflows) {
          names[w.id] = w.name;
        }
        setWorkflowNames(names);
      } catch {
        // Ignore errors
      }
    };
    loadWorkflows();
  }, []);

  const rerunExecution = (execution: Execution) => {
    // Set up the task details from the previous execution
    setTask(execution.task);
    setProvider(execution.provider);
    if (execution.model) {
      setModel(execution.model);
    }
    setWorkspace(execution.workspace);
    // Set the workflow from the previous execution (default to task_runner if not set)
    setSelectedWorkflowId(execution.workflowId || "task_runner");

    // Create a new execution
    const newExecution: Execution = {
      id: `exec-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
      task: execution.task,
      provider: execution.provider,
      model: execution.model,
      workspace: execution.workspace,
      status: "pending",
      startedAt: new Date(),
    };

    addExecution(newExecution);
    setCurrentExecution(newExecution);
    setScreen("running");
  };

  useInput((input, key) => {
    if (key.escape) {
      setScreen("dashboard");
    }
    if (key.upArrow) {
      setSelectedIndex(Math.max(0, selectedIndex - 1));
    }
    if (key.downArrow) {
      setSelectedIndex(Math.min(executions.length - 1, selectedIndex + 1));
    }
    if (key.return && executions.length > 0) {
      const selected = executions[selectedIndex];
      if (selected) {
        setCurrentExecution(selected);
        setScreen("execution-detail");
      }
    }
    // Press 'd' to view diff directly
    if (input === "d" && executions.length > 0) {
      const selected = executions[selectedIndex];
      if (selected?.diff) {
        setSelectedExecutionForDiff(selected);
        setScreen("diff-viewer");
      }
    }
    // Press 'r' to rerun the execution
    if (input === "r" && executions.length > 0) {
      const selected = executions[selectedIndex];
      if (selected) {
        rerunExecution(selected);
      }
    }
  });

  return (
    <Box flexDirection="column" gap={1}>
      {/* Header */}
      <Text bold color="cyan">
        📜 History
      </Text>
      <Text color="gray">{"─".repeat(60)}</Text>

      {/* List */}
      {executions.length === 0 ? (
        <Text color="gray">No executions yet.</Text>
      ) : (
        executions.map((e, i) => (
          <Box flexDirection="row" gap={1} key={e.id}>
            <Text color={i === selectedIndex ? "yellow" : "gray"}>
              {i === selectedIndex ? "▶" : " "}
            </Text>
            <Text color={getStatusColor(e.status)}>
              {getStatusIcon(e.status)}
            </Text>
            <Box flexDirection="column" flexGrow={1}>
              <Text color={i === selectedIndex ? "white" : "gray"}>
                {e.task.slice(0, 45)}
                {e.task.length > 45 ? "..." : ""}
              </Text>
              <Text color="gray" dimColor>
                {e.provider}
                {e.workflowId &&
                  ` • ${workflowNames[e.workflowId] || e.workflowId}`}
                {" • "}
                {e.startedAt.toLocaleTimeString()}
                {e.diff && " • has diff"}
              </Text>
            </Box>
          </Box>
        ))
      )}

      <Text color="gray">{"─".repeat(60)}</Text>

      {/* Help */}
      <Text color="gray">
        ↑/↓ navigate • Enter view details • d view diff • r rerun • Esc back
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
    case "running":
      return "yellow";
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
    case "running":
      return "◐";
    default:
      return "○";
  }
}
