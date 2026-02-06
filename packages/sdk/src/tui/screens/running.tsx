import { Box, Text, useInput, useStdout } from "@openfarm/tui-opentui";
import { useEffect, useRef, useState } from "react";
import { ErrorDisplay } from "../components/error-display";
import { useStore } from "../store";
import { useExecutionRuntimeStore } from "../store/execution-runtime-store";
import { startExecution } from "../utils/execution-runner";

const SPINNER_FRAMES = [
  "\u280B",
  "\u2819",
  "\u2839",
  "\u2838",
  "\u283C",
  "\u2834",
  "\u2826",
  "\u2827",
  "\u2807",
  "\u280F",
];

export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  if (ms < 60_000) {
    return `${(ms / 1000).toFixed(1)}s`;
  }
  const mins = Math.floor(ms / 60_000);
  const secs = ((ms % 60_000) / 1000).toFixed(0);
  return `${mins}m ${secs}s`;
}

// --- Log display helpers ---

type LogType =
  | "header"
  | "separator"
  | "step"
  | "command"
  | "output"
  | "success"
  | "error"
  | "warning"
  | "info";

function classifyLog(line: string): LogType {
  if (!line || line.trim() === "") {
    return "info";
  }
  if (line.startsWith("\u2500") || line.startsWith("\u2550")) {
    return "separator";
  }
  if (
    line.startsWith("[ERROR]") ||
    line.startsWith("Error:") ||
    line.startsWith("\u274C") ||
    line.startsWith("\u2717")
  ) {
    return "error";
  }
  if (line.startsWith("\u2705") || line.startsWith("\u2713")) {
    return "success";
  }
  if (line.startsWith("\u26A0")) {
    return "warning";
  }
  if (line.startsWith("$") || line.startsWith("\uD83D\uDE80")) {
    return "command";
  }
  if (line.startsWith("  ")) {
    return "output";
  }
  if (
    line.startsWith("\u2502") ||
    line.startsWith("\u251C") ||
    line.startsWith("\u2514")
  ) {
    return "output";
  }
  if (line.startsWith("\u25B8") || line.startsWith("\u25B9")) {
    return "step";
  }
  return "info";
}

const LOG_COLORS: Record<LogType, string | undefined> = {
  header: "cyan",
  separator: "gray",
  step: "cyan",
  command: "yellow",
  output: undefined,
  success: "green",
  error: "red",
  warning: "yellow",
  info: "gray",
};

function getLogColor(line: string): string | undefined {
  return LOG_COLORS[classifyLog(line)];
}

function formatLogLine(line: string, maxWidth: number): string {
  if (!line) {
    return "";
  }
  if (line.length > maxWidth) {
    return `${line.slice(0, maxWidth - 1)}\u2026`;
  }
  return line;
}

// --- Component ---

