import { create } from "zustand";
import type { OpenFarmConfig } from "../types";

export type Screen = "dashboard" | "execute" | "running" | "history";

export interface Execution {
  id: string;
  task: string;
  provider: string;
  status: "pending" | "running" | "completed" | "failed";
  startedAt: Date;
}

interface AppState {
  screen: Screen;
  setScreen: (screen: Screen) => void;

  config: OpenFarmConfig | null;
  setConfig: (config: OpenFarmConfig) => void;

  task: string;
  setTask: (task: string) => void;

  provider: string;
  setProvider: (provider: string) => void;

  executions: Execution[];
  addExecution: (execution: Execution) => void;
  updateExecution: (id: string, updates: Partial<Execution>) => void;

  currentExecution: Execution | null;
  setCurrentExecution: (execution: Execution | null) => void;
}

export const useStore = create<AppState>((set) => ({
  screen: "dashboard",
  setScreen: (screen) => set({ screen }),

  config: null,
  setConfig: (config) => set({ config }),

  task: "",
  setTask: (task) => set({ task }),

  provider: "opencode",
  setProvider: (provider) => set({ provider }),

  executions: [],
  addExecution: (execution) =>
    set((state) => ({ executions: [execution, ...state.executions] })),
  updateExecution: (id, updates) =>
    set((state) => ({
      executions: state.executions.map((e) =>
        e.id === id ? { ...e, ...updates } : e
      ),
    })),

  currentExecution: null,
  setCurrentExecution: (execution) => set({ currentExecution: execution }),
}));
