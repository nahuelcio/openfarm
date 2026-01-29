import { Box, Text, useInput } from "ink";
import { useStore } from "../store";

export function History() {
  const { setScreen, executions } = useStore();

  useInput((input, key) => {
    if (key.escape) {
      setScreen("dashboard");
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
        executions.map((e) => (
          <Box key={e.id} flexDirection="row" gap={2}>
            <Text color={getStatusColor(e.status)}>
              {getStatusIcon(e.status)}
            </Text>
            <Box flexDirection="column" flexGrow={1}>
              <Text>
                {e.task.slice(0, 45)}
                {e.task.length > 45 ? "..." : ""}
              </Text>
              <Text color="gray" dimColor>
                {e.provider} • {e.startedAt.toLocaleTimeString()}
              </Text>
            </Box>
          </Box>
        ))
      )}

      <Text color="gray">{"─".repeat(60)}</Text>

      {/* Help */}
      <Text color="gray">Esc to go back</Text>
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
