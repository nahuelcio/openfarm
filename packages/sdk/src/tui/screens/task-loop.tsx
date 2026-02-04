#!/usr/bin/env bun
/**
 * Task Loop Screen
 *
 * Runs the Ralph TUI-style autonomous task loop with real-time UI.
 * Phase 4: Rich Logs integration
 */

import { Box, Text, useInput } from "ink";
import React, { useEffect, useState } from "react";
import { useStore } from "../store";
import { useLogStore, type LogLevel } from "../store/log-store";
import { RichLogView } from "../components/rich-log-view";
import type { TaskLoopEvent } from "@openfarm/task-loop";

interface TaskInfo {
  id: string;
  description: string;
  status: "pending" | "running" | "completed" | "failed" | "skipped";
}

export function TaskLoopScreen() {
  const { setScreen, provider, model, workspace } = useStore();
  const { addEntry, clearEntries } = useLogStore();

  const [status, setStatus] = useState<
    "idle" | "running" | "paused" | "completed" | "error"
  >("idle");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<TaskInfo[]>([]);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [progress, setProgress] = useState({
    completed: 0,
    failed: 0,
    skipped: 0,
    total: 0,
  });
  const [showTracing, setShowTracing] = useState(false);
  const [showTaskList, setShowTaskList] = useState(true);

  useEffect(() => {
    clearEntries();
    addEntry({
      level: "info",
      component: "task-loop",
      message: "Initializing Task Loop...",
    });
    startTaskLoop();
  }, []);

  const log = (
    level: LogLevel,
    component: string,
    message: string,
    metadata?: Record<string, unknown>
  ) => {
    addEntry({ level, component, message, metadata });
  };

  const handleEvent = (event: TaskLoopEvent) => {
    switch (event.type) {
      case "session.started":
        setSessionId(event.sessionId);
        setStatus("running");
        log(
          "info",
          "task-loop",
          `Session started: ${event.sessionId.slice(0, 8)}`,
          {
            sessionId: event.sessionId,
          }
        );
        break;

      case "session.completed":
        setStatus("completed");
        log("info", "task-loop", "✨ All tasks completed!", {
          completed: progress.completed,
          failed: progress.failed,
          skipped: progress.skipped,
        });
        break;

      case "session.failed":
        setStatus("error");
        log("error", "task-loop", `Session failed: ${event.data}`, {
          error: event.data,
        });
        break;

      case "session.paused":
        setStatus("paused");
        log("warn", "task-loop", "Session paused by user");
        break;

      case "task.selected":
        if (event.taskId && event.data) {
          const taskData = event.data as { description?: string };
          setTasks((prev) => [
            ...prev,
            {
              id: event.taskId!,
              description: taskData.description || event.taskId!,
              status: "pending",
            },
          ]);
          setProgress((p) => ({ ...p, total: p.total + 1 }));
          log(
            "debug",
            "task-loop",
            `Task selected: ${taskData.description || event.taskId}`,
            {
              taskId: event.taskId,
            }
          );
        }
        break;

      case "task.started":
        setCurrentTaskId(event.taskId || null);
        setTasks((prev) =>
          prev.map((t) =>
            t.id === event.taskId ? { ...t, status: "running" } : t
          )
        );
        log("info", "agent", `▶ Starting: ${event.taskId?.slice(0, 40)}`, {
          taskId: event.taskId,
        });
        break;

      case "task.completed":
        setTasks((prev) =>
          prev.map((t) =>
            t.id === event.taskId ? { ...t, status: "completed" } : t
          )
        );
        setProgress((p) => ({ ...p, completed: p.completed + 1 }));
        setCurrentTaskId(null);
        log("info", "agent", `✓ Completed: ${event.taskId?.slice(0, 40)}`, {
          taskId: event.taskId,
        });
        break;

      case "task.failed":
        setTasks((prev) =>
          prev.map((t) =>
            t.id === event.taskId ? { ...t, status: "failed" } : t
          )
        );
        setProgress((p) => ({ ...p, failed: p.failed + 1 }));
        setCurrentTaskId(null);
        log("error", "agent", `✗ Failed: ${event.taskId?.slice(0, 40)}`, {
          taskId: event.taskId,
          error: event.data,
        });
        break;

      case "task.skipped":
        setTasks((prev) =>
          prev.map((t) =>
            t.id === event.taskId ? { ...t, status: "skipped" } : t
          )
        );
        setProgress((p) => ({ ...p, skipped: p.skipped + 1 }));
        log("warn", "agent", `⏭ Skipped: ${event.taskId?.slice(0, 40)}`, {
          taskId: event.taskId,
        });
        break;

      case "log":
        log("info", "system", String(event.data));
        break;
    }
  };

  const startTaskLoop = async () => {
    try {
      setStatus("idle");
      log("info", "task-loop", `Provider: ${provider || "opencode"}`);
      log("info", "task-loop", `Workspace: ${workspace}`);

      const { TaskLoopOrchestrator } = await import("@openfarm/task-loop");

      const orchestrator = new TaskLoopOrchestrator({
        provider: provider || "opencode",
        model: model || undefined,
      });

      await orchestrator.run({
        onEvent: handleEvent,
      });
    } catch (error) {
      setStatus("error");
      log("error", "task-loop", `Fatal error: ${error}`, {
        error: String(error),
      });
    }
  };

  useInput((input, key) => {
    if (key.escape || input === "q") {
      setScreen("dashboard");
    } else if (input === "t" || input === "T") {
      setShowTracing((s) => !s);
    } else if (input === "v" || input === "V") {
      setShowTaskList((s) => !s);
    } else if (input === "d" || input === "D") {
      setScreen("dashboard");
    } else if (input === "p" || input === "P") {
      // Pause/Resume would go here
      log("info", "task-loop", "Pause/Resume not yet implemented");
    }
  });

  const getStatusColor = () => {
    switch (status) {
      case "running":
        return "green";
      case "error":
        return "red";
      case "completed":
        return "cyan";
      case "paused":
        return "yellow";
      default:
        return "gray";
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case "running":
        return "▶";
      case "error":
        return "✖";
      case "completed":
        return "✓";
      case "paused":
        return "⏸";
      default:
        return "○";
    }
  };

  return (
    <Box flexDirection="column" height="100%">
      {/* Header */}
      <Box
        flexDirection="row"
        justifyContent="space-between"
        borderStyle="single"
        paddingX={1}
      >
        <Box flexDirection="row" gap={1}>
          <Text bold color="cyan">
            🔄 Task Loop
          </Text>
          {sessionId && (
            <Text color="gray" dimColor>
              | Session: {sessionId.slice(0, 8)}...
            </Text>
          )}
        </Box>
        <Text color={getStatusColor()} bold>
          {getStatusIcon()} {status.toUpperCase()}
        </Text>
      </Box>

      {/* Stats Bar */}
      <Box flexDirection="row" gap={3} paddingX={1} marginY={1}>
        <Box flexDirection="row" gap={1}>
          <Text color="green" bold>
            {progress.completed}✓
          </Text>
          <Text color="gray">Completed</Text>
        </Box>
        {progress.failed > 0 && (
          <Box flexDirection="row" gap={1}>
            <Text color="red" bold>
              {progress.failed}✗
            </Text>
            <Text color="gray">Failed</Text>
          </Box>
        )}
        {progress.skipped > 0 && (
          <Box flexDirection="row" gap={1}>
            <Text color="yellow" bold>
              {progress.skipped}⏭
            </Text>
            <Text color="gray">Skipped</Text>
          </Box>
        )}
        {progress.total > 0 && (
          <Box flexDirection="row" gap={1}>
            <Text color="gray">/</Text>
            <Text color="white">{progress.total}</Text>
            <Text color="gray">Total</Text>
          </Box>
        )}
        <Box flexGrow={1} />
        <Text color="gray" dimColor>
          Provider: {provider || "opencode"}
        </Text>
      </Box>

      {/* Main Content - Phase 4: Rich Logs */}
      <Box flexDirection="row" flexGrow={1} overflow="hidden">
        {/* Task List (collapsible) */}
        {showTaskList && (
          <Box
            width={showTracing ? "30%" : "40%"}
            flexDirection="column"
            borderStyle="single"
            marginRight={1}
          >
            <Box paddingX={1} borderStyle="single">
              <Text bold underline>
                Work Items
              </Text>
            </Box>
            <Box
              flexDirection="column"
              paddingX={1}
              flexGrow={1}
              overflow="hidden"
            >
              {tasks.length === 0 ? (
                <Text color="gray" dimColor>
                  Loading work items...
                </Text>
              ) : (
                tasks.slice(-20).map((task) => (
                  <Box key={task.id} flexDirection="row" gap={1}>
                    <Text color={task.id === currentTaskId ? "yellow" : "gray"}>
                      {task.id === currentTaskId ? "▶" : " "}
                    </Text>
                    <Text
                      color={
                        task.status === "completed"
                          ? "green"
                          : task.status === "failed"
                            ? "red"
                            : task.status === "running"
                              ? "yellow"
                              : "gray"
                      }
                      dimColor={task.status === "pending"}
                      wrap="truncate-end"
                    >
                      {task.status === "completed" && "✓ "}
                      {task.status === "failed" && "✗ "}
                      {task.status === "skipped" && "⏭ "}
                      {task.status === "running" && "▶ "}
                      {task.status === "pending" && "○ "}
                      {task.description.slice(0, 30)}
                    </Text>
                  </Box>
                ))
              )}
            </Box>
          </Box>
        )}

        {/* Rich Logs Panel - Phase 4 */}
        <Box flexGrow={1} flexDirection="column">
          <RichLogView height={25} showToolbar={true} />
        </Box>

        {/* Tracing Panel (optional) */}
        {showTracing && (
          <Box
            width="30%"
            borderStyle="single"
            marginLeft={1}
            flexDirection="column"
          >
            <Box paddingX={1} borderStyle="single">
              <Text bold underline>
                Subagent Tracing
              </Text>
            </Box>
            <Box flexDirection="column" padding={1}>
              <Text color="gray" dimColor>
                Tracing panel placeholder
              </Text>
              <Text color="gray" dimColor>
                (Phase 2 integration)
              </Text>
            </Box>
          </Box>
        )}
      </Box>

      {/* Footer */}
      <Box
        flexDirection="row"
        borderStyle="single"
        paddingX={1}
        justifyContent="space-between"
      >
        <Text color="gray" dimColor>
          [T]racing [V]iew [P]ause [D]ashboard [Q]uit
        </Text>
        <Text color="gray" dimColor>
          {workspace}
        </Text>
      </Box>
    </Box>
  );
}
