import { Box, Text, useInput } from "ink";
import { useStore } from "../store";

export function Dashboard() {
  const { setScreen, executions, config } = useStore();

  useInput((input, key) => {
    if (input === "1" || (key.ctrl && input === "n")) {
      setScreen("execute");
    } else if (input === "2" || (key.ctrl && input === "h")) {
      setScreen("history");
    } else if (input === "3" || (key.ctrl && input === "w")) {
      setScreen("workflows");
    } else if (key.ctrl && input === "q") {
      process.exit(0);
    }
  });

  const successCount = executions.filter(
    (e) => e.status === "completed"
  ).length;
  const failedCount = executions.filter((e) => e.status === "failed").length;

  return (
    <Box flexDirection="column" gap={1}>
      {/* Header */}
      <Box flexDirection="row" justifyContent="space-between">
        <Text bold color="cyan">
          🌾 OpenFarm
        </Text>
        <Text color="gray">
          Provider: {config?.defaultProvider || "opencode"}
        </Text>
      </Box>

      <Text color="gray">{"─".repeat(60)}</Text>

      {/* Stats */}
      <Box flexDirection="row" gap={4}>
        <Text>Total: {executions.length}</Text>
        <Text color="green">Success: {successCount}</Text>
        <Text color="red">Failed: {failedCount}</Text>
      </Box>

      <Text color="gray">{"─".repeat(60)}</Text>

      {/* Menu */}
      <Text bold>Menu:</Text>
      <Text>
        {" "}
        <Text color="cyan">1</Text> - New Task
      </Text>
      <Text>
        {" "}
        <Text color="cyan">2</Text> - History
      </Text>
      <Text>
        {" "}
        <Text color="cyan">3</Text> - Workflows
      </Text>
      <Text>
        {" "}
        <Text color="cyan">Ctrl+Q</Text> - Quit
      </Text>

      <Text color="gray">{"─".repeat(60)}</Text>

      {/* Recent */}
      <Text bold>Recent Tasks:</Text>
      {executions.length === 0 ? (
        <Text color="gray">No executions yet. Press 1 to start.</Text>
      ) : (
        executions.slice(0, 5).map((e) => (
          <Box key={e.id} flexDirection="row" gap={2}>
            <Text color={getStatusColor(e.status)}>
              {getStatusIcon(e.status)}
            </Text>
            <Text>
              {e.task.slice(0, 50)}
              {e.task.length > 50 ? "..." : ""}
            </Text>
          </Box>
        ))
      )}
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
