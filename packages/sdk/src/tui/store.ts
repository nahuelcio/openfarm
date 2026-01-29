import { create } from "zustand";
import type { OpenFarmConfig } from "../types";
import type { Workflow, WorkflowStep } from "@openfarm/core";

export type Screen =
  | "dashboard"
  | "execute"
  | "running"
  | "history"
  | "workflows"
  | "workflow-editor";

export interface Execution {
  id: string;
  task: string;
  provider: string;
  workspace: string;
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

  workspace: string;
  setWorkspace: (workspace: string) => void;

  executions: Execution[];
  addExecution: (execution: Execution) => void;
  updateExecution: (id: string, updates: Partial<Execution>) => void;

  currentExecution: Execution | null;
  setCurrentExecution: (execution: Execution | null) => void;

  // Workflow editor state
  workflows: Workflow[];
  setWorkflows: (workflows: Workflow[]) => void;
  currentWorkflow: Workflow | null;
  setCurrentWorkflow: (workflow: Workflow | null) => void;
  editingStep: WorkflowStep | null;
  setEditingStep: (step: WorkflowStep | null) => void;
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

  workspace: process.cwd(),
  setWorkspace: (workspace) => set({ workspace }),

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

  // Workflow editor state
  workflows: [],
  setWorkflows: (workflows) => set({ workflows }),
  currentWorkflow: null,
  setCurrentWorkflow: (workflow) => set({ currentWorkflow: workflow }),
  editingStep: null,
  setEditingStep: (step) => set({ editingStep: step }),
}));
