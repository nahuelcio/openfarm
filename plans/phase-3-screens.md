# Fase 3: Pantallas Principales

> **Duración estimada**: 3-4 horas  
> **Dependencias**: Fase 2 completada  
> **Objetivo**: Implementar las 5 pantallas principales del TUI

---

## 📋 Checklist

- [ ] 3.1 Pantalla Dashboard
- [ ] 3.2 Pantalla Execute (nueva tarea)
- [ ] 3.3 Pantalla Executing (ejecución en progreso)
- [ ] 3.4 Pantalla History
- [ ] 3.5 Pantalla Execution Detail
- [ ] 3.6 Pantalla Settings

---

## 3.1 Pantalla Dashboard

### Archivo: `packages/sdk/src/tui/screens/Dashboard.tsx`

```tsx
import React from "react";
import { Box, Text } from "opentui";
import { useTheme } from "../theme/styles";
import { useAppStore } from "../store";
import { Button } from "../components/ui";

export function Dashboard() {
  const theme = useTheme("dark");
  const { setScreen, executions } = useAppStore();

  const recentExecutions = executions.slice(0, 5);
  const successCount = executions.filter((e) => e.status === "completed").length;
  const failCount = executions.filter((e) => e.status === "failed").length;

  return (
    <Box flexDirection="column" gap={2}>
      {/* Title */}
      <Text color={theme.colors.text.primary} bold>
        🌾 Dashboard
      </Text>

      {/* Stats Row */}
      <Box flexDirection="row" gap={4}>
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
      </Box>

      {/* Quick Actions */}
      <Box flexDirection="column" gap={1} marginTop={2}>
        <Text color={theme.colors.text.secondary}>Quick Actions</Text>
        <Box flexDirection="row" gap={2}>
          <Button onPress={() => setScreen("execute")}>🚀 New Task</Button>
          <Button onPress={() => setScreen("history")}>📜 View History</Button>
        </Box>
      </Box>

      {/* Recent Activity */}
      <Box flexDirection="column" gap={1} marginTop={2}>
        <Text color={theme.colors.text.secondary}>Recent Activity</Text>
        {recentExecutions.length === 0 ? (
          <Text color={theme.colors.text.muted}>No executions yet</Text>
        ) : (
          recentExecutions.map((exec) => (
            <Box
              key={exec.id}
              flexDirection="row"
              gap={2}
              padding={1}
              borderStyle="single"
              borderColor={theme.colors.border}
            >
              <StatusBadge status={exec.status} />
              <Text color={theme.colors.text.primary}>
                {exec.task.substring(0, 40)}
                {exec.task.length > 40 ? "..." : ""}
              </Text>
            </Box>
          ))
        )}
      </Box>
    </Box>
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
    <Box
      width={20}
      padding={1}
      borderStyle="single"
      borderColor={color}
      flexDirection="column"
      alignItems="center"
    >
      <Text color={color} bold>
        {value}
      </Text>
      <Text color={theme.colors.text.secondary}>{label}</Text>
    </Box>
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
    <Text color={colors[status] || theme.colors.text.muted}>
      {icons[status] || "❓"}
    </Text>
  );
}
```

---

## 3.2 Pantalla Execute (Nueva Tarea)

### Archivo: `packages/sdk/src/tui/screens/Execute.tsx`

