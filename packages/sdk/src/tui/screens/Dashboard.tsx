import React, { useCallback } from "react";
import { useTheme } from "../theme/styles";
import { useAppStore } from "../store";
import { Button, Card } from "../components/ui";

export function Dashboard() {
  const theme = useTheme("dark");
  const { setScreen, executions } = useAppStore();

  const successCount = executions.filter((e) => e.status === "completed").length;
  const failCount = executions.filter((e) => e.status === "failed").length;
  const runningCount = executions.filter((e) => e.status === "running").length;

  const goToExecute = useCallback(() => setScreen("execute"), [setScreen]);
  const goToHistory = useCallback(() => setScreen("history"), [setScreen]);

  return (
    <box flexDirection="column" gap={2}>
      {/* Title */}
      <text>
        <span fg={theme.colors.text.primary}><strong>🌾 Dashboard</strong></span>
      </text>

      {/* Stats Row */}
      <box flexDirection="row" gap={2}>
        <StatCard
          label="Total"
          value={executions.length}
          color={theme.colors.accent}
          icon="📊"
        />
        <StatCard
          label="Success"
          value={successCount}
          color={theme.colors.success}
          icon="✅"
        />
        <StatCard
          label="Failed"
          value={failCount}
          color={theme.colors.error}
          icon="❌"
        />
        {runningCount > 0 && (
          <StatCard
            label="Running"
            value={runningCount}
            color={theme.colors.warning}
            icon="🔄"
          />
        )}
      </box>

      {/* Quick Actions */}
      <box flexDirection="column" gap={1} marginTop={1}>
        <text>
          <span fg={theme.colors.text.secondary}>Quick Actions</span>
        </text>
        <box flexDirection="row" gap={2}>
          <Button onPress={goToExecute}>🚀 New Task</Button>
          <Button onPress={goToHistory}>📜 History</Button>
        </box>
      </box>

      {/* Recent Activity */}
      <box flexDirection="column" gap={1} marginTop={1}>
        <text>
          <span fg={theme.colors.text.secondary}>Recent Activity</span>
        </text>
        {executions.length === 0 ? (
          <Card>
            <text>
              <span fg={theme.colors.text.muted}>No executions yet. Press Ctrl+N to start!</span>
            </text>
          </Card>
        ) : (
          executions.slice(0, 5).map((exec, index) => (
            <box
              key={exec.id}
              flexDirection="row"
              gap={2}
              padding={1}
              borderStyle="single"
              borderColor={index === 0 ? theme.colors.accent : theme.colors.border}
              backgroundColor={index === 0 ? theme.colors.surface : undefined}
            >
              <StatusBadge status={exec.status} />
              <box flexGrow={1}>
                <text>
                  <span fg={theme.colors.text.primary}>
                    {exec.task.substring(0, 50)}
                    {exec.task.length > 50 ? "..." : ""}
                  </span>
                </text>
              </box>
              <text>
                <span fg={theme.colors.text.muted}>{exec.provider}</span>
              </text>
            </box>
          ))
        )}
      </box>

      {/* Keyboard hint */}
      <box marginTop={2}>
        <text>
          <span fg={theme.colors.text.muted}>
            Press Ctrl+N for new task • Ctrl+H for history • Ctrl+Q to quit
          </span>
        </text>
      </box>
    </box>
  );
}

function StatCard({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: number;
  color: string;
  icon: string;
}) {
  const theme = useTheme("dark");

  return (
    <Card width={16} borderColor={color}>
      <box flexDirection="column" alignItems="center">
        <text>
          <strong>{icon} {value}</strong>
        </text>
        <text>
          <span fg={theme.colors.text.secondary}>{label}</span>
        </text>
      </box>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const theme = useTheme("dark");
  const colors: Record<string, string> = {
    pending: theme.colors.warning,
    running: theme.colors.accent,
    completed: theme.colors.success,
    failed: theme.colors.error,
  };
  const icons: Record<string, string> = {
    pending: "⏳",
    running: "🔄",
    completed: "✅",
    failed: "❌",
  };

  return (
    <text>
      <span fg={colors[status] || theme.colors.text.muted}>
        {icons[status] || "❓"}
      </span>
    </text>
  );
}
