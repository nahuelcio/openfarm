import React from "react";
import { useTheme } from "../theme/styles";
import { useAppStore } from "../store";

export function History() {
  const theme = useTheme("dark");
  const { executions, setCurrentExecution, setScreen } = useAppStore();

  const handleSelect = (id: string) => {
    const execution = executions.find((e) => e.id === id);
    if (execution) {
      setCurrentExecution(execution);
      setScreen("execution-detail");
    }
  };

  return (
    <box flexDirection="column" gap={1}>
      <text>
        <span fg={theme.colors.text.primary}><strong>📜 Execution History</strong></span>
      </text>

      {executions.length === 0 ? (
        <box
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          flexGrow={1}
        >
          <text>
            <span fg={theme.colors.text.muted}>No executions yet</span>
          </text>
          <text>
            <span fg={theme.colors.accent}>Press Ctrl+N to create one</span>
          </text>
        </box>
      ) : (
        <box flexDirection="column" gap={1}>
          {/* Header Row */}
          <box
            flexDirection="row"
            padding={1}
            backgroundColor={theme.colors.surface}
            borderStyle="single"
            borderColor={theme.colors.border}
          >
            <box width={8}>
              <text><span fg={theme.colors.text.secondary}><strong>ID</strong></span></text>
            </box>
            <box width={12}>
              <text><span fg={theme.colors.text.secondary}><strong>Status</strong></span></text>
            </box>
            <box width={12}>
              <text><span fg={theme.colors.text.secondary}><strong>Provider</strong></span></text>
            </box>
            <box flexGrow={1}>
              <text><span fg={theme.colors.text.secondary}><strong>Task</strong></span></text>
            </box>
            <box width={16}>
              <text><span fg={theme.colors.text.secondary}><strong>Time</strong></span></text>
            </box>
          </box>

          {/* Execution Rows */}
          {executions.map((exec) => (
            <box
              key={exec.id}
              flexDirection="row"
              padding={1}
              borderStyle="single"
              borderColor={theme.colors.border}
              onMouseDown={() => handleSelect(exec.id)}
            >
              <box width={8}>
                <text>
                  <span fg={theme.colors.text.muted}>{exec.id.slice(-6)}</span>
                </text>
              </box>
              <box width={12}>
                <StatusText status={exec.status} />
              </box>
              <box width={12}>
                <text>
                  <span fg={theme.colors.text.primary}>{exec.provider}</span>
                </text>
              </box>
              <box flexGrow={1}>
                <text>
                  <span fg={theme.colors.text.primary}>
                    {exec.task.substring(0, 30)}
                    {exec.task.length > 30 ? "..." : ""}
                  </span>
                </text>
              </box>
              <box width={16}>
                <text>
                  <span fg={theme.colors.text.secondary}>
                    {exec.startedAt.toLocaleTimeString()}
                  </span>
                </text>
              </box>
            </box>
          ))}
        </box>
      )}
    </box>
  );
}

function StatusText({ status }: { status: string }) {
  const theme = useTheme("dark");
  const colors: Record<string, string> = {
    pending: theme.colors.warning,
    running: theme.colors.accent,
    completed: theme.colors.success,
    failed: theme.colors.error,
  };
  const labels: Record<string, string> = {
    pending: "⏳ Pending",
    running: "🔄 Running",
    completed: "✅ Done",
    failed: "❌ Failed",
  };

  return (
    <text>
      <span fg={colors[status] || theme.colors.text.muted}>
        {labels[status] || status}
      </span>
    </text>
  );
}
