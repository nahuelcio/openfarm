import React, { useEffect, useState } from "react";
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
  } = useAppStore();

  const [logs, setLogs] = useState<string[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [isRunning, setIsRunning] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    setError(null);
    updateExecution(currentExecution.id, { status: "running" });

    client
      .execute({
        task: currentExecution.task,
        provider: currentExecution.provider,
        stream: true,
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
      .catch((err) => {
        const message = err instanceof Error ? err.message : "Unknown error";
        updateExecution(currentExecution.id, {
          status: "failed",
          completedAt: new Date(),
        });
        setError(message);
        setLogs((prev) => [...prev, `Error: ${message}`]);
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
    <box flexDirection="column" gap={1}>
      {/* Header */}
      <box flexDirection="row" alignItems="center" gap={2}>
        {isRunning ? (
          <>
            <Spinner />
            <text>
              <span fg={theme.colors.accent}><strong>Executing...</strong></span>
            </text>
          </>
        ) : (
          <text>
            {currentExecution.status === "completed" ? (
              <span fg={theme.colors.success}><strong>✅ Completed</strong></span>
            ) : (
              <span fg={theme.colors.error}><strong>❌ Failed</strong></span>
            )}
          </text>
        )}
        <text>
          <span fg={theme.colors.text.secondary}>⏱️ {formatTime(elapsed)}</span>
        </text>
      </box>

      {/* Task Info */}
      <box flexDirection="column" gap={1}>
        <text><span fg={theme.colors.text.secondary}>Task</span></text>
        <text><span fg={theme.colors.text.primary}>{currentExecution.task}</span></text>
      </box>

      {/* Error */}
      {error && (
        <box
          padding={1}
          borderStyle="single"
          borderColor={theme.colors.error}
          backgroundColor={theme.colors.surface}
        >
          <text><span fg={theme.colors.error}>Error: {error}</span></text>
        </box>
      )}

      {/* Logs */}
      <box flexDirection="column" gap={1} flexGrow={1}>
        <text><span fg={theme.colors.text.secondary}>Output</span></text>
        <box
          flexGrow={1}
          borderStyle="single"
          borderColor={theme.colors.border}
          backgroundColor={theme.colors.surface}
          padding={1}
        >
          {logs.length === 0 ? (
            <text><span fg={theme.colors.text.muted}>Waiting for output...</span></text>
          ) : (
            logs.map((log, i) => (
              <text key={i}>
                <span fg={theme.colors.text.primary}>{log}</span>
              </text>
            ))
          )}
        </box>
      </box>

      {/* Actions */}
      <box flexDirection="row" gap={2} marginTop={1}>
        {!isRunning && (
          <Button onPress={() => setScreen("execution-detail")}>
            📄 View Details
          </Button>
        )}
        <Button
          onPress={() => setScreen("dashboard")}
          variant="secondary"
        >
          {isRunning ? "⏹ Cancel" : "🏠 Back to Dashboard"}
        </Button>
      </box>
    </box>
  );
}
