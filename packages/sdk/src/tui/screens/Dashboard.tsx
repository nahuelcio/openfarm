import React, { useCallback, useEffect } from "react";
import { useTheme } from "../theme/styles";
import { useAppStore } from "../store";
import { Card } from "../components/ui";
import { useRenderer } from "@opentui/react";

export function Dashboard() {
  const theme = useTheme("dark");
  const { setScreen, executions } = useAppStore();
  const renderer = useRenderer();

  const successCount = executions.filter((e) => e.status === "completed").length;
  const failCount = executions.filter((e) => e.status === "failed").length;

  // Number key navigation
  useEffect(() => {
    if (!renderer) return;

    const handleKey = (event: { name: string; ctrl: boolean }) => {
      if (event.ctrl) return;

      switch (event.name) {
        case "1":
          setScreen("execute");
          break;
        case "2":
          setScreen("history");
          break;
        case "3":
          setScreen("settings");
          break;
      }
    };

    renderer.keyInput.on("key", handleKey);
    return () => {
      renderer.keyInput.off("key", handleKey);
    };
  }, [renderer, setScreen]);

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
      </box>

      {/* Quick Actions with Number Keys */}
      <box flexDirection="column" gap={1} marginTop={1}>
        <text>
          <span fg={theme.colors.text.secondary}>Quick Actions (press number key)</span>
        </text>
        <box flexDirection="row" gap={2}>
          <ActionButton 
            number="1" 
            label="New Task" 
            icon="🚀"
            onPress={goToExecute}
            color={theme.colors.accent}
          />
          <ActionButton 
            number="2" 
            label="History" 
            icon="📜"
            onPress={goToHistory}
            color={theme.colors.info}
          />
          <ActionButton 
            number="3" 
            label="Settings" 
            icon="⚙️"
            onPress={() => setScreen("settings")}
            color={theme.colors.warning}
          />
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
              <span fg={theme.colors.text.muted}>
                No executions yet. Press <strong>1</strong> to start or Ctrl+N
              </span>
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
                    {exec.task.substring(0, 45)}
                    {exec.task.length > 45 ? "..." : ""}
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

      {/* Keyboard Help */}
      <box marginTop={2} flexDirection="column" gap={1}>
        <text>
          <span fg={theme.colors.text.muted}>Quick Keys:</span>
        </text>
        <box flexDirection="row" gap={4}>
          <text>
            <span fg={theme.colors.accent}><strong>1</strong></span>
            <span fg={theme.colors.text.muted}> New</span>
          </text>
          <text>
            <span fg={theme.colors.info}><strong>2</strong></span>
            <span fg={theme.colors.text.muted}> History</span>
          </text>
          <text>
            <span fg={theme.colors.warning}><strong>3</strong></span>
            <span fg={theme.colors.text.muted}> Settings</span>
          </text>
          <text>
            <span fg={theme.colors.text.secondary}><strong>Ctrl+N</strong></span>
            <span fg={theme.colors.text.muted}> New Task</span>
          </text>
          <text>
            <span fg={theme.colors.text.secondary}><strong>Ctrl+Q</strong></span>
            <span fg={theme.colors.text.muted}> Quit</span>
          </text>
        </box>
      </box>
    </box>
  );
}

function ActionButton({
  number,
  label,
  icon,
  onPress,
  color,
}: {
  number: string;
  label: string;
  icon: string;
  onPress: () => void;
  color: string;
}) {
  const theme = useTheme("dark");

  return (
    <box
      flexDirection="column"
      alignItems="center"
      padding={1}
      borderStyle="single"
      borderColor={color}
      onMouseDown={onPress}
    >
      <text>
        <span fg={color}><strong>{number}</strong></span>
      </text>
      <text>
        <span fg={theme.colors.text.primary}>{icon} {label}</span>
      </text>
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
