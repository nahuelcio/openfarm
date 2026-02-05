import { create } from "zustand";

export type ScreenLifecycle =
  | "ready"
  | "starting"
  | "selecting"
  | "executing"
  | "paused"
  | "completed"
  | "error";

export type RightPanelMode = "details" | "output";
export type ViewMode = "tasks" | "iterations";
export type OverlayType =
  | "none"
  | "help"
  | "settings"
  | "quit-confirm"
  | "interrupt-confirm";

export type TaskLoopScreenTaskStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "skipped"
  | "blocked";

export interface TaskLoopScreenTask {
  id: string;
  title: string;
  description: string;
  status: TaskLoopScreenTaskStatus;
  priority?: string;
  acceptanceCriteria?: string;
  dependencies?: string[];
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  error?: string;
  output?: string;
  retryCount: number;
}

export interface IterationRecord {
  id: string;
  number: number;
  taskId: string;
  taskTitle: string;
  status: "running" | "completed" | "failed" | "skipped";
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  output?: string;
}

export interface TaskLoopProgress {
  completed: number;
  failed: number;
  skipped: number;
  total: number;
}

interface TaskLoopSettings {
  provider: string;
  model: string;
  stopOnFailure: boolean;
}

interface TaskLoopState {
  lifecycle: ScreenLifecycle;
  sessionId: string | null;

  tasks: TaskLoopScreenTask[];
  selectedTaskIndex: number;
  currentTaskId: string | null;

  progress: TaskLoopProgress;
  rightPanelMode: RightPanelMode;
  viewMode: ViewMode;

  iterations: IterationRecord[];
  selectedIterationIndex: number;
  currentIteration: number;
  maxIterations: number;

  settings: TaskLoopSettings;

  startTime: number | null;
  elapsedMs: number;
  overlay: OverlayType;
  outputLines: string[];
  lastError: string | null;

  setLifecycle: (lifecycle: ScreenLifecycle) => void;
  setSessionId: (sessionId: string | null) => void;
  setTasks: (tasks: TaskLoopScreenTask[]) => void;
  upsertTask: (task: Partial<TaskLoopScreenTask> & { id: string }) => void;
  setTaskStatus: (
    taskId: string,
    status: TaskLoopScreenTaskStatus,
    extra?: Partial<TaskLoopScreenTask>
  ) => void;
  setSelectedTaskIndex: (index: number) => void;
  selectNextTask: () => void;
  selectPreviousTask: () => void;
  selectFirstTask: () => void;
  selectLastTask: () => void;
  setCurrentTaskId: (taskId: string | null) => void;
  setProgress: (progress: Partial<TaskLoopProgress>) => void;
  recalculateProgress: () => void;
  toggleRightPanelMode: () => void;
  toggleViewMode: () => void;
  setOverlay: (overlay: OverlayType) => void;
  setMaxIterations: (maxIterations: number) => void;
  incrementMaxIterations: () => void;
  decrementMaxIterations: () => void;
  setSelectedIterationIndex: (index: number) => void;
  selectNextIteration: () => void;
  selectPreviousIteration: () => void;
  selectFirstIteration: () => void;
  selectLastIteration: () => void;
  addIteration: (iteration: IterationRecord) => void;
  updateCurrentIteration: (
    update: Partial<
      Omit<IterationRecord, "id" | "number" | "taskId" | "taskTitle">
    >
  ) => void;
  setCurrentIteration: (iteration: number) => void;
  setSettings: (settings: Partial<TaskLoopSettings>) => void;
  setStartTime: (startTime: number | null) => void;
  setElapsedMs: (elapsedMs: number) => void;
  addOutputLine: (line: string) => void;
  clearOutput: () => void;
  setLastError: (error: string | null) => void;
  beginRun: () => void;
  reset: () => void;
}

