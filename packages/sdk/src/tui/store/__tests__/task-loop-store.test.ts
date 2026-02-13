/**
 * Unit tests for the Task Loop Store (useTaskLoopStore).
 *
 * Tests lifecycle management, task management, navigation, overlay management,
 * view mode toggling, progress tracking, iteration management, and settings.
 */

import { beforeEach, describe, expect, it } from "vitest";
import {
  type IterationRecord,
  type OverlayType,
  type ScreenLifecycle,
  type TaskLoopScreenTask,
  type TaskLoopScreenTaskStatus,
  useTaskLoopStore,
} from "../task-loop-store";

describe("useTaskLoopStore", () => {
  // Reset store to initial state before each test
  beforeEach(() => {
    useTaskLoopStore.setState({
      lifecycle: "ready",
      sessionId: null,
      tasks: [],
      selectedTaskIndex: 0,
      currentTaskId: null,
      progress: { completed: 0, failed: 0, skipped: 0, total: 0 },
      rightPanelMode: "details",
      viewMode: "tasks",
      iterations: [],
      selectedIterationIndex: 0,
      currentIteration: 0,
      maxIterations: 5,
      settings: {
        provider: "external-agent",
        model: "",
        stopOnFailure: false,
      },
      startTime: null,
      elapsedMs: 0,
      overlay: "none",
      outputLines: [],
      lastError: null,
    });
  });

  describe("Initial State", () => {
    it("should initialize with ready lifecycle", () => {
      expect(useTaskLoopStore.getState().lifecycle).toBe("ready");
    });

    it("should initialize with null sessionId", () => {
      expect(useTaskLoopStore.getState().sessionId).toBeNull();
    });

    it("should initialize with empty tasks array", () => {
      expect(useTaskLoopStore.getState().tasks).toEqual([]);
    });

    it("should initialize with zero selected task index", () => {
      expect(useTaskLoopStore.getState().selectedTaskIndex).toBe(0);
    });

    it("should initialize with zero progress", () => {
      expect(useTaskLoopStore.getState().progress).toEqual({
        completed: 0,
        failed: 0,
        skipped: 0,
        total: 0,
      });
    });

    it("should initialize with tasks view mode", () => {
      expect(useTaskLoopStore.getState().viewMode).toBe("tasks");
    });

    it("should initialize with details right panel mode", () => {
      expect(useTaskLoopStore.getState().rightPanelMode).toBe("details");
    });

    it("should initialize with no overlay", () => {
      expect(useTaskLoopStore.getState().overlay).toBe("none");
    });
  });

  describe("Lifecycle Management", () => {
    it("should set lifecycle", () => {
      const { setLifecycle } = useTaskLoopStore.getState();

      const lifecycles: ScreenLifecycle[] = [
        "ready",
        "starting",
        "selecting",
        "executing",
        "paused",
        "completed",
        "error",
      ];

      for (const lifecycle of lifecycles) {
        setLifecycle(lifecycle);
        expect(useTaskLoopStore.getState().lifecycle).toBe(lifecycle);
      }
    });

    it("should set sessionId", () => {
      const { setSessionId } = useTaskLoopStore.getState();

      setSessionId("session-123");
      expect(useTaskLoopStore.getState().sessionId).toBe("session-123");
    });

    it("should allow setting sessionId to null", () => {
      const { setSessionId } = useTaskLoopStore.getState();

      setSessionId("session-123");
      setSessionId(null);
      expect(useTaskLoopStore.getState().sessionId).toBeNull();
    });
  });

  describe("Task Management", () => {
    const createMockTask = (
      id: string,
      overrides: Partial<TaskLoopScreenTask> = {}
    ): TaskLoopScreenTask => ({
      id,
      title: `Task ${id}`,
      description: "Test description",
      status: "pending",
      retryCount: 0,
      ...overrides,
    });

    it("should set tasks", () => {
      const { setTasks } = useTaskLoopStore.getState();

      const tasks = [
        createMockTask("1"),
        createMockTask("2"),
        createMockTask("3"),
      ];

      setTasks(tasks);

      expect(useTaskLoopStore.getState().tasks).toEqual(tasks);
    });

    it("should calculate progress when setting tasks", () => {
      const { setTasks } = useTaskLoopStore.getState();

      const tasks = [
        createMockTask("1", { status: "completed" }),
        createMockTask("2", { status: "failed" }),
        createMockTask("3", { status: "skipped" }),
        createMockTask("4", { status: "pending" }),
      ];

      setTasks(tasks);

      expect(useTaskLoopStore.getState().progress).toEqual({
        completed: 1,
        failed: 1,
        skipped: 1,
        total: 4,
      });
    });

    it("should clamp selected task index when tasks change", () => {
      const { setTasks, setSelectedTaskIndex } = useTaskLoopStore.getState();

      // Set initial tasks and select the last one
      setTasks([createMockTask("1"), createMockTask("2"), createMockTask("3")]);
      setSelectedTaskIndex(2);
      expect(useTaskLoopStore.getState().selectedTaskIndex).toBe(2);

      // Reduce tasks, index should be clamped
      setTasks([createMockTask("1")]);
      expect(useTaskLoopStore.getState().selectedTaskIndex).toBe(0);
    });

    it("should upsert new task", () => {
      const { upsertTask } = useTaskLoopStore.getState();

      upsertTask({
        id: "1",
        title: "New Task",
        description: "New Description",
        status: "pending",
      });

      const tasks = useTaskLoopStore.getState().tasks;
      expect(tasks).toHaveLength(1);
      expect(tasks[0]).toMatchObject({
        id: "1",
        title: "New Task",
        description: "New Description",
        status: "pending",
        retryCount: 0,
      });
    });

    it("should update existing task on upsert", () => {
      const { setTasks, upsertTask } = useTaskLoopStore.getState();

      setTasks([createMockTask("1", { title: "Original" })]);

      upsertTask({
        id: "1",
        title: "Updated",
        status: "running",
      });

      const tasks = useTaskLoopStore.getState().tasks;
      expect(tasks).toHaveLength(1);
      expect(tasks[0].title).toBe("Updated");
      expect(tasks[0].status).toBe("running");
      expect(tasks[0].description).toBe("Test description"); // Unchanged
    });

    it("should recalculate progress after upsert", () => {
      const { upsertTask } = useTaskLoopStore.getState();

      upsertTask({ id: "1", status: "completed" });
      expect(useTaskLoopStore.getState().progress.completed).toBe(1);

      upsertTask({ id: "2", status: "failed" });
      expect(useTaskLoopStore.getState().progress.failed).toBe(1);

      upsertTask({ id: "3", status: "skipped" });
      expect(useTaskLoopStore.getState().progress.skipped).toBe(1);
    });

    it("should set task status", () => {
      const { setTasks, setTaskStatus } = useTaskLoopStore.getState();

      setTasks([createMockTask("1", { status: "pending" })]);

      setTaskStatus("1", "running");
      expect(useTaskLoopStore.getState().tasks[0].status).toBe("running");

      setTaskStatus("1", "completed");
      expect(useTaskLoopStore.getState().tasks[0].status).toBe("completed");
    });

    it("should set task status with extra fields", () => {
      const { setTasks, setTaskStatus } = useTaskLoopStore.getState();

      setTasks([createMockTask("1")]);

      const now = new Date().toISOString();
      setTaskStatus("1", "completed", {
        completedAt: now,
        durationMs: 5000,
        output: "Task output",
      });

      const task = useTaskLoopStore.getState().tasks[0];
      expect(task.status).toBe("completed");
      expect(task.completedAt).toBe(now);
      expect(task.durationMs).toBe(5000);
      expect(task.output).toBe("Task output");
    });

    it("should handle all task statuses", () => {
      const { setTasks, setTaskStatus } = useTaskLoopStore.getState();

      const statuses: TaskLoopScreenTaskStatus[] = [
        "pending",
        "running",
        "completed",
        "failed",
        "skipped",
        "blocked",
      ];

      for (let i = 0; i < statuses.length; i++) {
        setTasks([createMockTask(`task-${i}`)]);
        setTaskStatus(`task-${i}`, statuses[i]);
        expect(useTaskLoopStore.getState().tasks[0].status).toBe(statuses[i]);
      }
    });

    it("should not affect other tasks when setting task status", () => {
      const { setTasks, setTaskStatus } = useTaskLoopStore.getState();

      setTasks([
        createMockTask("1", { status: "pending" }),
        createMockTask("2", { status: "pending" }),
      ]);

      setTaskStatus("1", "completed");

      expect(useTaskLoopStore.getState().tasks[0].status).toBe("completed");
      expect(useTaskLoopStore.getState().tasks[1].status).toBe("pending");
    });

    it("should set current task id", () => {
      const { setCurrentTaskId } = useTaskLoopStore.getState();

      setCurrentTaskId("task-1");
      expect(useTaskLoopStore.getState().currentTaskId).toBe("task-1");
    });

    it("should allow setting current task id to null", () => {
      const { setCurrentTaskId } = useTaskLoopStore.getState();

      setCurrentTaskId("task-1");
      setCurrentTaskId(null);
      expect(useTaskLoopStore.getState().currentTaskId).toBeNull();
    });
  });

  describe("Navigation", () => {
    const createMockTask = (id: string): TaskLoopScreenTask => ({
      id,
      title: `Task ${id}`,
      description: "",
      status: "pending",
      retryCount: 0,
    });

    describe("Task Navigation", () => {
      beforeEach(() => {
        useTaskLoopStore.setState({
          tasks: [
            createMockTask("1"),
            createMockTask("2"),
            createMockTask("3"),
            createMockTask("4"),
            createMockTask("5"),
          ],
          selectedTaskIndex: 0,
        });
      });

      it("should select next task", () => {
        const { selectNextTask } = useTaskLoopStore.getState();

        selectNextTask();
        expect(useTaskLoopStore.getState().selectedTaskIndex).toBe(1);

        selectNextTask();
        expect(useTaskLoopStore.getState().selectedTaskIndex).toBe(2);
      });

      it("should clamp at last task when selecting next", () => {
        const { selectNextTask, setSelectedTaskIndex } =
          useTaskLoopStore.getState();

        setSelectedTaskIndex(4);
        selectNextTask();

        expect(useTaskLoopStore.getState().selectedTaskIndex).toBe(4);
      });

      it("should select previous task", () => {
        const { selectPreviousTask, setSelectedTaskIndex } =
          useTaskLoopStore.getState();

        setSelectedTaskIndex(3);

        selectPreviousTask();
        expect(useTaskLoopStore.getState().selectedTaskIndex).toBe(2);

        selectPreviousTask();
        expect(useTaskLoopStore.getState().selectedTaskIndex).toBe(1);
      });

      it("should clamp at first task when selecting previous", () => {
        const { selectPreviousTask } = useTaskLoopStore.getState();

        selectPreviousTask();
        expect(useTaskLoopStore.getState().selectedTaskIndex).toBe(0);
      });

      it("should select first task", () => {
        const { selectFirstTask, setSelectedTaskIndex } =
          useTaskLoopStore.getState();

        setSelectedTaskIndex(3);
        selectFirstTask();

        expect(useTaskLoopStore.getState().selectedTaskIndex).toBe(0);
      });

      it("should select last task", () => {
        const { selectLastTask } = useTaskLoopStore.getState();

        selectLastTask();
        expect(useTaskLoopStore.getState().selectedTaskIndex).toBe(4);
      });

      it("should handle navigation with empty tasks array", () => {
        useTaskLoopStore.setState({ tasks: [], selectedTaskIndex: 0 });

        const { selectNextTask, selectPreviousTask } =
          useTaskLoopStore.getState();

        selectNextTask();
        expect(useTaskLoopStore.getState().selectedTaskIndex).toBe(0);

        selectPreviousTask();
        expect(useTaskLoopStore.getState().selectedTaskIndex).toBe(0);
      });

      it("should set selected task index", () => {
        const { setSelectedTaskIndex } = useTaskLoopStore.getState();

        setSelectedTaskIndex(2);
        expect(useTaskLoopStore.getState().selectedTaskIndex).toBe(2);
      });

      it("should clamp selected task index to valid range", () => {
        const { setSelectedTaskIndex } = useTaskLoopStore.getState();

        setSelectedTaskIndex(10);
        expect(useTaskLoopStore.getState().selectedTaskIndex).toBe(4);

        setSelectedTaskIndex(-5);
        expect(useTaskLoopStore.getState().selectedTaskIndex).toBe(0);
      });
    });

    describe("Iteration Navigation", () => {
      const createMockIteration = (
        id: string,
        number: number
      ): IterationRecord => ({
        id,
        number,
        taskId: "task-1",
        taskTitle: "Task 1",
        status: "completed",
        startedAt: new Date().toISOString(),
      });

      beforeEach(() => {
        useTaskLoopStore.setState({
          iterations: [
            createMockIteration("1", 1),
            createMockIteration("2", 2),
            createMockIteration("3", 3),
          ],
          selectedIterationIndex: 0,
        });
      });

      it("should select next iteration", () => {
        const { selectNextIteration } = useTaskLoopStore.getState();

        selectNextIteration();
        expect(useTaskLoopStore.getState().selectedIterationIndex).toBe(1);
      });

      it("should clamp at last iteration when selecting next", () => {
        const { selectNextIteration, setSelectedIterationIndex } =
          useTaskLoopStore.getState();

        setSelectedIterationIndex(2);
        selectNextIteration();

        expect(useTaskLoopStore.getState().selectedIterationIndex).toBe(2);
      });

      it("should select previous iteration", () => {
        const { selectPreviousIteration, setSelectedIterationIndex } =
          useTaskLoopStore.getState();

        setSelectedIterationIndex(2);
        selectPreviousIteration();

        expect(useTaskLoopStore.getState().selectedIterationIndex).toBe(1);
      });

      it("should clamp at first iteration when selecting previous", () => {
        const { selectPreviousIteration } = useTaskLoopStore.getState();

        selectPreviousIteration();
        expect(useTaskLoopStore.getState().selectedIterationIndex).toBe(0);
      });

      it("should select first iteration", () => {
        const { selectFirstIteration, setSelectedIterationIndex } =
          useTaskLoopStore.getState();

        setSelectedIterationIndex(2);
        selectFirstIteration();

        expect(useTaskLoopStore.getState().selectedIterationIndex).toBe(0);
      });

      it("should select last iteration", () => {
        const { selectLastIteration } = useTaskLoopStore.getState();

        selectLastIteration();
        expect(useTaskLoopStore.getState().selectedIterationIndex).toBe(2);
      });

      it("should set selected iteration index", () => {
        const { setSelectedIterationIndex } = useTaskLoopStore.getState();

        setSelectedIterationIndex(1);
        expect(useTaskLoopStore.getState().selectedIterationIndex).toBe(1);
      });

      it("should clamp selected iteration index to valid range", () => {
        const { setSelectedIterationIndex } = useTaskLoopStore.getState();

        setSelectedIterationIndex(10);
        expect(useTaskLoopStore.getState().selectedIterationIndex).toBe(2);

        setSelectedIterationIndex(-5);
        expect(useTaskLoopStore.getState().selectedIterationIndex).toBe(0);
      });
    });
  });

  describe("Overlay Management", () => {
    it("should set overlay", () => {
      const { setOverlay } = useTaskLoopStore.getState();

      const overlays: OverlayType[] = [
        "none",
        "resume",
        "help",
        "settings",
        "quit-confirm",
        "interrupt-confirm",
      ];

      for (const overlay of overlays) {
        setOverlay(overlay);
        expect(useTaskLoopStore.getState().overlay).toBe(overlay);
      }
    });
  });

  describe("View Mode", () => {
    it("should toggle view mode from tasks to iterations", () => {
      const { toggleViewMode } = useTaskLoopStore.getState();

      expect(useTaskLoopStore.getState().viewMode).toBe("tasks");

      toggleViewMode();
      expect(useTaskLoopStore.getState().viewMode).toBe("iterations");
    });

    it("should toggle view mode from iterations to tasks", () => {
      const { toggleViewMode } = useTaskLoopStore.getState();

      useTaskLoopStore.setState({ viewMode: "iterations" });

      toggleViewMode();
      expect(useTaskLoopStore.getState().viewMode).toBe("tasks");
    });

    it("should toggle right panel mode", () => {
      const { toggleRightPanelMode } = useTaskLoopStore.getState();

      expect(useTaskLoopStore.getState().rightPanelMode).toBe("details");

      toggleRightPanelMode();
      expect(useTaskLoopStore.getState().rightPanelMode).toBe("output");

      toggleRightPanelMode();
      expect(useTaskLoopStore.getState().rightPanelMode).toBe("details");
    });
  });

  describe("Progress Tracking", () => {
    it("should set progress", () => {
      const { setProgress } = useTaskLoopStore.getState();

      setProgress({ completed: 5, failed: 1, skipped: 2, total: 10 });

      expect(useTaskLoopStore.getState().progress).toEqual({
        completed: 5,
        failed: 1,
        skipped: 2,
        total: 10,
      });
    });

    it("should merge partial progress updates", () => {
      const { setProgress } = useTaskLoopStore.getState();

      setProgress({ completed: 5, total: 10 });

      expect(useTaskLoopStore.getState().progress).toEqual({
        completed: 5,
        failed: 0,
        skipped: 0,
        total: 10,
      });
    });

    it("should recalculate progress from current tasks", () => {
      const { setTasks, recalculateProgress } = useTaskLoopStore.getState();

      setTasks([
        {
          id: "1",
          title: "",
          description: "",
          status: "completed",
          retryCount: 0,
        },
        {
          id: "2",
          title: "",
          description: "",
          status: "failed",
          retryCount: 0,
        },
        {
          id: "3",
          title: "",
          description: "",
          status: "skipped",
          retryCount: 0,
        },
        {
          id: "4",
          title: "",
          description: "",
          status: "pending",
          retryCount: 0,
        },
      ]);

      // Manually override progress to test recalculation
      useTaskLoopStore.setState({
        progress: { completed: 0, failed: 0, skipped: 0, total: 0 },
      });

      recalculateProgress();

      expect(useTaskLoopStore.getState().progress).toEqual({
        completed: 1,
        failed: 1,
        skipped: 1,
        total: 4,
      });
    });
  });

  describe("Iteration Management", () => {
    const createMockIteration = (
      id: string,
      number: number
    ): IterationRecord => ({
      id,
      number,
      taskId: "task-1",
      taskTitle: "Task 1",
      status: "running",
      startedAt: new Date().toISOString(),
    });

    it("should add iteration", () => {
      const { addIteration } = useTaskLoopStore.getState();

      const iteration = createMockIteration("1", 1);
      addIteration(iteration);

      const iterations = useTaskLoopStore.getState().iterations;
      expect(iterations).toHaveLength(1);
      expect(iterations[0]).toEqual(iteration);
    });

    it("should update current iteration number when adding", () => {
      const { addIteration } = useTaskLoopStore.getState();

      addIteration(createMockIteration("1", 1));
      expect(useTaskLoopStore.getState().currentIteration).toBe(1);

      addIteration(createMockIteration("2", 2));
      expect(useTaskLoopStore.getState().currentIteration).toBe(2);
    });

    it("should select newly added iteration", () => {
      const { addIteration } = useTaskLoopStore.getState();

      addIteration(createMockIteration("1", 1));
      expect(useTaskLoopStore.getState().selectedIterationIndex).toBe(0);

      addIteration(createMockIteration("2", 2));
      expect(useTaskLoopStore.getState().selectedIterationIndex).toBe(1);
    });

    it("should update current iteration", () => {
      const { addIteration, updateCurrentIteration } =
        useTaskLoopStore.getState();

      addIteration(createMockIteration("1", 1));

      const completedAt = new Date().toISOString();
      updateCurrentIteration({
        status: "completed",
        completedAt,
        durationMs: 5000,
        output: "Iteration output",
      });

      const iteration = useTaskLoopStore.getState().iterations[0];
      expect(iteration.status).toBe("completed");
      expect(iteration.completedAt).toBe(completedAt);
      expect(iteration.durationMs).toBe(5000);
      expect(iteration.output).toBe("Iteration output");
    });

    it("should not update when no running iteration found", () => {
      const { addIteration, updateCurrentIteration } =
        useTaskLoopStore.getState();

      addIteration({ ...createMockIteration("1", 1), status: "completed" });

      updateCurrentIteration({ output: "New output" });

      expect(useTaskLoopStore.getState().iterations[0].output).toBeUndefined();
    });

    it("should set current iteration", () => {
      const { setCurrentIteration } = useTaskLoopStore.getState();

      setCurrentIteration(3);
      expect(useTaskLoopStore.getState().currentIteration).toBe(3);
    });

    it("should set max iterations", () => {
      const { setMaxIterations } = useTaskLoopStore.getState();

      setMaxIterations(10);
      expect(useTaskLoopStore.getState().maxIterations).toBe(10);
    });

    it("should clamp max iterations to minimum of 1", () => {
      const { setMaxIterations } = useTaskLoopStore.getState();

      setMaxIterations(0);
      expect(useTaskLoopStore.getState().maxIterations).toBe(1);

      setMaxIterations(-5);
      expect(useTaskLoopStore.getState().maxIterations).toBe(1);
    });

    it("should clamp max iterations to maximum of 99", () => {
      const { setMaxIterations } = useTaskLoopStore.getState();

      setMaxIterations(100);
      expect(useTaskLoopStore.getState().maxIterations).toBe(99);

      setMaxIterations(1000);
      expect(useTaskLoopStore.getState().maxIterations).toBe(99);
    });

    it("should increment max iterations", () => {
      const { incrementMaxIterations } = useTaskLoopStore.getState();

      useTaskLoopStore.setState({ maxIterations: 5 });

      incrementMaxIterations();
      expect(useTaskLoopStore.getState().maxIterations).toBe(6);
    });

    it("should not increment beyond 99", () => {
      const { incrementMaxIterations } = useTaskLoopStore.getState();

      useTaskLoopStore.setState({ maxIterations: 99 });

      incrementMaxIterations();
      expect(useTaskLoopStore.getState().maxIterations).toBe(99);
    });

    it("should decrement max iterations", () => {
      const { decrementMaxIterations } = useTaskLoopStore.getState();

      useTaskLoopStore.setState({ maxIterations: 5 });

      decrementMaxIterations();
      expect(useTaskLoopStore.getState().maxIterations).toBe(4);
    });

    it("should not decrement below 1", () => {
      const { decrementMaxIterations } = useTaskLoopStore.getState();

      useTaskLoopStore.setState({ maxIterations: 1 });

      decrementMaxIterations();
      expect(useTaskLoopStore.getState().maxIterations).toBe(1);
    });
  });

  describe("Settings", () => {
    it("should initialize with default settings", () => {
      expect(useTaskLoopStore.getState().settings).toEqual({
        provider: "external-agent",
        model: "",
        stopOnFailure: false,
      });
    });

    it("should update settings partially", () => {
      const { setSettings } = useTaskLoopStore.getState();

      setSettings({ model: "gpt-4" });

      expect(useTaskLoopStore.getState().settings).toEqual({
        provider: "external-agent",
        model: "gpt-4",
        stopOnFailure: false,
      });
    });

    it("should update multiple settings at once", () => {
      const { setSettings } = useTaskLoopStore.getState();

      setSettings({
        provider: "anthropic",
        model: "claude-3-opus",
        stopOnFailure: true,
      });

      expect(useTaskLoopStore.getState().settings).toEqual({
        provider: "anthropic",
        model: "claude-3-opus",
        stopOnFailure: true,
      });
    });
  });

  describe("Timing", () => {
    it("should set start time", () => {
      const { setStartTime } = useTaskLoopStore.getState();

      const now = Date.now();
      setStartTime(now);

      expect(useTaskLoopStore.getState().startTime).toBe(now);
    });

    it("should allow setting start time to null", () => {
      const { setStartTime } = useTaskLoopStore.getState();

      setStartTime(Date.now());
      setStartTime(null);

      expect(useTaskLoopStore.getState().startTime).toBeNull();
    });

    it("should set elapsed milliseconds", () => {
      const { setElapsedMs } = useTaskLoopStore.getState();

      setElapsedMs(5000);
      expect(useTaskLoopStore.getState().elapsedMs).toBe(5000);
    });
  });

  describe("Output Management", () => {
    it("should add output line", () => {
      const { addOutputLine } = useTaskLoopStore.getState();

      addOutputLine("Line 1");
      addOutputLine("Line 2");

      expect(useTaskLoopStore.getState().outputLines).toEqual([
        "Line 1",
        "Line 2",
      ]);
    });

    it("should limit output lines to 500", () => {
      const { addOutputLine } = useTaskLoopStore.getState();

      // Add 600 lines
      for (let i = 0; i < 600; i++) {
        addOutputLine(`Line ${i}`);
      }

      const lines = useTaskLoopStore.getState().outputLines;
      expect(lines).toHaveLength(500);
      expect(lines[0]).toBe("Line 100"); // First 100 were dropped
      expect(lines[499]).toBe("Line 599");
    });

    it("should clear output", () => {
      const { addOutputLine, clearOutput } = useTaskLoopStore.getState();

      addOutputLine("Line 1");
      addOutputLine("Line 2");
      clearOutput();

      expect(useTaskLoopStore.getState().outputLines).toEqual([]);
    });
  });

  describe("Error Handling", () => {
    it("should set last error", () => {
      const { setLastError } = useTaskLoopStore.getState();

      setLastError("Something went wrong");
      expect(useTaskLoopStore.getState().lastError).toBe(
        "Something went wrong"
      );
    });

    it("should allow clearing last error", () => {
      const { setLastError } = useTaskLoopStore.getState();

      setLastError("Error");
      setLastError(null);

      expect(useTaskLoopStore.getState().lastError).toBeNull();
    });
  });

  describe("Begin Run", () => {
    const createMockTask = (id: string): TaskLoopScreenTask => ({
      id,
      title: `Task ${id}`,
      description: "",
      status: "completed",
      retryCount: 3,
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      durationMs: 5000,
      error: "Old error",
      output: "Old output",
    });

    it("should reset state for new run", () => {
      const { setTasks, beginRun } = useTaskLoopStore.getState();

      setTasks([createMockTask("1"), createMockTask("2")]);
      useTaskLoopStore.setState({
        lifecycle: "completed",
        sessionId: "old-session",
        currentTaskId: "task-1",
        progress: { completed: 2, failed: 0, skipped: 0, total: 2 },
        currentIteration: 5,
        iterations: [
          {
            id: "1",
            number: 1,
            taskId: "1",
            taskTitle: "",
            status: "completed",
            startedAt: "",
          },
        ],
        selectedIterationIndex: 0,
        overlay: "help",
        outputLines: ["old output"],
        lastError: "old error",
      });

      beginRun();

      const state = useTaskLoopStore.getState();
      expect(state.lifecycle).toBe("starting");
      expect(state.sessionId).toBeNull();
      expect(state.currentTaskId).toBeNull();
      expect(state.progress).toEqual({
        completed: 0,
        failed: 0,
        skipped: 0,
        total: 2,
      });
      expect(state.currentIteration).toBe(0);
      expect(state.iterations).toEqual([]);
      expect(state.selectedIterationIndex).toBe(0);
      expect(state.overlay).toBe("none");
      expect(state.outputLines).toEqual([]);
      expect(state.lastError).toBeNull();
    });

    it("should reset all tasks to pending", () => {
      const { setTasks, beginRun } = useTaskLoopStore.getState();

      setTasks([createMockTask("1"), createMockTask("2")]);
      beginRun();

      const tasks = useTaskLoopStore.getState().tasks;
      expect(tasks[0].status).toBe("pending");
      expect(tasks[1].status).toBe("pending");
    });

    it("should clear task timing and error data", () => {
      const { setTasks, beginRun } = useTaskLoopStore.getState();

      setTasks([createMockTask("1")]);
      beginRun();

      const task = useTaskLoopStore.getState().tasks[0];
      expect(task.startedAt).toBeUndefined();
      expect(task.completedAt).toBeUndefined();
      expect(task.durationMs).toBeUndefined();
      expect(task.error).toBeUndefined();
      // Note: output is intentionally preserved by the store
      expect(task.output).toBe("Old output");
      expect(task.retryCount).toBe(0);
    });

    it("should set start time", () => {
      const { beginRun } = useTaskLoopStore.getState();

      const before = Date.now();
      beginRun();
      const after = Date.now();

      const startTime = useTaskLoopStore.getState().startTime;
      expect(startTime).toBeGreaterThanOrEqual(before);
      expect(startTime).toBeLessThanOrEqual(after);
    });
  });

  describe("Reset", () => {
    it("should reset to default state", () => {
      const { setTasks, setLifecycle, reset } = useTaskLoopStore.getState();

      setTasks([
        {
          id: "1",
          title: "",
          description: "",
          status: "completed",
          retryCount: 0,
        },
      ]);
      setLifecycle("completed");
      useTaskLoopStore.setState({
        sessionId: "session",
        currentTaskId: "task",
        progress: { completed: 1, failed: 0, skipped: 0, total: 1 },
        iterations: [
          {
            id: "1",
            number: 1,
            taskId: "1",
            taskTitle: "",
            status: "completed",
            startedAt: "",
          },
        ],
        currentIteration: 5,
        overlay: "help",
        outputLines: ["output"],
        lastError: "error",
      });

      reset();

      const state = useTaskLoopStore.getState();
      expect(state.lifecycle).toBe("ready");
      expect(state.sessionId).toBeNull();
      expect(state.tasks).toEqual([]);
      expect(state.selectedTaskIndex).toBe(0);
      expect(state.currentTaskId).toBeNull();
      expect(state.progress).toEqual({
        completed: 0,
        failed: 0,
        skipped: 0,
        total: 0,
      });
      expect(state.iterations).toEqual([]);
      expect(state.currentIteration).toBe(0);
      expect(state.maxIterations).toBe(5);
      expect(state.overlay).toBe("none");
      expect(state.outputLines).toEqual([]);
      expect(state.lastError).toBeNull();
    });
  });
});
