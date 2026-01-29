import { Box, Text, useInput } from "ink";
import { useCallback, useEffect, useRef, useState } from "react";
import { createExecutor } from "../../executors";
import { useStore } from "../store";

const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  const mins = Math.floor(ms / 60_000);
  const secs = ((ms % 60_000) / 1000).toFixed(0);
  return `${mins}m ${secs}s`;
}

export function Running() {
  const { setScreen, currentExecution, updateExecution } = useStore();
  const [spinnerIdx, setSpinnerIdx] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [isDone, setIsDone] = useState(false);
  const [success, setSuccess] = useState<boolean | null>(null);
  const [startTime] = useState(Date.now());
  const [elapsed, setElapsed] = useState(0);
  const [stats, setStats] = useState({ tokens: 0, files: 0 });
  const aborted = useRef(false);

  // Timer para elapsed time
  useEffect(() => {
    if (isDone) return;
    const interval = setInterval(() => {
      setElapsed(Date.now() - startTime);
    }, 100);
    return () => clearInterval(interval);
  }, [isDone, startTime]);

  // Spinner animation
  useEffect(() => {
    if (isDone) return;
    const interval = setInterval(() => {
      setSpinnerIdx((prev) => (prev + 1) % SPINNER_FRAMES.length);
    }, 80);
    return () => clearInterval(interval);
  }, [isDone]);

  // Parse stats from logs
  const updateStats = useCallback((msg: string) => {
    if (msg.includes("Tokens:") || msg.includes("tokens")) {
      const match = msg.match(/(\d+)\s*tokens?/i);
      if (match) {
        setStats((s) => ({ ...s, tokens: Number.parseInt(match[1]) }));
      }
    }
    if (msg.includes("Created:") || msg.includes("Edited:")) {
      setStats((s) => ({ ...s, files: s.files + 1 }));
    }
  }, []);

  const onLog = useCallback(
    (msg: string) => {
      if (aborted.current) return;
      setLogs((prev) => [...prev, msg]);
      updateStats(msg);
    },
    [updateStats]
  );

  useEffect(() => {
    if (!currentExecution || aborted.current) return;

    const run = async () => {
      try {
        onLog(`🔧 ${currentExecution.provider}`);
        onLog(`📁 ${currentExecution.workspace}`);
        onLog(`📝 ${currentExecution.task}`);
        onLog("");

        updateExecution(currentExecution.id, { status: "running" });

        const executor = createExecutor(currentExecution.provider as any);
        const result = await executor.execute({
          task: currentExecution.task,
          provider: currentExecution.provider,
          workspace: currentExecution.workspace,
          onLog,
        });

        if (aborted.current) return;

        setSuccess(result.success);

        updateExecution(currentExecution.id, {
          status: result.success ? "completed" : "failed",
        });

        setIsDone(true);
      } catch (error) {
        if (aborted.current) return;

        const message = error instanceof Error ? error.message : String(error);
        onLog(`❌ ${message}`);
        updateExecution(currentExecution.id, { status: "failed" });
        setSuccess(false);
        setIsDone(true);
      }
    };

    run();
  }, [currentExecution, onLog, updateExecution]);

  useInput((input, key) => {
    if (key.escape) {
      if (!isDone) {
        aborted.current = true;
        onLog("⚠️  Cancelled");
        if (currentExecution) {
          updateExecution(currentExecution.id, { status: "failed" });
        }
      }
      setScreen("dashboard");
    }
  });

  if (!currentExecution) return null;

  const spinner = SPINNER_FRAMES[spinnerIdx];
  const visibleLogs = logs.slice(-18);

  return (
    <Box flexDirection="column">
      {/* Header con tiempo */}
      <Box flexDirection="row" justifyContent="space-between">
        <Text bold color={isDone ? (success ? "green" : "red") : "cyan"}>
          {isDone
            ? success
              ? "✅ Success"
              : "❌ Failed"
            : `${spinner} Running`}
        </Text>
        <Text color="gray">{formatDuration(elapsed)}</Text>
      </Box>

      <Text color="gray">{"─".repeat(60)}</Text>

      {/* Output */}
      <Box
        borderColor={isDone ? (success ? "green" : "red") : "gray"}
        borderStyle="single"
        flexDirection="column"
        height={20}
        padding={1}
      >
        {visibleLogs.map((log, i) => (
          <Text key={i} wrap="truncate-end">
            {log || " "}
          </Text>
        ))}
        {!isDone && <Text color="cyan">{spinner}</Text>}
      </Box>

      <Text color="gray">{"─".repeat(60)}</Text>

      {/* Stats */}
      <Box flexDirection="row" justifyContent="space-between">
        <Text color="gray">{logs.length} lines</Text>
        {stats.tokens > 0 && (
          <Text color="gray">{stats.tokens.toLocaleString()} tokens</Text>
        )}
        {stats.files > 0 && (
          <Text color="gray">
            {stats.files} file{stats.files !== 1 ? "s" : ""}
          </Text>
        )}
        <Text color="gray">{isDone ? "Esc to back" : "Esc to cancel"}</Text>
      </Box>
    </Box>
  );
}