const DEFAULT_STATE = {
  lifecycle: "ready" as ScreenLifecycle,
  sessionId: null as string | null,
  tasks: [] as TaskLoopScreenTask[],
  selectedTaskIndex: 0,
  currentTaskId: null as string | null,
  progress: { completed: 0, failed: 0, skipped: 0, total: 0 },
  rightPanelMode: "details" as RightPanelMode,
  viewMode: "tasks" as ViewMode,
  iterations: [] as IterationRecord[],
  selectedIterationIndex: 0,
  currentIteration: 0,
  maxIterations: 5,
  settings: {
    provider: "external-agent",
    model: "",
    stopOnFailure: false,
  },
  startTime: null as number | null,
  elapsedMs: 0,
  overlay: "none" as OverlayType,
  outputLines: [] as string[],
  lastError: null as string | null,
};

const clamp = (value: number, max: number) => Math.max(0, Math.min(max, value));

export const useTaskLoopStore = create<TaskLoopState>((set, get) => ({
  ...DEFAULT_STATE,

  setLifecycle: (lifecycle) => set({ lifecycle }),
  setSessionId: (sessionId) => set({ sessionId }),
  setTasks: (tasks) =>
    set(() => ({
      tasks,
      selectedTaskIndex: clamp(
        get().selectedTaskIndex,
        Math.max(tasks.length - 1, 0)
      ),
      progress: {
        completed: tasks.filter((task) => task.status === "completed").length,
        failed: tasks.filter((task) => task.status === "failed").length,
        skipped: tasks.filter((task) => task.status === "skipped").length,
        total: tasks.length,
      },
    })),
  upsertTask: (task) =>
    set((state) => {
      const idx = state.tasks.findIndex((item) => item.id === task.id);
      if (idx === -1) {
        const nextTask: TaskLoopScreenTask = {
          id: task.id,
          title: task.title || task.id,
          description: task.description || "",
          status: task.status || "pending",
          priority: task.priority,
          acceptanceCriteria: task.acceptanceCriteria,
          dependencies: task.dependencies,
          startedAt: task.startedAt,
          completedAt: task.completedAt,
          durationMs: task.durationMs,
          error: task.error,
          output: task.output,
          retryCount: task.retryCount ?? 0,
        };
        const tasks = [...state.tasks, nextTask];
        return {
          tasks,
          progress: {
            completed: tasks.filter((item) => item.status === "completed")
              .length,
            failed: tasks.filter((item) => item.status === "failed").length,
            skipped: tasks.filter((item) => item.status === "skipped").length,
            total: tasks.length,
          },
        };
      }

      const tasks = [...state.tasks];
      tasks[idx] = { ...tasks[idx], ...task };
      return {
        tasks,
        progress: {
          completed: tasks.filter((item) => item.status === "completed").length,
          failed: tasks.filter((item) => item.status === "failed").length,
          skipped: tasks.filter((item) => item.status === "skipped").length,
          total: tasks.length,
        },
      };
    }),
  setTaskStatus: (taskId, status, extra) =>
    set((state) => {
      const tasks = state.tasks.map((task) =>
        task.id === taskId ? { ...task, status, ...extra } : task
      );
      return {
        tasks,
        progress: {
          completed: tasks.filter((item) => item.status === "completed").length,
          failed: tasks.filter((item) => item.status === "failed").length,
          skipped: tasks.filter((item) => item.status === "skipped").length,
          total: tasks.length,
        },
      };
    }),
  setSelectedTaskIndex: (index) =>
    set((state) => ({
      selectedTaskIndex: clamp(index, Math.max(state.tasks.length - 1, 0)),
    })),
  selectNextTask: () =>
    set((state) => ({
      selectedTaskIndex:
        state.tasks.length === 0
          ? 0
          : clamp(state.selectedTaskIndex + 1, state.tasks.length - 1),
    })),
  selectPreviousTask: () =>
    set((state) => ({
      selectedTaskIndex:
        state.tasks.length === 0
          ? 0
          : clamp(state.selectedTaskIndex - 1, state.tasks.length - 1),
    })),
  selectFirstTask: () => set({ selectedTaskIndex: 0 }),
  selectLastTask: () =>
    set((state) => ({
      selectedTaskIndex: Math.max(0, state.tasks.length - 1),
    })),
  setCurrentTaskId: (currentTaskId) => set({ currentTaskId }),
  setProgress: (progress) =>
    set((state) => ({ progress: { ...state.progress, ...progress } })),
  recalculateProgress: () =>
    set((state) => ({
      progress: {
        completed: state.tasks.filter((task) => task.status === "completed")
          .length,
        failed: state.tasks.filter((task) => task.status === "failed").length,
        skipped: state.tasks.filter((task) => task.status === "skipped").length,
        total: state.tasks.length,
      },
    })),
  toggleRightPanelMode: () =>
    set((state) => ({
      rightPanelMode: state.rightPanelMode === "details" ? "output" : "details",
    })),
  toggleViewMode: () =>
    set((state) => ({
      viewMode: state.viewMode === "tasks" ? "iterations" : "tasks",
    })),
  setOverlay: (overlay) => set({ overlay }),
  setMaxIterations: (maxIterations) =>
    set({ maxIterations: Math.max(1, Math.min(99, maxIterations)) }),
  incrementMaxIterations: () =>
    set((state) => ({ maxIterations: Math.min(99, state.maxIterations + 1) })),
  decrementMaxIterations: () =>
    set((state) => ({ maxIterations: Math.max(1, state.maxIterations - 1) })),
  setSelectedIterationIndex: (index) =>
    set((state) => ({
      selectedIterationIndex: clamp(
        index,
        Math.max(state.iterations.length - 1, 0)
      ),
    })),
  selectNextIteration: () =>
    set((state) => ({
      selectedIterationIndex:
        state.iterations.length === 0
          ? 0
          : clamp(
              state.selectedIterationIndex + 1,
              state.iterations.length - 1
            ),
    })),
  selectPreviousIteration: () =>
    set((state) => ({
      selectedIterationIndex:
        state.iterations.length === 0
          ? 0
          : clamp(
              state.selectedIterationIndex - 1,
              state.iterations.length - 1
            ),
    })),
  selectFirstIteration: () => set({ selectedIterationIndex: 0 }),
  selectLastIteration: () =>
    set((state) => ({
      selectedIterationIndex: Math.max(0, state.iterations.length - 1),
    })),
  addIteration: (iteration) =>
    set((state) => ({
      iterations: [...state.iterations, iteration],
      selectedIterationIndex: Math.max(0, state.iterations.length),
      currentIteration: iteration.number,
    })),
  updateCurrentIteration: (update) =>
    set((state) => {
      const idx = state.iterations.findIndex(
        (item) => item.status === "running"
      );
      if (idx === -1) {
        return {};
      }
      const iterations = [...state.iterations];
      iterations[idx] = { ...iterations[idx], ...update };
      return { iterations };
    }),
  setCurrentIteration: (currentIteration) => set({ currentIteration }),
  setSettings: (settings) =>
    set((state) => ({
      settings: { ...state.settings, ...settings },
    })),
  setStartTime: (startTime) => set({ startTime }),
  setElapsedMs: (elapsedMs) => set({ elapsedMs }),
  addOutputLine: (line) =>
    set((state) => ({
      outputLines: [...state.outputLines.slice(-499), line],
    })),
  clearOutput: () => set({ outputLines: [] }),
  setLastError: (lastError) => set({ lastError }),
  beginRun: () =>
    set((state) => ({
      lifecycle: "starting",
      sessionId: null,
      currentTaskId: null,
      progress: {
        completed: 0,
        failed: 0,
        skipped: 0,
        total: state.tasks.length,
      },
      startTime: Date.now(),
      elapsedMs: 0,
      currentIteration: 0,
      iterations: [],
      selectedIterationIndex: 0,
      overlay: "none",
      outputLines: [],
      lastError: null,
      tasks: state.tasks.map((task) => ({
        ...task,
        status: "pending",
        startedAt: undefined,
        completedAt: undefined,
        durationMs: undefined,
        error: undefined,
        retryCount: 0,
      })),
    })),
  reset: () => set({ ...DEFAULT_STATE }),
}));
