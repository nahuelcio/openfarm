import { Box, Text, useInput } from "@openfarm/tui-opentui";
import { useState } from "react";
import { KeyHelpBar } from "../components";
import { OverlayContainer } from "../components/task-loop/overlay-container";
import { useNavigationKeys } from "../hooks";
import { useStore } from "../store";
import { useThemeColors } from "../theme/hooks";
import { getStatusColor, getStatusIcon } from "../utils/status-helpers";

export function Dashboard() {
  const { setScreen, executions, config } = useStore();
  const colors = useThemeColors();
  const [helpVisible, setHelpVisible] = useState(false);

  // Use standardized navigation keys
  const { showingHelp } = useNavigationKeys({
    screen: "dashboard",
    enableHelp: true,
    enableQuit: true,
    onQuit: () => process.exit(0),
    onNavigate: setScreen,
    onToggleHelp: setHelpVisible,
  });

  // Screen-specific shortcuts
  useInput((input, key) => {
    // Don't process if help is showing (handled by useNavigationKeys)
    if (showingHelp || helpVisible) {
      return;
    }

    if (input === "1" || (key.ctrl && input === "n")) {
      setScreen("execute");
    } else if (input === "2" || (key.ctrl && input === "h")) {
      setScreen("history");
    } else if (input === "3" || (key.ctrl && input === "w")) {
      setScreen("workflows");
    } else if (input === "4") {
      setScreen("context-config");
    } else if (input === "5" || (key.ctrl && input === "a")) {
      setScreen("agent-chat");
    } else if (key.ctrl && input === "q") {
      process.exit(0);
    }
  });

  // Help content for dashboard
  const helpContent = (
    <>
      <Box flexDirection="column">
        <Text bold>Navigation</Text>
        <Text> 1 New Task (execute)</Text>
        <Text> 2 History</Text>
        <Text> 3 Workflows</Text>
        <Text> 4 Generate Context</Text>
        <Text> d Go to Dashboard</Text>
      </Box>
      <Box flexDirection="column" marginTop={1}>
        <Text bold>System</Text>
        <Text> ? Toggle Help</Text>
        <Text> Ctrl+Q Quit</Text>
        <Text> q Quit</Text>
      </Box>
    </>
  );

  // Render help overlay if showing
  if (showingHelp || helpVisible) {
    return (
      <Box flexDirection="column" gap={1}>
        <Box flexDirection="row" justifyContent="space-between">
          <Text bold color={colors.primary}>
            🌾 OpenFarm
          </Text>
          <Text color={colors.muted}>
            Provider: {config?.defaultProvider || "external-agent"}
          </Text>
        </Box>
        <Text color={colors.border}>{"─".repeat(60)}</Text>
        <OverlayContainer title="Dashboard Help">
          {helpContent}
        </OverlayContainer>
      </Box>
    );
  }

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
          <Text color={colors.primary}>5</Text> - Agent Chat 💬
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
          { key: "5", label: "Chat" },
          { key: "?", label: "Help" },
          { key: "Ctrl+Q", label: "Quit" },
        ]}
      />
    </Box>
  );
}
