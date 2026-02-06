import { getDb, getWorkflows } from "@openfarm/core/db";
import { Box, Text, useInput } from "@openfarm/tui-opentui";
import { useEffect, useState } from "react";
import { KeyHelpBar } from "../components";
import { useListNavigation } from "../hooks";
import { type Execution, useStore } from "../store";
import { useThemeColors } from "../theme/hooks";
import { useExecutionRuntimeStore } from "../store/execution-runtime-store";
import { getStatusColor, getStatusIcon } from "../utils/status-helpers";

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
  const colors = useThemeColors();
  const [workflowNames, setWorkflowNames] = useState<Record<string, string>>(
    {}
  );

  // Use shared list navigation hook
  const { selectedIndex } = useListNavigation({
    itemCount: executions.length,
    isActive: true,
    wrap: true,
    onSelect: (index) => {
      const selected = executions[index];
      if (selected) {
        setCurrentExecution(selected);
        // If this execution has an active runtime session, go to live view
        const runtimeSession = useExecutionRuntimeStore
          .getState()
          .getSession(selected.id);
        if (runtimeSession && !runtimeSession.isDone) {
          setScreen("running");
        } else {
          setScreen("execution-detail");
        }
      }
    },
  });

  // Load workflow names
  useEffect(() => {
    const loadWorkflows = async () => {
      try {
        const db = await getDb();
        const workflows = await getWorkflows(db);
        const names: Record<string, string> = {};
        for (const w of workflows) {
          names[w.id] = w.name ?? "";
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

  // Handle special keys not covered by useListNavigation
  useInput((input, key) => {
    if (key.escape) {
      setScreen("dashboard");
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
      <Text bold color={colors.primary}>
        📜 History
      </Text>
      <Text color={colors.border}>{"─".repeat(60)}</Text>

      {/* List */}
      {executions.length === 0 ? (
        <Text color={colors.muted}>No executions yet.</Text>
      ) : (
        executions.map((e, i) => (
          <Box flexDirection="row" gap={1} key={e.id}>
            <Text
              color={i === selectedIndex ? colors.selectedBg : colors.muted}
            >
              {i === selectedIndex ? "▶" : " "}
            </Text>
            <Text color={getStatusColor(e.status)}>
              {getStatusIcon(e.status)}
            </Text>
            <Box flexDirection="column" flexGrow={1}>
              <Text
                color={i === selectedIndex ? colors.foreground : colors.muted}
              >
                {e.task.slice(0, 45)}
                {e.task.length > 45 ? "..." : ""}
              </Text>
              <Text color={colors.muted} dimColor>
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

      <Text color={colors.border}>{"─".repeat(60)}</Text>

      {/* Help */}
      <KeyHelpBar
        hints={[
          { key: "↑/↓", label: "Navigate" },
          { key: "Enter", label: "View details" },
          { key: "d", label: "View diff" },
          { key: "r", label: "Rerun" },
          { key: "Esc", label: "Back" },
        ]}
      />
    </Box>
  );
}
