#!/usr/bin/env bun

/**
 * Task Loop CLI
 *
 * Runs the Ralph TUI-style autonomous task loop directly from CLI.
 */

import type { TaskLoopEvent } from "@openfarm/task-loop";
import { Box, render, Text } from "ink";
import { useCallback, useEffect, useState } from "react";
import type { OpenFarmConfig } from "../types";

interface TaskLoopCliProps {
  config: OpenFarmConfig;
  tasks?: string[];
}

function TaskLoopCLI({ config, tasks }: TaskLoopCliProps) {
  const [status, setStatus] = useState<
    "idle" | "running" | "paused" | "completed" | "error"
  >("idle");
  const [currentTask, setCurrentTask] = useState<string | null>(null);
  const [progress, setProgress] = useState({
    completed: 0,
    total: 0,
    failed: 0,
  });
  const [logs, setLogs] = useState<string[]>([]);
  const [_sessionId, setSessionId] = useState<string | null>(null);

  const addLog = useCallback((message: string) => {
    setLogs((prev) => [
      ...prev.slice(-100),
      `[${new Date().toLocaleTimeString()}] ${message}`,
    ]);
  }, []);

  const handleEvent = useCallback(
    (event: TaskLoopEvent) => {
      switch (event.type) {
        case "session.started":
          setSessionId(event.sessionId);
          addLog(`Session started: ${event.sessionId.slice(0, 8)}`);
          break;
        case "session.completed":
          setStatus("completed");
          addLog("Session completed!");
          break;
        case "session.failed":
          setStatus("error");
          addLog(`Session failed: ${event.data}`);
          break;
        case "session.paused":
          setStatus("paused");
          addLog("Session paused");
          break;
        case "task.started":
          setCurrentTask(event.taskId || null);
          addLog(`Task: ${event.taskId?.slice(0, 30)}...`);
          break;
        case "task.completed":
          setProgress((p) => ({ ...p, completed: p.completed + 1 }));
          break;
        case "task.failed":
          setProgress((p) => ({ ...p, failed: p.failed + 1 }));
          break;
      }
    },
    [addLog]
  );

  const startTaskLoop = useCallback(async () => {
    try {
      setStatus("running");
      addLog("Starting Task Loop...");
      addLog(`Provider: ${config.defaultProvider || "external-agent"}`);

      const { TaskLoopOrchestrator } = await import("@openfarm/task-loop");

      const orchestrator = new TaskLoopOrchestrator({
        provider: config.defaultProvider || "external-agent",
        model: config.defaultModel,
      });

      await orchestrator.run({
        onEvent: handleEvent,
      });
    } catch (error) {
      setStatus("error");
      addLog(`Fatal error: ${error}`);
    }
  }, [config, addLog, handleEvent]);

  useEffect(() => {
    startTaskLoop();
  }, [startTaskLoop]);

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="cyan">
        OpenFarm Task Loop
      </Text>
      <Text
        color={
          status === "running" ? "green" : status === "error" ? "red" : "gray"
        }
      >
        Status: {status.toUpperCase()}
      </Text>
      {currentTask && (
        <Text wrap="truncate-end">
          Current: <Text color="yellow">{currentTask}</Text>
        </Text>
      )}
      <Text>
        Completed: <Text color="green">{progress.completed}</Text>
        {progress.failed > 0 && (
          <Text color="red"> Failed: {progress.failed}</Text>
        )}
      </Text>
      <Box flexDirection="column" height={15} marginTop={1}>
        <Text bold>Logs:</Text>
        {logs.slice(-15).map((log, i) => (
          <Text color="gray" key={i} wrap="truncate-end">
            {log}
          </Text>
        ))}
      </Box>
      <Box marginTop={1}>
        <Text dimColor>Press Ctrl+C to exit</Text>
      </Box>
    </Box>
  );
}

export async function runTaskLoopCLI(
  args: string[],
  config: OpenFarmConfig
): Promise<void> {
  const tasks = args.filter((a) => !a.startsWith("--"));

  const { waitUntilExit } = render(
    <TaskLoopCLI config={config} tasks={tasks} />
  );
  await waitUntilExit();
}
