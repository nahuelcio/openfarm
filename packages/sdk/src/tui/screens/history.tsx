import { Box, Text, useInput } from "ink";
import { useState } from "react";
import { useStore } from "../store";

export function History() {
  const { setScreen, executions, setSelectedExecutionForDiff } = useStore();
  const [selectedIndex, setSelectedIndex] = useState(0);

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
      if (selected?.diff) {
        setSelectedExecutionForDiff(selected);
        setScreen("diff-viewer");
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
                {e.provider} • {e.startedAt.toLocaleTimeString()}
                {e.diff && " • has diff"}
              </Text>
            </Box>
          </Box>
        ))
      )}

      <Text color="gray">{"─".repeat(60)}</Text>

      {/* Help */}
      <Text color="gray">
        Use ↑/↓ to navigate, Enter to view diff, Esc to go back
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
