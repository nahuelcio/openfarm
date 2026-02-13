/**
 * Unit tests for the main TUI store (useStore).
 *
 * Tests screen navigation, tab management, task management, provider selection,
 * model management, workspace management, execution CRUD, workflow state,
 * context state, and generated contexts.
 */

import type { Workflow, WorkflowStep } from "@openfarm/core";
import type { GeneratedContext } from "@openfarm/core/db/generated-contexts";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { type Execution, type Screen, type TabId, useStore } from "../../store";

// Mock the core database modules
vi.mock("@openfarm/core", () => ({
  Workflow: {},
}));

vi.mock("@openfarm/core/db", () => ({
  getDb: vi.fn().mockResolvedValue({}),
}));

vi.mock("@openfarm/core/db/tui-executions", () => ({
  createTuiExecution: vi.fn().mockResolvedValue(undefined),
  getTuiExecutions: vi.fn().mockResolvedValue([]),
  updateTuiExecution: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@openfarm/core/db/generated-contexts", () => ({
  createGeneratedContext: vi.fn().mockResolvedValue(undefined),
  getContextsForWorkspace: vi.fn().mockResolvedValue([]),
  getLatestContextForWorkspace: vi.fn().mockResolvedValue(null),
  getContextByGitHash: vi.fn().mockResolvedValue(null),
}));

