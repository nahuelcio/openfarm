import { create } from "zustand";
import { persist } from "zustand/middleware";
import { saveExecutions, loadExecutions } from "./storage";
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
  deleteExecution: (id: string) => void;
  clearExecutions: () => void;
  loadExecutions: () => Promise<void>;

  // UI State
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  theme: "dark" | "light" | "dracula" | "monokai" | "nord" | "oneDark";
  setTheme: (theme: "dark" | "light" | "dracula" | "monokai" | "nord" | "oneDark") => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
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
        set((state) => {
          const newExecutions = [execution, ...state.executions];
          // Persist to storage
          saveExecutions(newExecutions).catch(console.error);
          return {
            executions: newExecutions,
            currentExecution: execution,
          };
        }),
      updateExecution: (id, updates) =>
        set((state) => {
          const newExecutions = state.executions.map((e) =>
            e.id === id ? { ...e, ...updates } : e
          );
          // Persist to storage
          saveExecutions(newExecutions).catch(console.error);
          return {
            executions: newExecutions,
            currentExecution:
              state.currentExecution?.id === id
                ? { ...state.currentExecution, ...updates }
                : state.currentExecution,
          };
        }),
      setCurrentExecution: (execution) => set({ currentExecution: execution }),
      deleteExecution: (id) =>
        set((state) => {
          const newExecutions = state.executions.filter((e) => e.id !== id);
          saveExecutions(newExecutions).catch(console.error);
          return {
            executions: newExecutions,
            currentExecution:
              state.currentExecution?.id === id ? null : state.currentExecution,
          };
        }),
      clearExecutions: () => {
        set({ executions: [], currentExecution: null });
        saveExecutions([]).catch(console.error);
      },
      loadExecutions: async () => {
        const executions = await loadExecutions();
        set({ executions });
      },

      // UI State
      sidebarOpen: true,
      toggleSidebar: () =>
        set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      theme: "dark",
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: "openfarm-tui",
      partialize: (state) => ({
        config: state.config,
        theme: state.theme,
        // Note: executions are persisted separately via storage.ts
      }),
    }
  )
);

// Initialize store by loading persisted executions
// Wrap in try-catch to handle both Node and browser environments
try {
  if (typeof process !== "undefined" && process.versions?.node) {
    // In Node.js environment, load immediately
    loadExecutions().then((executions) => {
      useAppStore.setState({ executions });
    });
  }
} catch {
  // Browser environment - will be handled by component mount
}