```tsx
import React, { useState } from "react";
import { Box, Text } from "opentui";
import { useTheme } from "../theme/styles";
import { useAppStore } from "../store";
import { Button, Input } from "../components/ui";
import type { ExecutorType } from "../../types";

const providers: { id: ExecutorType; name: string; models: string[] }[] = [
  {
    id: "opencode",
    name: "OpenCode",
    models: ["claude-3.5-sonnet", "gpt-4", "gpt-4o"],
  },
  {
    id: "claude-code",
    name: "Claude Code",
    models: ["claude-3.5-sonnet", "claude-3-opus"],
  },
  {
    id: "aider",
    name: "Aider",
    models: ["gpt-4", "claude-3.5-sonnet"],
  },
  {
    id: "direct-api",
    name: "Direct API",
    models: ["gpt-4", "gpt-4o", "claude-3.5-sonnet"],
  },
];

export function Execute() {
  const theme = useTheme("dark");
  const { config, setScreen, addExecution } = useAppStore();

  const [task, setTask] = useState("");
  const [context, setContext] = useState("");
  const [provider, setProvider] = useState<ExecutorType>(
    (config.defaultProvider as ExecutorType) || "opencode"
  );
  const [model, setModel] = useState(config.defaultModel || "");

  const selectedProvider = providers.find((p) => p.id === provider);
  const availableModels = selectedProvider?.models || [];

  const handleExecute = () => {
    if (!task.trim()) return;

    const execution = {
      id: `exec_${Date.now()}`,
      task: task.trim(),
      provider,
      status: "pending" as const,
      startedAt: new Date(),
    };

    addExecution(execution);
    setScreen("executing");
  };

  return (
    <Box flexDirection="column" gap={1}>
      <Text color={theme.colors.text.primary} bold>
        🚀 New Execution
      </Text>

      {/* Provider Selection */}
      <Box flexDirection="column" gap={1}>
        <Text color={theme.colors.text.secondary}>Provider</Text>
        <Box flexDirection="row" gap={2}>
          {providers.map((p) => (
            <SelectableBox
              key={p.id}
              selected={provider === p.id}
              onPress={() => {
                setProvider(p.id);
                setModel(p.models[0]);
              }}
            >
              {p.name}
            </SelectableBox>
          ))}
        </Box>
      </Box>

      {/* Model Selection */}
      <Box flexDirection="column" gap={1}>
        <Text color={theme.colors.text.secondary}>Model</Text>
        <Box flexDirection="row" gap={2}>
          {availableModels.map((m) => (
            <SelectableBox
              key={m}
              selected={model === m}
              onPress={() => setModel(m)}
            >
              {m}
            </SelectableBox>
          ))}
        </Box>
      </Box>

      {/* Task Input */}
      <Box flexDirection="column" gap={1}>
        <Text color={theme.colors.text.secondary}>Task Description</Text>
        <Box
          borderStyle="single"
          borderColor={theme.colors.border}
          padding={1}
          minHeight={5}
        >
          <Input
            value={task}
            onChange={setTask}
            placeholder="Describe what you want the AI to do..."
            multiline
          />
        </Box>
      </Box>

      {/* Context Input */}
      <Box flexDirection="column" gap={1}>
        <Text color={theme.colors.text.secondary}>
          Context (optional) - File paths or additional context
        </Text>
        <Box borderStyle="single" borderColor={theme.colors.border} padding={1}>
          <Input
            value={context}
            onChange={setContext}
            placeholder="e.g., src/auth/*, src/utils/jwt.ts"
          />
        </Box>
      </Box>

      {/* Actions */}
      <Box flexDirection="row" gap={2} marginTop={1}>
        <Button onPress={handleExecute} variant="primary">
          ▶️  Execute
        </Button>
        <Button onPress={() => setScreen("dashboard")} variant="secondary">
          Cancel
        </Button>
      </Box>
    </Box>
  );
}

function SelectableBox({
  children,
  selected,
  onPress,
}: {
  children: React.ReactNode;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme("dark");

  return (
    <Box
      paddingX={2}
      paddingY={1}
      backgroundColor={selected ? theme.colors.accent : theme.colors.surface}
      borderStyle={selected ? "double" : "single"}
      borderColor={selected ? theme.colors.accent : theme.colors.border}
      onPress={onPress}
    >
      <Text
        color={selected ? "#ffffff" : theme.colors.text.primary}
        bold={selected}
      >
        {selected ? "● " : "○ "}
        {children}
      </Text>
    </Box>
  );
}
```

---

## 3.3 Pantalla Executing (Ejecución en Progreso)

