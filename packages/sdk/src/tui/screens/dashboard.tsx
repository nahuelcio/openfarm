import { Box, Text, useInput } from "@openfarm/tui-opentui";
import { useStore } from "../store";
import { useThemeColors } from "../theme/hooks";
import { getStatusColor, getStatusIcon } from "../utils/status-helpers";

export function Dashboard() {
  const { setScreen, executions, config } = useStore();
  const colors = useThemeColors();

  useInput((input, key) => {
    if (input === "1") {
      setScreen("execute");
    } else if (input === "2") {
      setScreen("multi-agent-dashboard");
    } else if (input === "3") {
      setScreen("history");
    } else if (key.ctrl && input === "q") {
      process.exit(0);
    }
  });

  const successCount = executions.filter(
    (e) => e.status === "completed"
  ).length;
  const failedCount = executions.filter((e) => e.status === "failed").length;

  return (
    <Box flexDirection="column" gap={2} padding={2}>
      <Text bold color={colors.primary} fontSize={20}>
        🌾 OpenFarm
      </Text>
      <Text color={colors.muted}>
        Provider: {config?.defaultProvider || "external-agent"}
      </Text>

      <Text color={colors.border}>{"─".repeat(50)}</Text>

      <Box flexDirection="row" gap={4}>
        <Text>Total: {executions.length}</Text>
        <Text color={colors.success}>Success: {successCount}</Text>
        <Text color={colors.error}>Failed: {failedCount}</Text>
      </Box>

      <Text color={colors.border}>{"─".repeat(50)}</Text>

      <Text bold>Menu:</Text>
      <Box flexDirection="column" gap={1}>
        <Text>
          <Text color={colors.primary}>1</Text> - ⚡ Execute (Run a task)
        </Text>
        <Text>
          <Text color={colors.primary}>2</Text> - 🤖 Agents (Multi-Agent Dashboard)
        </Text>
        <Text>
          <Text color={colors.primary}>3</Text> - 📜 History
        </Text>
      </Box>

      <Text color={colors.border}>{"─".repeat(50)}</Text>

      {executions.length === 0 ? (
        <Text color={colors.muted}>No executions yet. Press 1 to start.</Text>
      ) : (
        <>
          <Text bold>Recent:</Text>
          {executions.slice(0, 5).map((e) => (
            <Box key={e.id} flexDirection="row" gap={2}>
              <Text color={getStatusColor(e.status)}>
                {getStatusIcon(e.status)}
              </Text>
              <Text numberOfLines={1}>
                {e.task.slice(0, 50)}
                {e.task.length > 50 ? "..." : ""}
              </Text>
            </Box>
          ))}
        </>
      )}

      <Text color={colors.muted} dim>
        [Ctrl+Q] Quit
      </Text>
    </Box>
  );
}
