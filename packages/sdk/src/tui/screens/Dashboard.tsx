import React from "react";
import { useTheme } from "../theme/styles";
import { useAppStore } from "../store";
import { Button } from "../components/ui";

export function Dashboard() {
  const theme = useTheme("dark");
  const { setScreen, executions } = useAppStore();

  const successCount = executions.filter((e) => e.status === "completed").length;
  const failCount = executions.filter((e) => e.status === "failed").length;

  return (
    <box flexDirection="column" gap={2}>
      {/* Title */}
      <text>
        <span fg={theme.colors.text.primary}><strong>🌾 Dashboard</strong></span>
      </text>

      {/* Stats Row */}
      <box flexDirection="row" gap={4}>
        <StatCard
          label="Total Tasks"
          value={executions.length}
          color={theme.colors.accent}
        />
        <StatCard
          label="Successful"
          value={successCount}
          color={theme.colors.success}
        />
        <StatCard
          label="Failed"
          value={failCount}
          color={theme.colors.error}
        />
      </box>

      {/* Quick Actions */}
      <box flexDirection="column" gap={1} marginTop={2}>
        <text>
          <span fg={theme.colors.text.secondary}>Quick Actions</span>
        </text>
        <box flexDirection="row" gap={2}>
          <Button onPress={() => setScreen("execute")}>🚀 New Task</Button>
          <Button onPress={() => setScreen("history")}>📜 View History</Button>
        </box>
      </box>

      {/* Recent Activity */}
      <box flexDirection="column" gap={1} marginTop={2}>
        <text>
          <span fg={theme.colors.text.secondary}>Recent Activity</span>
        </text>
        {executions.length === 0 ? (
          <text>
            <span fg={theme.colors.text.muted}>No executions yet</span>
          </text>
        ) : (
          executions.slice(0, 5).map((exec) => (
            <box
              key={exec.id}
              flexDirection="row"
              gap={2}
              padding={1}
              borderStyle="single"
              borderColor={theme.colors.border}
            >
              <StatusBadge status={exec.status} />
              <text>
                <span fg={theme.colors.text.primary}>
                  {exec.task.substring(0, 40)}
                  {exec.task.length > 40 ? "..." : ""}
                </span>
              </text>
            </box>
          ))
        )}
      </box>
    </box>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  const theme = useTheme("dark");

  return (
    <box
      width={20}
      padding={1}
      borderStyle="single"
      borderColor={color}
      flexDirection="column"
      alignItems="center"
    >
      <text>
        <span fg={color}><strong>{value}</strong></span>
      </text>
      <text>
        <span fg={theme.colors.text.secondary}>{label}</span>
      </text>
    </box>
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