### Archivo: `packages/sdk/src/tui/screens/Executing.tsx`

```tsx
import React, { useEffect, useState } from "react";
import { Box, Text } from "opentui";
import { useTheme } from "../theme/styles";
import { useAppStore } from "../store";
import { Button, Spinner } from "../components/ui";
import { OpenFarm } from "../../open-farm";

export function Executing() {
  const theme = useTheme("dark");
  const {
    config,
    currentExecution,
    updateExecution,
    setScreen,
    setCurrentExecution,
  } = useAppStore();

  const [logs, setLogs] = useState<string[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [isRunning, setIsRunning] = useState(true);

  useEffect(() => {
    if (!currentExecution) {
      setScreen("dashboard");
      return;
    }

    // Start timer
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - currentExecution.startedAt.getTime()) / 1000));
    }, 1000);

    // Execute
    const client = new OpenFarm(config);
    setIsRunning(true);
    updateExecution(currentExecution.id, { status: "running" });

    client
      .execute({
        task: currentExecution.task,
        provider: currentExecution.provider,
        onProgress: (chunk) => {
          setLogs((prev) => [...prev, chunk]);
        },
      })
      .then((result) => {
        updateExecution(currentExecution.id, {
          status: result.success ? "completed" : "failed",
          result,
          completedAt: new Date(),
        });
        setIsRunning(false);
      })
      .catch((error) => {
        updateExecution(currentExecution.id, {
          status: "failed",
          completedAt: new Date(),
        });
        setLogs((prev) => [...prev, `Error: ${error.message}`]);
        setIsRunning(false);
      });

    return () => clearInterval(timer);
  }, [currentExecution, config, updateExecution, setScreen]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (!currentExecution) return null;

  return (
    <Box flexDirection="column" gap={1}>
      {/* Header */}
      <Box flexDirection="row" alignItems="center" gap={2}>
        {isRunning ? (
          <>
            <Spinner />
            <Text color={theme.colors.accent} bold>
              Executing...
            </Text>
          </>
        ) : (
          <Text
            color={
              currentExecution.status === "completed"
                ? theme.colors.success
                : theme.colors.error
            }
            bold
          >
            {currentExecution.status === "completed" ? "✅ Completed" : "❌ Failed"}
          </Text>
        )}
        <Text color={theme.colors.text.secondary}>⏱️ {formatTime(elapsed)}</Text>
      </Box>

      {/* Task Info */}
      <Box flexDirection="column" gap={1}>
        <Text color={theme.colors.text.secondary}>Task</Text>
        <Text color={theme.colors.text.primary}>{currentExecution.task}</Text>
      </Box>

      {/* Logs */}
      <Box flexDirection="column" gap={1} flexGrow={1}>
        <Text color={theme.colors.text.secondary}>Output</Text>
        <Box
          flexGrow={1}
          borderStyle="single"
          borderColor={theme.colors.border}
          backgroundColor={theme.colors.surface}
          padding={1}
          overflow="auto"
        >
          {logs.length === 0 ? (
            <Text color={theme.colors.text.muted}>Waiting for output...</Text>
          ) : (
            logs.map((log, i) => (
              <Text key={i} color={theme.colors.text.primary}>
                {log}
              </Text>
            ))
          )}
        </Box>
      </Box>

      {/* Actions */}
      <Box flexDirection="row" gap={2} marginTop={1}>
        {!isRunning && (
          <Button onPress={() => setScreen("execution-detail")}>
            📄 View Details
          </Button>
        )}
        <Button
          onPress={() => {
            setCurrentExecution(null);
            setScreen("dashboard");
          }}
          variant="secondary"
        >
          {isRunning ? "⏹ Cancel" : "🏠 Back to Dashboard"}
        </Button>
      </Box>
    </Box>
  );
}
```

---

## 3.4 Pantalla History

### Archivo: `packages/sdk/src/tui/screens/History.tsx`

