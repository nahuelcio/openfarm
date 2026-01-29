import { create } from "zustand";
import type { OpenFarmConfig, ExecutionResult } from "../../types";

export type Screen =
  | "dashboard"
  | "execute"
  | "executing"
  | "history"
  | "execution-detail"
  | "settings";

export interface Execution {
  id: string;
  task: string;
  provider: string;
  status: "pending" | "running" | "completed" | "failed";
  result?: ExecutionResult;
  startedAt: Date;
  completedAt?: Date;
}

interface AppState {
  // Config
  config: OpenFarmConfig;
  setConfig: (config: OpenFarmConfig) => void;

  // Navigation
  currentScreen: Screen;
  setScreen: (screen: Screen) => void;
  screenHistory: Screen[];
  goBack: () => void;

  // Executions
  executions: Execution[];
  currentExecution: Execution | null;
  addExecution: (execution: Execution) => void;
  updateExecution: (id: string, updates: Partial<Execution>) => void;
  setCurrentExecution: (execution: Execution | null) => void;

  // UI State
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  theme: "dark" | "light";
  setTheme: (theme: "dark" | "light") => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Config
  config: {
    defaultProvider: "opencode",
    defaultModel: "claude-3.5-sonnet",
  },
  setConfig: (config) => set({ config }),

  // Navigation
  currentScreen: "dashboard",
  setScreen: (screen) =>
    set((state) => ({
      currentScreen: screen,
      screenHistory: [...state.screenHistory, state.currentScreen],
    })),
  screenHistory: [],
  goBack: () =>
    set((state) => {
      const history = [...state.screenHistory];
      const previous = history.pop();
      return {
        currentScreen: previous || "dashboard",
        screenHistory: history,
      };
    }),

  // Executions
  executions: [],
  currentExecution: null,
  addExecution: (execution) =>
    set((state) => ({
      executions: [execution, ...state.executions],
      currentExecution: execution,
    })),
  updateExecution: (id, updates) =>
    set((state) => ({
      executions: state.executions.map((e) =>
        e.id === id ? { ...e, ...updates } : e
      ),
      currentExecution:
        state.currentExecution?.id === id
          ? { ...state.currentExecution, ...updates }
          : state.currentExecution,
    })),
  setCurrentExecution: (execution) => set({ currentExecution: execution }),

  // UI State
  sidebarOpen: true,
  toggleSidebar: () =>
    set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  theme: "dark",
  setTheme: (theme) => set({ theme }),
}));
