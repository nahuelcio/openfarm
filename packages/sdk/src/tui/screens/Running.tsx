import { useCallback, useEffect, useRef, useState } from "react";
import { Box, Text, useInput } from "ink";
import { createExecutor } from "../../executors";
import { useStore } from "../store";

const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

export function Running() {
  const { setScreen, currentExecution, updateExecution } = useStore();
  const [spinnerIdx, setSpinnerIdx] = useState(0);
  const [logs, setLogs] = useState<string[]>(["🔍 Checking..."]);
  const [isDone, setIsDone] = useState(false);
  const [success, setSuccess] = useState<boolean | null>(null);
  const [duration, setDuration] = useState(0);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const aborted = useRef(false);

  // Spinner animation
  useEffect(() => {
    if (isDone) return;
    const interval = setInterval(() => {
      setSpinnerIdx((prev) => (prev + 1) % SPINNER_FRAMES.length);
    }, 80);
    return () => clearInterval(interval);
  }, [isDone]);

  // Callback para recibir logs en tiempo real
  const onLog = useCallback((msg: string) => {
    if (aborted.current) return;
    setLogs((prev) => [...prev, msg]);
  }, []);

  useEffect(() => {
    if (!currentExecution || aborted.current) return;

    const run = async () => {
      try {
        updateExecution(currentExecution.id, { status: "running" });

        const executor = createExecutor(currentExecution.provider as any);
        const result = await executor.execute({
          task: currentExecution.task,
          provider: currentExecution.provider,
          onLog,
        });

        if (aborted.current) return;

        setSuccess(result.success);
        setDuration(result.duration);

        updateExecution(currentExecution.id, {
          status: result.success ? "completed" : "failed",
        });

        setIsDone(true);
      } catch (error) {
        if (aborted.current) return;

        const message = error instanceof Error ? error.message : String(error);
        onLog(`❌ Error: ${message}`);
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
        onLog("⚠️  Cancelled by user");
        if (currentExecution) {
          updateExecution(currentExecution.id, { status: "failed" });
        }
      }
      setScreen("dashboard");
    }
  });

  if (!currentExecution) return null;

  const spinner = SPINNER_FRAMES[spinnerIdx];
  // Show last 20 logs to fit screen
  const visibleLogs = logs.slice(-20);

  return (
    <Box flexDirection="column" gap={1}>
      {/* Header */}
      <Box flexDirection="row" gap={1}>
        <Text bold color={isDone ? (success ? "green" : "red") : "cyan"}>
          {isDone ? (success ? "✅ Done" : "❌ Failed") : `${spinner} Running`}
        </Text>
        {isDone && duration > 0 && <Text color="gray">({duration}ms)</Text>}
      </Box>

      <Text color="gray">{"─".repeat(60)}</Text>

      {/* Task */}
      <Box flexDirection="column">
        <Text color="gray" dimColor>Task: {currentExecution.task}</Text>
      </Box>

      <Text color="gray">{"─".repeat(60)}</Text>

      {/* Live output - NO TRUNCATION */}
      <Text color="gray" dimColor>Output:</Text>
      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor={isDone ? (success ? "green" : "red") : "yellow"}
        padding={1}
      >
        {visibleLogs.map((log, i) => (
          <Text key={i}>{log || " "}</Text>
        ))}
        {!isDone && <Text color="yellow">{spinner}</Text>}
      </Box>

      <Text color="gray">{"─".repeat(60)}</Text>

      <Text color="gray">
        {logs.length > 20 ? `${logs.length} lines • ` : ""}
        {isDone ? "Esc to go back" : "Esc to cancel"}
      </Text>
    </Box>
  );
}