```tsx
import React from "react";
import { Box, Text } from "opentui";
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
    <Box flexDirection="column" gap={1}>
      <Text color={theme.colors.text.primary} bold>
        📜 Execution History
      </Text>

      {executions.length === 0 ? (
        <Box
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          flexGrow={1}
        >
          <Text color={theme.colors.text.muted}>No executions yet</Text>
          <Text color={theme.colors.accent}>Press Ctrl+N to create one</Text>
        </Box>
      ) : (
        <Box flexDirection="column" gap={1}>
          {/* Header Row */}
          <Box
            flexDirection="row"
            padding={1}
            backgroundColor={theme.colors.surface}
            borderStyle="single"
            borderColor={theme.colors.border}
          >
            <Box width={8}>
              <Text color={theme.colors.text.secondary} bold>ID</Text>
            </Box>
            <Box width={12}>
              <Text color={theme.colors.text.secondary} bold>Status</Text>
            </Box>
            <Box width={12}>
              <Text color={theme.colors.text.secondary} bold>Provider</Text>
            </Box>
            <Box flexGrow={1}>
              <Text color={theme.colors.text.secondary} bold>Task</Text>
            </Box>
            <Box width={16}>
              <Text color={theme.colors.text.secondary} bold>Time</Text>
            </Box>
          </Box>

          {/* Execution Rows */}
          {executions.map((exec) => (
            <Box
              key={exec.id}
              flexDirection="row"
              padding={1}
              borderStyle="single"
              borderColor={theme.colors.border}
              onPress={() => handleSelect(exec.id)}
              hoverStyle={{ backgroundColor: theme.colors.surface }}
            >
              <Box width={8}>
                <Text color={theme.colors.text.muted}>{exec.id.slice(-6)}</Text>
              </Box>
              <Box width={12}>
                <StatusText status={exec.status} />
              </Box>
              <Box width={12}>
                <Text color={theme.colors.text.primary}>{exec.provider}</Text>
              </Box>
              <Box flexGrow={1}>
                <Text color={theme.colors.text.primary}>
                  {exec.task.substring(0, 30)}
                  {exec.task.length > 30 ? "..." : ""}
                </Text>
              </Box>
              <Box width={16}>
                <Text color={theme.colors.text.secondary}>
                  {exec.startedAt.toLocaleTimeString()}
                </Text>
              </Box>
            </Box>
          ))}
        </Box>
      )}
    </Box>
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
    <Text color={colors[status] || theme.colors.text.muted}>
      {labels[status] || status}
    </Text>
  );
}
```

---

## 3.5 Pantalla Execution Detail

### Archivo: `packages/sdk/src/tui/screens/ExecutionDetail.tsx`

