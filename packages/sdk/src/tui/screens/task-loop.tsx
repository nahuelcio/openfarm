import { getDb, getLocalWorkItems } from "@openfarm/core/db";
import type { TaskLoopEvent } from "@openfarm/task-loop";
import { Box, useInput } from "@openfarm/tui-opentui";
import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  ConfirmDialog,
  HelpOverlay,
  IterationHistoryPanel,
  OrchestrationFooter,
  OrchestrationHeader,
  RightPanel,
  SettingsOverlay,
  TaskListPanel,
} from "../components/task-loop";
import { useTaskLoopKeys } from "../hooks/use-task-loop-keys";
import { useStore } from "../store";
import { type LogLevel, useLogStore } from "../store/log-store";
import type { TaskLoopScreenTaskStatus } from "../store/task-loop-store";
import { useTaskLoopStore } from "../store/task-loop-store";

const PROVIDER_PRESETS = ["opencode", "claude", "aider", "external-agent"];
const MODEL_PRESETS = [
  "",
  "gpt-5-mini",
  "gpt-5",
  "claude-3-5-sonnet",
  "gemini-2.5-pro",
];

interface DbWorkItem {
  id: string;
  title: string;
  description: string;
  acceptanceCriteria: string;
  priority?: string;
  status: string;
}

function mapDbStatusToScreenStatus(status: string): TaskLoopScreenTaskStatus {
  if (status === "completed") {
    return "completed";
  }
  if (status === "failed") {
    return "failed";
  }
  if (status === "pr-created") {
    return "blocked";
  }
  if (status === "fixing") {
    return "running";
  }
  return "pending";
}