describe("useStore", () => {
  // Reset store to initial state before each test
  beforeEach(() => {
    useStore.setState({
      screen: "dashboard",
      activeTab: "dashboard",
      config: null,
      task: "",
      provider: "external-agent",
      model: "",
      availableModels: [],
      workspace: process.cwd(),
      externalAgentConfig: {
        cli: "claude",
        args: "",
        agentName: "agent",
      },
      executions: [],
      currentExecution: null,
      workflows: [],
      currentWorkflow: null,
      editingStep: null,
      selectedWorkflowId: "task_runner",
      contextStatus: "idle",
      contextProvider: "direct-api",
      contextModel: "",
      contextProgress: 0,
      contextResult: null,
      contextError: null,
      selectedExecutionForDiff: null,
      selectedDiffFileIndex: 0,
      generatedContexts: [],
      currentContext: null,
      cachedContext: null,
      isTyping: false,
    });
  });

  describe("Screen Navigation", () => {
    it("should initialize with dashboard screen", () => {
      expect(useStore.getState().screen).toBe("dashboard");
    });

    it("should change screen using setScreen", () => {
      const { setScreen } = useStore.getState();

      const screens: Screen[] = [
        "dashboard",
        "execute",
        "running",
        "task-loop",
        "history",
        "execution-detail",
        "diff-viewer",
        "workflows",
        "workflow-editor",
        "context",
        "context-config",
        "context-history",
        "remotes",
        "remote-instance",
        "theme-selector",
      ];

      for (const screen of screens) {
        setScreen(screen);
        expect(useStore.getState().screen).toBe(screen);
      }
    });
  });

  describe("Tab Management", () => {
    it("should initialize with dashboard tab", () => {
      expect(useStore.getState().activeTab).toBe("dashboard");
    });

    it("should change active tab using setActiveTab", () => {
      const { setActiveTab } = useStore.getState();

      const tabs: TabId[] = [
        "dashboard",
        "execute",
        "history",
        "workflows",
        "context",
        "remotes",
        "task-loop",
      ];

      for (const tab of tabs) {
        setActiveTab(tab);
        expect(useStore.getState().activeTab).toBe(tab);
      }
    });

    it("should keep tab and screen independent", () => {
      const { setActiveTab, setScreen } = useStore.getState();

      setActiveTab("execute");
      setScreen("history");

      expect(useStore.getState().activeTab).toBe("execute");
      expect(useStore.getState().screen).toBe("history");
    });
  });

  describe("Task Management", () => {
    it("should initialize with empty task", () => {
      expect(useStore.getState().task).toBe("");
    });

    it("should update task using setTask", () => {
      const { setTask } = useStore.getState();

      setTask("Implement new feature");
      expect(useStore.getState().task).toBe("Implement new feature");

      setTask("Fix bug in production");
      expect(useStore.getState().task).toBe("Fix bug in production");
    });

    it("should handle empty string task", () => {
      const { setTask } = useStore.getState();

      setTask("Some task");
      expect(useStore.getState().task).toBe("Some task");

      setTask("");
      expect(useStore.getState().task).toBe("");
    });

    it("should handle multiline task", () => {
      const { setTask } = useStore.getState();

      const multilineTask = "Line 1\nLine 2\nLine 3";
      setTask(multilineTask);
      expect(useStore.getState().task).toBe(multilineTask);
    });
  });

  describe("Provider Selection", () => {
    it("should initialize with external-agent provider", () => {
      expect(useStore.getState().provider).toBe("external-agent");
    });

    it("should update provider using setProvider", () => {
      const { setProvider } = useStore.getState();

      setProvider("anthropic");
      expect(useStore.getState().provider).toBe("anthropic");

      setProvider("openai");
      expect(useStore.getState().provider).toBe("openai");
    });
  });

  describe("Model Management", () => {
    it("should initialize with empty model", () => {
      expect(useStore.getState().model).toBe("");
    });

    it("should update model using setModel", () => {
      const { setModel } = useStore.getState();

      setModel("claude-3-opus-20240229");
      expect(useStore.getState().model).toBe("claude-3-opus-20240229");

      setModel("gpt-4");
      expect(useStore.getState().model).toBe("gpt-4");
    });

    it("should update available models using setAvailableModels", () => {
      const { setAvailableModels } = useStore.getState();

      const models = ["model-1", "model-2", "model-3"];
      setAvailableModels(models);

      expect(useStore.getState().availableModels).toEqual(models);
    });

    it("should replace all available models on update", () => {
      const { setAvailableModels } = useStore.getState();

      setAvailableModels(["model-a", "model-b"]);
      setAvailableModels(["model-c"]);

      expect(useStore.getState().availableModels).toEqual(["model-c"]);
    });
  });

  describe("Workspace Management", () => {
    it("should initialize with current working directory", () => {
      expect(useStore.getState().workspace).toBe(process.cwd());
    });

    it("should update workspace using setWorkspace", () => {
      const { setWorkspace } = useStore.getState();

      setWorkspace("/path/to/project");
      expect(useStore.getState().workspace).toBe("/path/to/project");

      setWorkspace("/another/path");
      expect(useStore.getState().workspace).toBe("/another/path");
    });
  });

  describe("External Agent Configuration", () => {
    it("should initialize with default external agent config", () => {
      expect(useStore.getState().externalAgentConfig).toEqual({
        cli: "claude",
        args: "",
        agentName: "agent",
      });
    });

    it("should update external agent config partially", () => {
      const { setExternalAgentConfig } = useStore.getState();

      setExternalAgentConfig({ cli: "aider" });
      expect(useStore.getState().externalAgentConfig).toEqual({
        cli: "aider",
        args: "",
        agentName: "agent",
      });
    });

    it("should merge multiple config updates", () => {
      const { setExternalAgentConfig } = useStore.getState();

      setExternalAgentConfig({ cli: "aider" });
      setExternalAgentConfig({ args: "--model gpt-4" });
      setExternalAgentConfig({ agentName: "custom-agent" });

      expect(useStore.getState().externalAgentConfig).toEqual({
        cli: "aider",
        args: "--model gpt-4",
        agentName: "custom-agent",
      });
    });

    it("should not override unspecified fields", () => {
      const { setExternalAgentConfig } = useStore.getState();

      setExternalAgentConfig({ cli: "custom-cli", args: "--flag" });
      setExternalAgentConfig({ agentName: "new-agent" });

      expect(useStore.getState().externalAgentConfig.cli).toBe("custom-cli");
      expect(useStore.getState().externalAgentConfig.args).toBe("--flag");
    });
  });

  describe("Execution CRUD", () => {
    const createMockExecution = (
      id: string,
      overrides: Partial<Execution> = {}
    ): Execution => ({
      id,
      task: `Task ${id}`,
      provider: "test-provider",
      model: "test-model",
      workspace: "/test/workspace",
      status: "pending",
      startedAt: new Date(),
      ...overrides,
    });

    it("should initialize with empty executions array", () => {
      expect(useStore.getState().executions).toEqual([]);
    });

    it("should add execution to the beginning of the array", () => {
      const { addExecution } = useStore.getState();

      const execution1 = createMockExecution("1");
      const execution2 = createMockExecution("2");

      addExecution(execution1);
      addExecution(execution2);

      expect(useStore.getState().executions).toHaveLength(2);
      expect(useStore.getState().executions[0]).toBe(execution2);
      expect(useStore.getState().executions[1]).toBe(execution1);
    });

    it("should update execution by id", () => {
      const { addExecution, updateExecution } = useStore.getState();

      const execution = createMockExecution("1", { status: "pending" });
      addExecution(execution);

      updateExecution("1", { status: "running" });

      expect(useStore.getState().executions[0].status).toBe("running");
    });

    it("should not modify other executions when updating", () => {
      const { addExecution, updateExecution } = useStore.getState();

      const execution1 = createMockExecution("1", { status: "pending" });
      const execution2 = createMockExecution("2", { status: "pending" });

      addExecution(execution1);
      addExecution(execution2);

      updateExecution("1", { status: "completed" });

      expect(useStore.getState().executions[1].status).toBe("completed");
      expect(useStore.getState().executions[0].status).toBe("pending");
    });

    it("should update currentExecution when updating matching execution", () => {
      const { addExecution, setCurrentExecution, updateExecution } =
        useStore.getState();

      const execution = createMockExecution("1", { status: "pending" });
      addExecution(execution);
      setCurrentExecution(execution);

      updateExecution("1", { status: "running" });

      expect(useStore.getState().currentExecution?.status).toBe("running");
    });

    it("should not update currentExecution when updating different execution", () => {
      const { addExecution, setCurrentExecution, updateExecution } =
        useStore.getState();

      const execution1 = createMockExecution("1");
      const execution2 = createMockExecution("2");

      addExecution(execution1);
      addExecution(execution2);
      setCurrentExecution(execution1);

      updateExecution("2", { status: "completed" });

      expect(useStore.getState().currentExecution?.status).toBe("pending");
    });

    it("should set current execution", () => {
      const { setCurrentExecution } = useStore.getState();

      const execution = createMockExecution("1");
      setCurrentExecution(execution);

      expect(useStore.getState().currentExecution).toBe(execution);
    });

    it("should allow setting current execution to null", () => {
      const { setCurrentExecution } = useStore.getState();

      const execution = createMockExecution("1");
      setCurrentExecution(execution);
      setCurrentExecution(null);

      expect(useStore.getState().currentExecution).toBeNull();
    });

    it("should handle all execution statuses", () => {
      const { addExecution, updateExecution } = useStore.getState();

      const statuses: Execution["status"][] = [
        "pending",
        "running",
        "completed",
        "failed",
        "cancelled",
      ];

      for (let i = 0; i < statuses.length; i++) {
        const execution = createMockExecution(`status-${i}`, {
          status: "pending",
        });
        addExecution(execution);
        updateExecution(`status-${i}`, { status: statuses[i] });

        expect(
          useStore.getState().executions.find((e) => e.id === `status-${i}`)
            ?.status
        ).toBe(statuses[i]);
      }
    });

    it("should update execution with optional fields", () => {
      const { addExecution, updateExecution } = useStore.getState();

      const execution = createMockExecution("1");
      addExecution(execution);

      const completedAt = new Date();
      updateExecution("1", {
        status: "completed",
        completedAt,
        duration: 5000,
        output: "Execution output",
        tokensUsed: 1000,
        filesModified: ["file1.ts", "file2.ts"],
        diff: "diff content",
      });

      const updated = useStore.getState().executions[0];
      expect(updated.status).toBe("completed");
      expect(updated.completedAt).toBe(completedAt);
      expect(updated.duration).toBe(5000);
      expect(updated.output).toBe("Execution output");
      expect(updated.tokensUsed).toBe(1000);
      expect(updated.filesModified).toEqual(["file1.ts", "file2.ts"]);
      expect(updated.diff).toBe("diff content");
    });
  });

  describe("Workflow State", () => {
    const createMockWorkflow = (id: string, name: string): Workflow =>
      ({
        id,
        name,
        description: "Test workflow",
        steps: [],
        version: "1.0.0",
      }) as Workflow;

    const createMockStep = (id: string, name: string): WorkflowStep =>
      ({
        id,
        name,
        type: "action",
      }) as WorkflowStep;

    it("should initialize with empty workflows array", () => {
      expect(useStore.getState().workflows).toEqual([]);
    });

    it("should set workflows", () => {
      const { setWorkflows } = useStore.getState();

      const workflows = [
        createMockWorkflow("1", "Workflow 1"),
        createMockWorkflow("2", "Workflow 2"),
      ];

      setWorkflows(workflows);

      expect(useStore.getState().workflows).toHaveLength(2);
      expect(useStore.getState().workflows).toEqual(workflows);
    });

    it("should replace all workflows on set", () => {
      const { setWorkflows } = useStore.getState();

      setWorkflows([createMockWorkflow("1", "Old")]);
      setWorkflows([createMockWorkflow("2", "New")]);

      expect(useStore.getState().workflows).toHaveLength(1);
      expect(useStore.getState().workflows[0].id).toBe("2");
    });

    it("should set current workflow", () => {
      const { setCurrentWorkflow } = useStore.getState();

      const workflow = createMockWorkflow("1", "Test Workflow");
      setCurrentWorkflow(workflow);

      expect(useStore.getState().currentWorkflow).toBe(workflow);
    });

    it("should allow setting current workflow to null", () => {
      const { setCurrentWorkflow } = useStore.getState();

      const workflow = createMockWorkflow("1", "Test Workflow");
      setCurrentWorkflow(workflow);
      setCurrentWorkflow(null);

      expect(useStore.getState().currentWorkflow).toBeNull();
    });

    it("should set editing step", () => {
      const { setEditingStep } = useStore.getState();

      const step = createMockStep("step-1", "Test Step");
      setEditingStep(step);

      expect(useStore.getState().editingStep).toBe(step);
    });

    it("should allow setting editing step to null", () => {
      const { setEditingStep } = useStore.getState();

      const step = createMockStep("step-1", "Test Step");
      setEditingStep(step);
      setEditingStep(null);

      expect(useStore.getState().editingStep).toBeNull();
    });

    it("should initialize with default selected workflow id", () => {
      expect(useStore.getState().selectedWorkflowId).toBe("task_runner");
    });

    it("should set selected workflow id", () => {
      const { setSelectedWorkflowId } = useStore.getState();

      setSelectedWorkflowId("custom-workflow");
      expect(useStore.getState().selectedWorkflowId).toBe("custom-workflow");
    });
  });

  describe("Context State", () => {
    it("should initialize with idle context status", () => {
      expect(useStore.getState().contextStatus).toBe("idle");
    });

    it("should set context status", () => {
      const { setContextStatus } = useStore.getState();

      const statuses = [
        "idle",
        "selecting",
        "extracting",
        "exploring",
        "analyzing",
        "synthesizing",
        "formatting",
        "complete",
        "error",
      ] as const;

      for (const status of statuses) {
        setContextStatus(status);
        expect(useStore.getState().contextStatus).toBe(status);
      }
    });

    it("should initialize with direct-api context provider", () => {
      expect(useStore.getState().contextProvider).toBe("direct-api");
    });

    it("should set context provider", () => {
      const { setContextProvider } = useStore.getState();

      setContextProvider("anthropic");
      expect(useStore.getState().contextProvider).toBe("anthropic");
    });

    it("should set context model", () => {
      const { setContextModel } = useStore.getState();

      setContextModel("claude-3-sonnet");
      expect(useStore.getState().contextModel).toBe("claude-3-sonnet");
    });

    it("should set context progress", () => {
      const { setContextProgress } = useStore.getState();

      setContextProgress(50);
      expect(useStore.getState().contextProgress).toBe(50);

      setContextProgress(100);
      expect(useStore.getState().contextProgress).toBe(100);
    });

    it("should set context result and update status to complete", () => {
      const { setContextResult } = useStore.getState();

      setContextResult("Generated context content");

      expect(useStore.getState().contextResult).toBe(
        "Generated context content"
      );
      expect(useStore.getState().contextStatus).toBe("complete");
    });

    it("should set context error and update status to error", () => {
      const { setContextError } = useStore.getState();

      setContextError("Something went wrong");

      expect(useStore.getState().contextError).toBe("Something went wrong");
      expect(useStore.getState().contextStatus).toBe("error");
    });

    it("should reset context to initial state", () => {
      const {
        setContextResult,
        setContextProgress,
        setContextError,
        resetContext,
      } = useStore.getState();

      setContextProgress(50);
      setContextResult("Result");
      setContextError("Error");

      resetContext();

      expect(useStore.getState().contextStatus).toBe("idle");
      expect(useStore.getState().contextProgress).toBe(0);
      expect(useStore.getState().contextResult).toBeNull();
      expect(useStore.getState().contextError).toBeNull();
    });
  });

  describe("Diff Viewer State", () => {
    const createMockExecution = (id: string): Execution => ({
      id,
      task: `Task ${id}`,
      provider: "test",
      workspace: "/test",
      status: "completed",
      startedAt: new Date(),
      diff: "diff content",
    });

    it("should initialize with null selected execution for diff", () => {
      expect(useStore.getState().selectedExecutionForDiff).toBeNull();
    });

    it("should set selected execution for diff", () => {
      const { setSelectedExecutionForDiff } = useStore.getState();

      const execution = createMockExecution("1");
      setSelectedExecutionForDiff(execution);

      expect(useStore.getState().selectedExecutionForDiff).toBe(execution);
    });

    it("should initialize with 0 selected diff file index", () => {
      expect(useStore.getState().selectedDiffFileIndex).toBe(0);
    });

    it("should set selected diff file index", () => {
      const { setSelectedDiffFileIndex } = useStore.getState();

      setSelectedDiffFileIndex(5);
      expect(useStore.getState().selectedDiffFileIndex).toBe(5);
    });
  });

  describe("Generated Contexts State", () => {
    const createMockContext = (id: string): GeneratedContext =>
      ({
        id,
        workspace: "/test",
        gitHash: "abc123",
        content: "Context content",
        createdAt: new Date().toISOString(),
      }) as GeneratedContext;

    it("should initialize with empty generated contexts", () => {
      expect(useStore.getState().generatedContexts).toEqual([]);
    });

    it("should set current context", () => {
      const { setCurrentContext } = useStore.getState();

      const context = createMockContext("1");
      setCurrentContext(context);

      expect(useStore.getState().currentContext).toBe(context);
    });

    it("should allow setting current context to null", () => {
      const { setCurrentContext } = useStore.getState();

      const context = createMockContext("1");
      setCurrentContext(context);
      setCurrentContext(null);

      expect(useStore.getState().currentContext).toBeNull();
    });

    it("should set cached context", () => {
      const { setCachedContext } = useStore.getState();

      const context = createMockContext("1");
      setCachedContext(context);

      expect(useStore.getState().cachedContext).toBe(context);
    });

    it("should allow setting cached context to null", () => {
      const { setCachedContext } = useStore.getState();

      const context = createMockContext("1");
      setCachedContext(context);
      setCachedContext(null);

      expect(useStore.getState().cachedContext).toBeNull();
    });
  });

  describe("Typing State", () => {
    it("should initialize with isTyping false", () => {
      expect(useStore.getState().isTyping).toBe(false);
    });

    it("should set typing state to true", () => {
      const { setIsTyping } = useStore.getState();

      setIsTyping(true);
      expect(useStore.getState().isTyping).toBe(true);
    });

    it("should set typing state to false", () => {
      const { setIsTyping } = useStore.getState();

      setIsTyping(true);
      setIsTyping(false);
      expect(useStore.getState().isTyping).toBe(false);
    });
  });

  describe("Configuration", () => {
    it("should initialize with null config", () => {
      expect(useStore.getState().config).toBeNull();
    });

    it("should set config", () => {
      const { setConfig } = useStore.getState();

      const mockConfig = {
        providers: [],
        workflows: [],
        defaultProvider: "test",
      } as any;

      setConfig(mockConfig);

      expect(useStore.getState().config).toBe(mockConfig);
    });
  });
});