```tsx
import React, { useState } from "react";
import { Box, Text } from "opentui";
import { useTheme } from "../theme/styles";
import { useAppStore } from "../store";
import { Button } from "../components/ui";

type Tab = "log" | "stats" | "output";

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
    <Box flexDirection="column" gap={1}>
      {/* Header */}
      <Box flexDirection="row" alignItems="center" gap={2}>
        <Text color={theme.colors.text.primary} bold>
          📄 Execution {currentExecution.id.slice(-6)}
        </Text>
        <StatusBadge status={status} />
      </Box>

      {/* Info */}
      <Box flexDirection="column" gap={1}>
        <InfoRow label="Task" value={task} />
        <InfoRow label="Provider" value={provider} />
        <InfoRow label="Started" value={startedAt.toLocaleString()} />
        {completedAt && <InfoRow label="Completed" value={completedAt.toLocaleString()} />}
        {duration > 0 && <InfoRow label="Duration" value={`${duration}s`} />}
        {result?.tokens && <InfoRow label="Tokens" value={result.tokens.toString()} />}
      </Box>

      {/* Tabs */}
      <Box flexDirection="row" gap={2} marginTop={1}>
        <TabButton active={activeTab === "output"} onPress={() => setActiveTab("output")}>
          📝 Output
        </TabButton>
        <TabButton active={activeTab === "stats"} onPress={() => setActiveTab("stats")}>
          📊 Stats
        </TabButton>
        <TabButton active={activeTab === "log"} onPress={() => setActiveTab("log")}>
          📜 Log
        </TabButton>
      </Box>

      {/* Content */}
      <Box
        flexGrow={1}
        borderStyle="single"
        borderColor={theme.colors.border}
        backgroundColor={theme.colors.surface}
        padding={1}
        overflow="auto"
      >
        {activeTab === "output" && (
          <Text color={theme.colors.text.primary}>
            {result?.output || "No output available"}
          </Text>
        )}
        {activeTab === "stats" && (
          <Box flexDirection="column" gap={1}>
            <StatRow label="Success" value={result?.success ? "Yes" : "No"} />
            <StatRow label="Duration" value={`${duration}s`} />
            <StatRow label="Tokens Used" value={result?.tokens?.toString() || "N/A"} />
            {result?.error && <StatRow label="Error" value={result.error} color={theme.colors.error} />}
          </Box>
        )}
        {activeTab === "log" && (
          <Text color={theme.colors.text.muted}>Full execution log would appear here...</Text>
        )}
      </Box>

      {/* Actions */}
      <Box flexDirection="row" gap={2} marginTop={1}>
        <Button onPress={() => setScreen("history")}>← Back</Button>
        <Button onPress={() => setScreen("execute")} variant="primary">
          🔄 Re-run
        </Button>
      </Box>
    </Box>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  const theme = useTheme("dark");
  return (
    <Box flexDirection="row">
      <Box width={12}>
        <Text color={theme.colors.text.secondary}>{label}:</Text>
      </Box>
      <Text color={theme.colors.text.primary}>{value}</Text>
    </Box>
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
    <Box flexDirection="row">
      <Box width={15}>
        <Text color={theme.colors.text.secondary}>{label}:</Text>
      </Box>
      <Text color={color || theme.colors.text.primary}>{value}</Text>
    </Box>
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
    <Box
      paddingX={1}
      backgroundColor={colors[status] || theme.colors.border}
    >
      <Text color="#ffffff" bold>
        {status.toUpperCase()}
      </Text>
    </Box>
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
    <Box
      paddingX={2}
      paddingY={1}
      backgroundColor={active ? theme.colors.accent : theme.colors.surface}
      borderStyle={active ? "double" : "single"}
      borderColor={active ? theme.colors.accent : theme.colors.border}
      onPress={onPress}
    >
      <Text color={active ? "#ffffff" : theme.colors.text.primary}>{children}</Text>
    </Box>
  );
}
```

---

## 3.6 Pantalla Settings

### Archivo: `packages/sdk/src/tui/screens/Settings.tsx`