export function Running() {
  const {
    setScreen,
    currentExecution,
    selectedWorkflowId,
    externalAgentConfig,
  } = useStore();

  // Read runtime session from the persistent store
  const session = useExecutionRuntimeStore((s) =>
    currentExecution ? s.sessions[currentExecution.id] : undefined
  );

  const [spinnerIdx, setSpinnerIdx] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const executionStarted = useRef(false);

  // Spinner animation
  useEffect(() => {
    if (session?.isDone) {
      return;
    }
    const timer = setInterval(() => {
      setSpinnerIdx((i) => (i + 1) % SPINNER_FRAMES.length);
    }, 80);
    return () => clearInterval(timer);
  }, [session?.isDone]);

  // Elapsed timer
  useEffect(() => {
    if (session?.isDone) {
      return;
    }
    const timer = setInterval(() => {
      if (session?.startTime) {
        setElapsed(Date.now() - session.startTime);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [session?.isDone, session?.startTime]);

  // Start execution on first mount (or resume view if session already exists)
  // biome-ignore lint/correctness/useExhaustiveDependencies: only trigger on executionId
  useEffect(() => {
    if (!currentExecution) {
      return;
    }
    if (executionStarted.current) {
      return;
    }

    // Check if session already exists (user navigated back to running execution)
    const existing = useExecutionRuntimeStore
      .getState()
      .getSession(currentExecution.id);
    if (existing) {
      // Resume viewing - session is alive, just sync elapsed
      executionStarted.current = true;
      setElapsed(Date.now() - existing.startTime);
      return;
    }

    // First time: create session and start execution
    executionStarted.current = true;
    useExecutionRuntimeStore
      .getState()
      .createSession(currentExecution.id, Date.now());

    startExecution({
      executionId: currentExecution.id,
      task: currentExecution.task,
      workspace: currentExecution.workspace,
      provider: currentExecution.provider,
      model: currentExecution.model,
      workflowId: selectedWorkflowId,
      externalAgentConfig:
        currentExecution.provider === "external-agent"
          ? externalAgentConfig
          : undefined,
      runtimeStore: useExecutionRuntimeStore,
      appStore: useStore,
    });
  }, [currentExecution?.id]);

  // Key input
  useInput((input, key) => {
    // Cancel with 'c' - only this cancels, not Esc
    if ((input === "c" || input === "C") && session && !session.isDone) {
      useExecutionRuntimeStore.getState().cancelExecution(currentExecution!.id);
      useStore
        .getState()
        .updateExecution(currentExecution!.id, { status: "cancelled" });
    }

    // Esc = navigate away WITHOUT cancelling
    if (key.escape) {
      if (session?.isDone) {
        // Clean up completed session immediately on exit
        useExecutionRuntimeStore.getState().removeSession(currentExecution!.id);
      }
      setScreen("dashboard");
    }
  });

  const { stdout } = useStdout();

  if (!currentExecution) {
    return null;
  }

  const spinner = SPINNER_FRAMES[spinnerIdx];
  const termWidth = Math.max(stdout?.columns || 80, 60);
  const boxWidth = Math.min(termWidth - 2, 120);
  const contentWidth = boxWidth - 4;
  const termHeight = stdout?.rows || 24;
  const maxLogLines = Math.max(6, termHeight - 6);

  const logs = session?.logs || [];
  const isDone = session?.isDone;
  const success = session?.success;
  const currentStep = session?.currentStep || "";
  const stepProgress = session?.stepProgress || { current: 0, total: 0 };
  const stats = session?.stats || { tokens: 0, files: 0 };
  const categorizedError = session?.categorizedError || null;

  const visibleLogs = logs.slice(-maxLogLines);
  const boxHeight = Math.max(
    8,
    Math.min(visibleLogs.length + (isDone ? 0 : 1), maxLogLines) + 2
  );

  const statusColor = isDone ? (success ? "green" : "red") : "cyan";
  const borderColor = isDone ? (success ? "green" : "red") : "gray";

  return (
    <Box flexDirection="column" width={boxWidth}>
      {/* Status bar */}
      <Box flexDirection="row" justifyContent="space-between" width={boxWidth}>
        <Text bold color={statusColor}>
          {isDone
            ? success
              ? "\u2713 Success"
              : "\u2717 Failed"
            : `${spinner} ${currentStep || "Running"}${stepProgress.current > 0 ? ` [${stepProgress.current}/${stepProgress.total}]` : ""}`}
        </Text>
        <Text color="gray">{formatDuration(elapsed)}</Text>
      </Box>

      {/* Log output */}
      <Box
        borderColor={borderColor}
        borderStyle="single"
        flexDirection="column"
        height={boxHeight}
        paddingLeft={1}
        paddingRight={1}
        width={boxWidth}
      >
        {visibleLogs.map((log, i) => (
          <Text color={getLogColor(log)} key={i} wrap="truncate-end">
            {formatLogLine(log, contentWidth)}
          </Text>
        ))}
        {!isDone && <Text color="cyan">{spinner}</Text>}
      </Box>

      {/* Error Display */}
      {isDone && !success && categorizedError && (
        <Box marginTop={1} width={boxWidth}>
          <ErrorDisplay error={categorizedError} />
        </Box>
      )}

      {/* Footer */}
      <Box flexDirection="row" justifyContent="space-between" width={boxWidth}>
        <Text color="gray">
          {logs.length} lines
          {stats.tokens > 0 ? `  ${stats.tokens.toLocaleString()} tok` : ""}
          {stats.files > 0
            ? `  ${stats.files} file${stats.files !== 1 ? "s" : ""}`
            : ""}
        </Text>
        <Text color="gray">{isDone ? "esc back" : "esc back  c cancel"}</Text>
      </Box>
    </Box>
  );
}
