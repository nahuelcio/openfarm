import type { Workflow, WorkflowStep } from "@openfarm/core";
import { create } from "zustand";
import type { OpenFarmConfig } from "../types";

export type Screen =
  | "dashboard"
  | "execute"
  | "running"
  | "history"
  | "workflows"
  | "workflow-editor"
  | "context"
  | "context-config";

export interface Execution {
  id: string;
  task: string;
  provider: string;
  model?: string;
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

  model: string;
  setModel: (model: string) => void;

  availableModels: string[];
  setAvailableModels: (models: string[]) => void;

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

  // Selected workflow for execution
  selectedWorkflowId: string;
  setSelectedWorkflowId: (id: string) => void;

  // Context generation state
  contextStatus:
    | "idle"
    | "selecting"
    | "extracting"
    | "exploring"
    | "analyzing"
    | "synthesizing"
    | "formatting"
    | "complete"
    | "error";
  contextProvider: string;
  contextModel: string;
  contextProgress: number;
  contextResult: string | null;
  contextError: string | null;
  setContextStatus: (status: AppState["contextStatus"]) => void;
  setContextProvider: (provider: string) => void;
  setContextModel: (model: string) => void;
  setContextProgress: (progress: number) => void;
  setContextResult: (result: string) => void;
  setContextError: (error: string) => void;
  resetContext: () => void;
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

  model: "",
  setModel: (model) => set({ model }),

  availableModels: [],
  setAvailableModels: (models) => set({ availableModels: models }),

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

  // Selected workflow for execution (default: task_runner)
  selectedWorkflowId: "task_runner",
  setSelectedWorkflowId: (id) => set({ selectedWorkflowId: id }),

  // Context generation state
  contextStatus: "idle",
  contextProvider: "direct-api",
  contextModel: "",
  contextProgress: 0,
  contextResult: null,
  contextError: null,
  setContextStatus: (status) => set({ contextStatus: status }),
  setContextProvider: (provider) => set({ contextProvider: provider }),
  setContextModel: (model) => set({ contextModel: model }),
  setContextProgress: (progress) => set({ contextProgress: progress }),
  setContextResult: (result) =>
    set({ contextResult: result, contextStatus: "complete" }),
  setContextError: (error) =>
    set({ contextError: error, contextStatus: "error" }),
  resetContext: () =>
    set({
      contextStatus: "idle",
      contextProgress: 0,
      contextResult: null,
      contextError: null,
    }),
}));