export function TaskLoopScreen() {
  const {
    setScreen,
    setActiveTab,
    provider,
    model,
    setProvider,
    setModel,
    workspace,
    executions,
    selectedWorkflowId,
  } = useStore();
  const { addEntry, clearEntries } = useLogStore();
  const store = useTaskLoopStore();
  const orchestratorRef = useRef<{
    run: (options: {
      onEvent?: (event: TaskLoopEvent) => void;
    }) => Promise<unknown>;
    pause: () => void;
  } | null>(null);
  const runningRef = useRef(false);

  const log = useCallback(
    (
      level: LogLevel,
      component: string,
      message: string,
      metadata?: Record<string, unknown>
    ) => {
      addEntry({ level, component, message, metadata });
    },
    [addEntry]
  );

  const refreshTasks = useCallback(async () => {
    try {
      const db = await getDb();
      const workItems = (await getLocalWorkItems(db)) as DbWorkItem[];
      const tasks = workItems.map((item) => ({
        id: item.id,
        title: item.title || item.id,
        description: item.description || "",
        acceptanceCriteria: item.acceptanceCriteria || "",
        priority: item.priority,
        status: mapDbStatusToScreenStatus(item.status),
        retryCount: 0,
      }));
      const currentStore = useTaskLoopStore.getState();
      currentStore.setTasks(tasks);
      currentStore.setLifecycle("ready");
      log("info", "task-loop", `Loaded ${tasks.length} tasks from workspace`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const currentStore = useTaskLoopStore.getState();
      currentStore.setLifecycle("error");
      currentStore.setLastError(message);
      log("error", "task-loop", `Failed to refresh tasks: ${message}`);
    }
  }, [log]);

  const handleEvent = useCallback(
    (event: TaskLoopEvent) => {
      const currentStore = useTaskLoopStore.getState();
      switch (event.type) {
        case "session.started":
          currentStore.setSessionId(event.sessionId);
          currentStore.setLifecycle("selecting");
          if (!currentStore.startTime) {
            currentStore.setStartTime(Date.now());
          }
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
          currentStore.setLifecycle("completed");
          currentStore.setCurrentTaskId(null);
          log("info", "task-loop", "Session completed");
          break;

        case "session.failed":
          currentStore.setLifecycle("error");
          currentStore.setCurrentTaskId(null);
          currentStore.setLastError(JSON.stringify(event.data));
          log("error", "task-loop", "Session failed", {
            error: event.data,
          });
          break;

        case "session.paused":
          currentStore.setLifecycle("paused");
          log("warn", "task-loop", "Session paused by user");
          break;

        case "task.selected":
          if (event.taskId && event.data) {
            const taskData = event.data as {
              description?: string;
              title?: string;
            };
            currentStore.upsertTask({
              id: event.taskId,
              title: taskData.title || event.taskId,
              description: taskData.description || "",
              status: "pending",
              retryCount: 0,
            });
            log(
              "debug",
              "task-loop",
              `Task selected: ${taskData.title || event.taskId}`,
              {
                taskId: event.taskId,
              }
            );
          }
          break;

        case "task.started":
          if (!event.taskId) {
            break;
          }
          currentStore.setLifecycle("executing");
          currentStore.setCurrentTaskId(event.taskId);
          currentStore.upsertTask({
            id: event.taskId,
            title:
              (event.data as { title?: string } | undefined)?.title ||
              event.taskId,
            priority: (event.data as { priority?: string } | undefined)
              ?.priority,
            status: "running",
            startedAt: event.timestamp,
          });
          currentStore.addIteration({
            id: `iter-${Date.now()}-${event.taskId}`,
            number: currentStore.iterations.length + 1,
            taskId: event.taskId,
            taskTitle:
              (event.data as { title?: string } | undefined)?.title ||
              event.taskId,
            status: "running",
            startedAt: event.timestamp,
          });
          log("info", "agent", `▶ Starting: ${event.taskId?.slice(0, 40)}`, {
            taskId: event.taskId,
          });
          break;

        case "task.completed":
          if (!event.taskId) {
            break;
          }
          currentStore.setTaskStatus(event.taskId, "completed", {
            completedAt: event.timestamp,
            durationMs: (event.data as { durationMs?: number } | undefined)
              ?.durationMs,
          });
          currentStore.updateCurrentIteration({
            status: "completed",
            completedAt: event.timestamp,
            durationMs: (event.data as { durationMs?: number } | undefined)
              ?.durationMs,
            output: JSON.stringify(event.data ?? {}),
          });
          currentStore.setCurrentTaskId(null);
          log("info", "agent", `✓ Completed: ${event.taskId?.slice(0, 40)}`, {
            taskId: event.taskId,
          });
          break;

        case "task.failed":
          if (!event.taskId) {
            break;
          }
          currentStore.setTaskStatus(event.taskId, "failed", {
            completedAt: event.timestamp,
            error: JSON.stringify(event.data ?? {}),
          });
          currentStore.updateCurrentIteration({
            status: "failed",
            completedAt: event.timestamp,
            output: JSON.stringify(event.data ?? {}),
          });
          currentStore.setCurrentTaskId(null);
          log("error", "agent", `✗ Failed: ${event.taskId?.slice(0, 40)}`, {
            taskId: event.taskId,
            error: event.data,
          });
          break;

        case "task.skipped":
          if (!event.taskId) {
            break;
          }
          currentStore.setTaskStatus(event.taskId, "skipped", {
            completedAt: event.timestamp,
          });
          currentStore.updateCurrentIteration({
            status: "skipped",
            completedAt: event.timestamp,
            output: JSON.stringify(event.data ?? {}),
          });
          log("warn", "agent", `⏭ Skipped: ${event.taskId?.slice(0, 40)}`, {
            taskId: event.taskId,
          });
          break;

        case "task.retry": {
          if (!event.taskId) {
            break;
          }
          const task = currentStore.tasks.find(
            (item) => item.id === event.taskId
          );
          currentStore.setTaskStatus(event.taskId, "pending", {
            retryCount: (task?.retryCount || 0) + 1,
          });
          currentStore.addOutputLine(
            `[retry] ${event.taskId} -> ${JSON.stringify(event.data ?? {})}`
          );
          break;
        }

        case "log":
          currentStore.addOutputLine(String(event.data ?? ""));
          log("info", "system", String(event.data ?? ""));
          break;
      }
    },
    [log]
  );

  const startTaskLoop = useCallback(async () => {
    if (runningRef.current) {
      return;
    }

    const currentStore = useTaskLoopStore.getState();

    try {
      currentStore.beginRun();
      currentStore.setLifecycle("starting");
      clearEntries();
      log(
        "info",
        "task-loop",
        `Provider: ${currentStore.settings.provider || "external-agent"}`
      );
      log("info", "task-loop", `Workspace: ${workspace}`);

      const { TaskLoopOrchestrator } = await import("@openfarm/task-loop");

      const orchestrator = new TaskLoopOrchestrator({
        provider: currentStore.settings.provider || "external-agent",
        model: currentStore.settings.model || undefined,
        maxIterations: currentStore.maxIterations,
        stopOnFailure: currentStore.settings.stopOnFailure,
      });
      orchestratorRef.current = orchestrator;
      runningRef.current = true;

      await orchestrator.run({
        onEvent: handleEvent,
      });

      if (useTaskLoopStore.getState().lifecycle !== "error") {
        useTaskLoopStore.getState().setLifecycle("completed");
      }
    } catch (error) {
      currentStore.setLifecycle("error");
      currentStore.setLastError(String(error));
      log("error", "task-loop", `Fatal error: ${error}`, {
        error: String(error),
      });
    } finally {
      runningRef.current = false;
      orchestratorRef.current = null;
    }
  }, [clearEntries, handleEvent, log, workspace]);

  const pauseTaskLoop = useCallback(() => {
    orchestratorRef.current?.pause();
    useTaskLoopStore.getState().setLifecycle("paused");
    log("warn", "task-loop", "Pause requested");
  }, [log]);

  const goDashboard = useCallback(() => {
    if (runningRef.current) {
      orchestratorRef.current?.pause();
    }
    setActiveTab("dashboard");
    setScreen("dashboard");
  }, [setActiveTab, setScreen]);

  const confirmInterrupt = useCallback(() => {
    orchestratorRef.current?.pause();
    useTaskLoopStore.getState().setLifecycle("paused");
    goDashboard();
  }, [goDashboard]);

  useEffect(() => {
    const currentStore = useTaskLoopStore.getState();
    currentStore.reset();
    currentStore.setSettings({
      provider: provider || "external-agent",
      model: model || "",
    });
    clearEntries();
    log("info", "task-loop", "Task Loop ready");
    refreshTasks();
  }, [clearEntries, log, model, provider, refreshTasks]);

  useEffect(() => {
    const active =
      store.lifecycle === "starting" ||
      store.lifecycle === "selecting" ||
      store.lifecycle === "executing";
    if (!(active && store.startTime)) {
      return;
    }
    const interval = setInterval(() => {
      useTaskLoopStore.getState().setElapsedMs(Date.now() - store.startTime!);
    }, 1000);
    return () => clearInterval(interval);
  }, [store.lifecycle, store.startTime]);

  useTaskLoopKeys({
    onStartOrResume: startTaskLoop,
    onPause: pauseTaskLoop,
    onRefresh: refreshTasks,
    onDashboard: goDashboard,
    onConfirmQuit: goDashboard,
    onConfirmInterrupt: confirmInterrupt,
    onEnter: () => useTaskLoopStore.getState().toggleRightPanelMode(),
  });

  useInput((input, key) => {
    if (store.overlay !== "settings") {
      return;
    }
    if (key.escape) {
      store.setOverlay("none");
      return;
    }
    if (input === "p") {
      const currentIndex = PROVIDER_PRESETS.indexOf(store.settings.provider);
      const nextIndex = (currentIndex + 1) % PROVIDER_PRESETS.length;
      const nextProvider = PROVIDER_PRESETS[nextIndex];
      store.setSettings({ provider: nextProvider });
      setProvider(nextProvider);
      return;
    }
    if (input === "m") {
      const currentIndex = MODEL_PRESETS.indexOf(store.settings.model);
      const nextIndex = (currentIndex + 1) % MODEL_PRESETS.length;
      const nextModel = MODEL_PRESETS[nextIndex];
      store.setSettings({ model: nextModel });
      setModel(nextModel);
      return;
    }
    if (input === "+") {
      store.incrementMaxIterations();
      return;
    }
    if (input === "-") {
      store.decrementMaxIterations();
      return;
    }
    if (input === "f") {
      store.setSettings({ stopOnFailure: !store.settings.stopOnFailure });
    }
  });

  const selectedTask = store.tasks[store.selectedTaskIndex];
  const selectedIteration = store.iterations[store.selectedIterationIndex];

  const headerIcon = useMemo(() => {
    if (store.lifecycle === "executing" || store.lifecycle === "selecting") {
      return "▶";
    }
    if (store.lifecycle === "paused") {
      return "⏸";
    }
    if (store.lifecycle === "completed") {
      return "✓";
    }
    if (store.lifecycle === "error") {
      return "✗";
    }
    return "○";
  }, [store.lifecycle]);

  const renderOverlay = () => {
    if (store.overlay === "help") {
      return <HelpOverlay />;
    }
    if (store.overlay === "settings") {
      return (
        <SettingsOverlay
          maxIterations={store.maxIterations}
          model={store.settings.model}
          provider={store.settings.provider}
          stopOnFailure={store.settings.stopOnFailure}
        />
      );
    }
    if (store.overlay === "quit-confirm") {
      return (
        <ConfirmDialog
          message="Task loop is running. Quit and discard this session?"
          title="Confirm Quit"
        />
      );
    }
    if (store.overlay === "interrupt-confirm") {
      return (
        <ConfirmDialog
          message="Interrupt current execution and return to dashboard?"
          title="Confirm Interrupt"
        />
      );
    }
    return null;
  };

  const footerMessage = store.lastError
    ? `error: ${store.lastError}`
    : `${store.lifecycle} | session ${store.sessionId?.slice(0, 8) || "n/a"} | ${workspace}`;

  return (
    <Box flexDirection="column" height="100%">
      <OrchestrationHeader
        completed={store.progress.completed}
        currentIteration={store.currentIteration}
        elapsedMs={store.elapsedMs}
        icon={headerIcon}
        maxIterations={store.maxIterations}
        model={store.settings.model}
        provider={store.settings.provider}
        taskLabel={selectedTask?.title || "Task Loop"}
        total={store.progress.total}
      />

      <Box flexDirection="row" flexGrow={1} overflow="hidden">
        {store.overlay !== "none" ? (
          <Box
            flexDirection="column"
            flexGrow={1}
            justifyContent="center"
            padding={1}
          >
            {renderOverlay()}
          </Box>
        ) : (
          <>
            {store.viewMode === "tasks" ? (
              <TaskListPanel
                currentTaskId={store.currentTaskId}
                recentExecutions={executions}
                selectedIndex={store.selectedTaskIndex}
                tasks={store.tasks}
              />
            ) : (
              <IterationHistoryPanel
                iterations={store.iterations}
                selectedIndex={store.selectedIterationIndex}
              />
            )}
            <RightPanel
              mode={store.rightPanelMode}
              outputLines={store.outputLines}
              selectedIteration={selectedIteration}
              selectedTask={selectedTask}
              systemStatus={{
                executionCount: executions.length,
                model: store.settings.model,
                provider: store.settings.provider || provider,
                workflowId: selectedWorkflowId,
                workspace,
              }}
              viewMode={store.viewMode}
            />
          </>
        )}
      </Box>

      <OrchestrationFooter
        lifecycle={store.lifecycle}
        message={footerMessage}
      />
    </Box>
  );
}
