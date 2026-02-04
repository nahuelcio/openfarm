import type { Workflow, WorkflowStep } from "@openfarm/core";
import { getDb } from "@openfarm/core/db";
import {
  createGeneratedContext,
  type GeneratedContext,
  getContextByGitHash,
  getContextsForWorkspace,
  getLatestContextForWorkspace,
} from "@openfarm/core/db/generated-contexts";
import {
  createTuiExecution,
  getTuiExecutions,
  type TuiExecution,
  updateTuiExecution,
} from "@openfarm/core/db/tui-executions";
import { create } from "zustand";
import type { OpenFarmConfig } from "../types";
import { logger } from "../utils/logger";

export type Screen =
  | "dashboard"
  | "execute"
  | "running"
  | "task-loop"
  | "history"
  | "execution-detail"
  | "diff-viewer"
  | "workflows"
  | "workflow-editor"
  | "context"
  | "context-config"
  | "context-history"
  | "remotes"
  | "remote-instance"
  | "theme-selector";

export type TabId = "dashboard" | "execute" | "history" | "workflows" | "context" | "remotes";

export interface Execution {
  id: string;
  task: string;
  provider: string;
  model?: string;
  workspace: string;
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  startedAt: Date;
  completedAt?: Date;
  duration?: number; // milliseconds
  output?: string; // full log output
  error?: string; // error message if failed
  tokensUsed?: number;
  filesModified?: string[]; // paths of changed files
  diff?: string; // git diff output
  workflowId?: string; // workflow used
}

interface AppState {
  screen: Screen;
  setScreen: (screen: Screen) => void;
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;

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

  // External agent configuration
  externalAgentConfig: {
    cli: string;
    args: string;
    agentName: string;
  };
  setExternalAgentConfig: (config: {
    cli?: string;
    args?: string;
    agentName?: string;
  }) => void;

  executions: Execution[];
  addExecution: (execution: Execution) => void;
  updateExecution: (id: string, updates: Partial<Execution>) => void;
  loadExecutionsFromDb: () => Promise<void>;

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

  // Verbose mode for execution

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

  // Diff viewer state
  selectedExecutionForDiff: Execution | null;
  setSelectedExecutionForDiff: (execution: Execution | null) => void;
  selectedDiffFileIndex: number;
  setSelectedDiffFileIndex: (index: number) => void;

  // Generated contexts state
  generatedContexts: GeneratedContext[];
  currentContext: GeneratedContext | null;
  cachedContext: GeneratedContext | null;
  saveGeneratedContext: (context: GeneratedContext) => Promise<void>;
  loadContextsFromDb: () => Promise<void>;
  loadContextsForWorkspace: (workspace: string) => Promise<void>;
  getLatestContext: (workspace: string) => Promise<GeneratedContext | null>;
  getCachedContext: (
    workspace: string,
    gitHash: string
  ) => Promise<GeneratedContext | null>;
  setCurrentContext: (context: GeneratedContext | null) => void;
  setCachedContext: (context: GeneratedContext | null) => void;
}

export const useStore = create<AppState>((set) => ({
  screen: "dashboard",
  setScreen: (screen) => set({ screen }),
  activeTab: "dashboard",
  setActiveTab: (activeTab) => set({ activeTab }),

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

  externalAgentConfig: {
    cli: "claude",
    args: "",
    agentName: "agent",
  },
  setExternalAgentConfig: (config) =>
    set((state) => ({
      externalAgentConfig: { ...state.externalAgentConfig, ...config },
    })),

  executions: [],
  addExecution: (execution) => {
    set((state) => ({ executions: [execution, ...state.executions] }));
    // Persist to database
    getDb()
      .then((db) => createTuiExecution(db, execution as TuiExecution))
      .catch((error) =>
        console.error("Failed to save execution to DB:", error)
      );
  },
  updateExecution: (id, updates) => {
    set((state) => {
      // Update executions array
      const updatedExecutions = state.executions.map((e) =>
        e.id === id ? { ...e, ...updates } : e
      );

      // Also update currentExecution if it's the same execution
      const updatedCurrentExecution =
        state.currentExecution?.id === id
          ? { ...state.currentExecution, ...updates }
          : state.currentExecution;

      return {
        executions: updatedExecutions,
        currentExecution: updatedCurrentExecution,
      };
    });
    // Persist to database
    getDb()
      .then((db) =>
        updateTuiExecution(db, id, updates as Partial<TuiExecution>)
      )
      .catch((error) =>
        console.error("Failed to update execution in DB:", error)
      );
  },
  loadExecutionsFromDb: async () => {
    try {
      const db = await getDb();
      const executions = await getTuiExecutions(db, 100);
      set({ executions: executions as Execution[] });
    } catch (error) {
      logger.error("Failed to load executions from DB:", error);
    }
  },

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

  // Verbose mode for execution (default: false)

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

  // Diff viewer state
  selectedExecutionForDiff: null,
  setSelectedExecutionForDiff: (execution) =>
    set({ selectedExecutionForDiff: execution }),
  selectedDiffFileIndex: 0,
  setSelectedDiffFileIndex: (index) => set({ selectedDiffFileIndex: index }),

  // Generated contexts state
  generatedContexts: [],
  currentContext: null,
  cachedContext: null,
  saveGeneratedContext: async (context) => {
    try {
      const db = await getDb();
      await createGeneratedContext(db, context);
      set((state) => ({
        generatedContexts: [context, ...state.generatedContexts],
        currentContext: context,
      }));
    } catch (error) {
      logger.error("Failed to save context to DB:", error);
    }
  },
  loadContextsFromDb: async () => {
    try {
      const db = await getDb();
      const contexts = await getContextsForWorkspace(
        db,
        useStore.getState().workspace,
        50
      );
      set({ generatedContexts: contexts });
    } catch (error) {
      logger.error("Failed to load contexts from DB:", error);
    }
  },
  loadContextsForWorkspace: async (workspace: string) => {
    try {
      const db = await getDb();
      const contexts = await getContextsForWorkspace(db, workspace, 50);
      set({ generatedContexts: contexts });
    } catch (error) {
      logger.error("Failed to load contexts for workspace:", error);
    }
  },
  getLatestContext: async (workspace: string) => {
    try {
      const db = await getDb();
      const context = await getLatestContextForWorkspace(db, workspace);
      return context;
    } catch (error) {
      logger.error("Failed to get latest context:", error);
      return null;
    }
  },
  getCachedContext: async (workspace: string, gitHash: string) => {
    try {
      const db = await getDb();
      const context = await getContextByGitHash(db, workspace, gitHash);
      if (context) {
        set({ cachedContext: context });
      }
      return context;
    } catch (error) {
      logger.error("Failed to get cached context:", error);
      return null;
    }
  },
  setCurrentContext: (context) => set({ currentContext: context }),
  setCachedContext: (context) => set({ cachedContext: context }),
}));