```tsx
import React from "react";
import { Box, Text } from "opentui";
import { useTheme } from "../theme/styles";
import { useAppStore } from "../store";
import { Button, Input } from "../components/ui";

export function Settings() {
  const theme = useTheme("dark");
  const { config, setConfig, theme: appTheme, setTheme } = useAppStore();

  const handleSave = () => {
    // Save to file or localStorage
    // For now, just go back
    setScreen("dashboard");
  };

  return (
    <Box flexDirection="column" gap={2}>
      <Text color={theme.colors.text.primary} bold>
        ⚙️ Settings
      </Text>

      {/* General Settings */}
      <Box flexDirection="column" gap={1}>
        <Text color={theme.colors.accent} bold>
          General
        </Text>

        <SettingRow label="Default Provider">
          <Text color={theme.colors.text.primary}>{config.defaultProvider}</Text>
        </SettingRow>

        <SettingRow label="Default Model">
          <Text color={theme.colors.text.primary}>{config.defaultModel || "Not set"}</Text>
        </SettingRow>

        <SettingRow label="Theme">
          <Box flexDirection="row" gap={2}>
            <SelectableOption
              label="Dark"
              selected={appTheme === "dark"}
              onPress={() => setTheme("dark")}
            />
            <SelectableOption
              label="Light"
              selected={appTheme === "light"}
              onPress={() => setTheme("light")}
            />
          </Box>
        </SettingRow>
      </Box>

      {/* API Settings */}
      <Box flexDirection="column" gap={1}>
        <Text color={theme.colors.accent} bold>
          API Configuration
        </Text>

        <SettingRow label="API URL">
          <Text color={theme.colors.text.primary}>{config.apiUrl || "Default"}</Text>
        </SettingRow>

        <SettingRow label="API Key">
          <Text color={theme.colors.text.muted}>
            {config.apiKey ? "********" : "Not set"}
          </Text>
        </SettingRow>

        <SettingRow label="Timeout">
          <Text color={theme.colors.text.primary}>{config.timeout || "60000"}ms</Text>
        </SettingRow>
      </Box>

      {/* Keyboard Shortcuts */}
      <Box flexDirection="column" gap={1}>
        <Text color={theme.colors.accent} bold>
          Keyboard Shortcuts
        </Text>

        <ShortcutRow shortcut="Ctrl+N" action="New Task" />
        <ShortcutRow shortcut="Ctrl+H" action="History" />
        <ShortcutRow shortcut="Ctrl+S" action="Settings" />
        <ShortcutRow shortcut="Ctrl+Q" action="Quit" />
        <ShortcutRow shortcut="Esc" action="Back" />
      </Box>

      {/* Actions */}
      <Box flexDirection="row" gap={2} marginTop={2}>
        <Button onPress={handleSave} variant="primary">
          💾 Save
        </Button>
        <Button onPress={() => setScreen("dashboard")} variant="secondary">
          Cancel
        </Button>
      </Box>
    </Box>
  );
}

function SettingRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  const theme = useTheme("dark");
  return (
    <Box flexDirection="row" alignItems="center" gap={2}>
      <Box width={20}>
        <Text color={theme.colors.text.secondary}>{label}</Text>
      </Box>
      {children}
    </Box>
  );
}

function SelectableOption({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme("dark");
  return (
    <Box
      paddingX={2}
      paddingY={1}
      backgroundColor={selected ? theme.colors.accent : theme.colors.surface}
      borderStyle={selected ? "double" : "single"}
      borderColor={selected ? theme.colors.accent : theme.colors.border}
      onPress={onPress}
    >
      <Text color={selected ? "#ffffff" : theme.colors.text.primary}>
        {selected ? "● " : "○ "}
        {label}
      </Text>
    </Box>
  );
}

function ShortcutRow({ shortcut, action }: { shortcut: string; action: string }) {
  const theme = useTheme("dark");
  return (
    <Box flexDirection="row" alignItems="center" gap={2}>
      <Box
        paddingX={1}
        backgroundColor={theme.colors.surface}
        borderStyle="single"
        borderColor={theme.colors.border}
      >
        <Text color={theme.colors.text.primary}>{shortcut}</Text>
      </Box>
      <Text color={theme.colors.text.secondary}>{action}</Text>
    </Box>
  );
}
```

---

## ✅ Criterios de Aceptación

- [ ] Todas las 5 pantallas se renderizan sin errores
- [ ] Se puede navegar entre pantallas usando el sidebar
- [ ] El Dashboard muestra estadísticas reales
- [ ] Execute permite crear una nueva ejecución
- [ ] Executing muestra el progreso y logs (simulado si no hay streaming real)
- [ ] History lista las ejecuciones
- [ ] Execution Detail muestra tabs de información
- [ ] Settings muestra la configuración actual

---

## 📝 Notas

- Las pantallas usan datos del store, no hacen fetch directo
- Executing es la más compleja porque maneja el lifecycle de la ejecución
- Considerar agregar validación en Execute (task no vacío)
- Execution Detail podría mostrar diffs si los hay

---

## 🔄 Siguiente Paso

→ [Fase 4: Integración con OpenFarm](./phase-4-integration.md)
