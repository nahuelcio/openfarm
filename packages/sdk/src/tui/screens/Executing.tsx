import React, { useEffect } from "react";
import { useTheme } from "../theme/styles";
import { useAppStore } from "../store";
import { Button, Spinner } from "../components/ui";
import { useExecution } from "../hooks/useExecution";

export function Executing() {
  const theme = useTheme("dark");
  const {
    currentExecution,
    updateExecution,
    setScreen,
  } = useAppStore();

  const {
    status,
    logs,
    error,
    progress,
    isExecuting,
    duration,
    execute,
    cancel,
  } = useExecution();

  // Start execution on mount
  useEffect(() => {
    if (!currentExecution) {
      setScreen("dashboard");
      return;
    }

    // Only execute if we're in idle state (first mount)
    if (status === "idle") {
      updateExecution(currentExecution.id, { status: "running" });
      
      execute({
        task: currentExecution.task,
        provider: currentExecution.provider,
      }).then((result) => {
        if (result) {
          updateExecution(currentExecution.id, {
            status: result.success ? "completed" : "failed",
            result,
            completedAt: new Date(),
          });
        } else {
          // Execution was cancelled or failed
          updateExecution(currentExecution.id, {
            status: "failed",
            completedAt: new Date(),
          });
        }
      });
    }
  }, [currentExecution]); // Only run once

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    const msPart = Math.floor((ms % 1000) / 10);
    
    if (mins > 0) {
      return `${mins}:${secs.toString().padStart(2, "0")}.${msPart.toString().padStart(2, "0")}`;
    }
    return `${secs}.${msPart.toString().padStart(2, "0")}s`;
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (!currentExecution) return null;

  const showProgress = progress.total > 0;
  const progressPercent = showProgress
    ? Math.round((progress.current / progress.total) * 100)
    : 0;

  return (
    <box flexDirection="column" gap={1}>
      {/* Header */}
      <box flexDirection="row" alignItems="center" gap={2}>
        {isExecuting ? (
          <>
            <Spinner />
            <text>
              <span fg={theme.colors.accent}><strong>Executing...</strong></span>
            </text>
          </>
        ) : status === "completed" ? (
          <text>
            <span fg={theme.colors.success}><strong>✅ Completed</strong></span>
          </text>
        ) : status === "cancelled" ? (
          <text>
            <span fg={theme.colors.warning}><strong>⏹ Cancelled</strong></span>
          </text>
        ) : (
          <text>
            <span fg={theme.colors.error}><strong>❌ Failed</strong></span>
          </text>
        )}
        
        <text>
          <span fg={theme.colors.text.secondary}>⏱️ {formatDuration(duration)}</span>
        </text>
      </box>

      {/* Task Info */}
      <box flexDirection="column" gap={1}>
        <text>
          <span fg={theme.colors.text.secondary}>Task</span>
        </text>
        <text>
          <span fg={theme.colors.text.primary}>{currentExecution.task}</span>
        </text>
      </box>

      {/* Progress Bar */}
      {isExecuting && showProgress && (
        <box flexDirection="column" gap={1}>
          <text>
            <span fg={theme.colors.text.secondary}>
              {progress.message || "Progress"}: {progressPercent}%
            </span>
          </text>
          <box flexDirection="row" width={50}>
            <text>
              <span fg={theme.colors.accent}>{"█".repeat(Math.floor(progressPercent / 2))}</span>
              <span fg={theme.colors.border}>{"░".repeat(50 - Math.floor(progressPercent / 2))}</span>
            </text>
          </box>
          <text>
            <span fg={theme.colors.text.muted}>
              Step {progress.current} of {progress.total}
            </span>
          </text>
        </box>
      )}

      {/* Error */}
      {error && (
        <box
          flexDirection="column"
          gap={1}
          padding={1}
          borderStyle="single"
          borderColor={theme.colors.error}
          backgroundColor={theme.colors.surface}
        >
          <text>
            <span fg={theme.colors.error}><strong>Error</strong></span>
          </text>
          <text>
            <span fg={theme.colors.error}>{error.message}</span>
          </text>
          {error.code && (
            <text>
              <span fg={theme.colors.text.muted}>Code: {error.code}</span>
            </text>
          )}
          {error.retryable && (
            <text>
              <span fg={theme.colors.warning}>You can retry this execution</span>
            </text>
          )}
        </box>
      )}

      {/* Logs */}
      <box flexDirection="column" gap={1} flexGrow={1}>
        <text>
          <span fg={theme.colors.text.secondary}>Output ({logs.length} lines)</span>
        </text>
        <box
          flexGrow={1}
          borderStyle="single"
          borderColor={theme.colors.border}
          backgroundColor={theme.colors.surface}
          padding={1}
          overflow="scroll"
        >
          {logs.length === 0 ? (
            <text>
              <span fg={theme.colors.text.muted}>Waiting for output...</span>
            </text>
          ) : (
            logs.slice(-50).map((log, i) => (
              <text key={i}>
                <span fg={theme.colors.text.primary}>{log}</span>
              </text>
            ))
          )}
        </box>
      </box>

      {/* Actions */}
      <box flexDirection="row" gap={2} marginTop={1}>
        {isExecuting ? (
          <Button onPress={cancel} variant="danger">
            ⏹ Cancel
          </Button>
        ) : (
          <>
            <Button onPress={() => setScreen("execution-detail")}>
              📄 View Details
            </Button>
            <Button onPress={() => setScreen("execute")} variant="primary">
              🔄 New Task
            </Button>
          </>
        )}
        <Button onPress={() => setScreen("dashboard")} variant="secondary">
          🏠 Dashboard
        </Button>
      </box>
    </box>
  );
}
