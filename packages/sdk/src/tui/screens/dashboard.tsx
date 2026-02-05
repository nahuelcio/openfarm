import { Box, Text, useInput } from "@openfarm/tui-opentui";
import { KeyHelpBar } from "../components";
import { useStore } from "../store";
import { useThemeColors } from "../theme/hooks";
import { getStatusColor, getStatusIcon } from "../utils/status-helpers";

export function Dashboard() {
  const { setScreen, executions, config } = useStore();
  const colors = useThemeColors();

  useInput((input, key) => {
    if (input === "1" || (key.ctrl && input === "n")) {
      setScreen("execute");
    } else if (input === "2" || (key.ctrl && input === "h")) {
      setScreen("history");
    } else if (input === "3" || (key.ctrl && input === "w")) {
      setScreen("workflows");
    } else if (input === "4") {
      setScreen("context-config");
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
        <Text bold color={colors.primary}>
          🌾 OpenFarm
        </Text>
        <Text color={colors.muted}>
          Provider: {config?.defaultProvider || "external-agent"}
        </Text>
      </Box>

      <Text color={colors.border}>{"─".repeat(60)}</Text>

      {/* Stats */}
      <Box flexDirection="row" gap={4}>
        <Text>Total: {executions.length}</Text>
        <Text color={colors.success}>Success: {successCount}</Text>
        <Text color={colors.error}>Failed: {failedCount}</Text>
      </Box>

      <Text color={colors.border}>{"─".repeat(60)}</Text>

      {/* Menu */}
      <Text bold>Menu:</Text>
      <Box flexDirection="column" gap={1}>
        <Text>
          <Text color={colors.primary}>1</Text> - New Task
        </Text>
        <Text>
          <Text color={colors.primary}>2</Text> - History
        </Text>
        <Text>
          <Text color={colors.primary}>3</Text> - Workflows
        </Text>
        <Text>
          <Text color={colors.primary}>4</Text> - Generate Context
        </Text>
        <Text>
          <Text color={colors.primary}>Ctrl+Q</Text> - Quit
        </Text>
      </Box>

      <Text color={colors.border}>{"─".repeat(60)}</Text>

      {/* Recent */}
      <Text bold>Recent Tasks:</Text>
      {executions.length === 0 ? (
        <Text color={colors.muted}>No executions yet. Press 1 to start.</Text>
      ) : (
        executions.slice(0, 5).map((e) => (
          <Box flexDirection="row" gap={2} key={e.id}>
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

      <Text color={colors.border}>{"─".repeat(60)}</Text>

      {/* Help */}
      <KeyHelpBar
        hints={[
          { key: "1", label: "New Task" },
          { key: "2", label: "History" },
          { key: "3", label: "Workflows" },
          { key: "4", label: "Context" },
          { key: "Ctrl+Q", label: "Quit" },
        ]}
      />
    </Box>
  );
}
