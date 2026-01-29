import React, { useState } from "react";
import { useTheme } from "../theme/styles";
import { useAppStore } from "../store";
import { Button } from "../components/ui";

type Tab = "output" | "stats" | "log";

export function ExecutionDetail() {
  const theme = useTheme("dark");
  const { currentExecution, setScreen } = useAppStore();
  const [activeTab, setActiveTab] = useState<Tab>("output");

  if (!currentExecution) {
    setScreen("history");
    return null;
  }

  const { task, provider, status, result, startedAt, completedAt } = currentExecution;

  const duration = completedAt
    ? Math.floor((completedAt.getTime() - startedAt.getTime()) / 1000)
    : 0;

  return (
    <box flexDirection="column" gap={1}>
      {/* Header */}
      <box flexDirection="row" alignItems="center" gap={2}>
        <text>
          <span fg={theme.colors.text.primary}><strong>📄 Execution {currentExecution.id.slice(-6)}</strong></span>
        </text>
        <StatusBadge status={status} />
      </box>

      {/* Info */}
      <box flexDirection="column" gap={1}>
        <InfoRow label="Task" value={task} />
        <InfoRow label="Provider" value={provider} />
        <InfoRow label="Started" value={startedAt.toLocaleString()} />
        {completedAt && <InfoRow label="Completed" value={completedAt.toLocaleString()} />}
        {duration > 0 && <InfoRow label="Duration" value={`${duration}s`} />}
        {result?.tokens && <InfoRow label="Tokens" value={result.tokens.toString()} />}
      </box>

      {/* Tabs */}
      <box flexDirection="row" gap={2} marginTop={1}>
        <TabButton active={activeTab === "output"} onPress={() => setActiveTab("output")}>
          📝 Output
        </TabButton>
        <TabButton active={activeTab === "stats"} onPress={() => setActiveTab("stats")}>
          📊 Stats
        </TabButton>
        <TabButton active={activeTab === "log"} onPress={() => setActiveTab("log")}>
          📜 Log
        </TabButton>
      </box>

      {/* Content */}
      <box
        flexGrow={1}
        borderStyle="single"
        borderColor={theme.colors.border}
        backgroundColor={theme.colors.surface}
        padding={1}
      >
        {activeTab === "output" && (
          <text>
            <span fg={theme.colors.text.primary}>
              {result?.output || "No output available"}
            </span>
          </text>
        )}
        {activeTab === "stats" && (
          <box flexDirection="column" gap={1}>
            <StatRow label="Success" value={result?.success ? "Yes" : "No"} />
            <StatRow label="Duration" value={`${duration}s`} />
            <StatRow label="Tokens Used" value={result?.tokens?.toString() || "N/A"} />
            {result?.error && (
              <StatRow label="Error" value={result.error} color={theme.colors.error} />
            )}
          </box>
        )}
        {activeTab === "log" && (
          <text>
            <span fg={theme.colors.text.muted}>Full execution log would appear here...</span>
          </text>
        )}
      </box>

      {/* Actions */}
      <box flexDirection="row" gap={2} marginTop={1}>
        <Button onPress={() => setScreen("history")}>← Back</Button>
        <Button onPress={() => setScreen("execute")} variant="primary">
          🔄 Re-run
        </Button>
      </box>
    </box>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  const theme = useTheme("dark");
  return (
    <box flexDirection="row">
      <box width={12}>
        <text><span fg={theme.colors.text.secondary}>{label}:</span></text>
      </box>
      <text><span fg={theme.colors.text.primary}>{value}</span></text>
    </box>
  );
}

function StatRow({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  const theme = useTheme("dark");
  return (
    <box flexDirection="row">
      <box width={15}>
        <text><span fg={theme.colors.text.secondary}>{label}:</span></text>
      </box>
      <text>
        <span fg={color || theme.colors.text.primary}>{value}</span>
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

  return (
    <box
      paddingLeft={1}
      paddingRight={1}
      backgroundColor={colors[status] || theme.colors.border}
    >
      <text>
        <span fg="#ffffff"><strong>{status.toUpperCase()}</strong></span>
      </text>
    </box>
  );
}

function TabButton({
  children,
  active,
  onPress,
}: {
  children: React.ReactNode;
  active: boolean;
  onPress: () => void;
}) {
  const theme = useTheme("dark");
  return (
    <box
      paddingLeft={2}
      paddingRight={2}
      paddingTop={1}
      paddingBottom={1}
      backgroundColor={active ? theme.colors.accent : theme.colors.surface}
      borderStyle={active ? "double" : "single"}
      borderColor={active ? theme.colors.accent : theme.colors.border}
      onMouseDown={onPress}
    >
      <text>
        <span fg={active ? "#ffffff" : theme.colors.text.primary}>{children}</span>
      </text>
    </box>
  );
}
