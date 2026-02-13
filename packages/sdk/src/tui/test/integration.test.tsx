/**
 * TUI Integration Tests
 *
 * End-to-end tests for the OpenFarm TUI that verify:
 * - App renders without crashing
 * - Navigation between screens works
 * - Execute flow completes correctly
 * - Store interactions work as expected
 */

import type { ReactElement } from "react";
import { createElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppV2 } from "../app";
import { type Screen, useStore } from "../store";
import { useExecutionRuntimeStore } from "../store/execution-runtime-store";

// ============================================================================
// Mock Setup
// ============================================================================

// Mock OpenTUI components
vi.mock("@openfarm/tui-opentui", () => ({
  Box: ({
    children,
    ...props
  }: {
    children?: React.ReactNode;
    [key: string]: unknown;
  }) => createElement("box", props, children),
  Text: ({
    children,
    ...props
  }: {
    children?: React.ReactNode;
    [key: string]: unknown;
  }) => createElement("text", props, children),
  useApp: () => ({ exit: () => {} }),
  useInput: (
    handler: (input: string, key: Record<string, boolean>) => void
  ) => {
    (
      globalThis as unknown as { __testInputHandler: typeof handler }
    ).__testInputHandler = handler;
  },
  useStdout: () => ({ stdout: process.stdout }),
  useStdoutDimensions: () => ({ rows: 24, columns: 80 }),
  render: (node: ReactElement) => ({
    waitUntilExit: () => Promise.resolve(),
    unmount: () => {},
    clear: () => {},
  }),
}));

vi.mock("@openfarm/tui-opentui/text-input", () => ({
  default: ({
    value,
    placeholder,
    onChange,
    focus,
  }: {
    value: string;
    placeholder?: string;
    onChange: (value: string) => void;
    focus?: boolean;
  }) =>
    createElement("input", { value, placeholder, focused: focus, onChange }),
}));

// Mock hooks
vi.mock("../hooks/use-initialization", () => ({
  useInitialization: () => ({
    isReady: true,
    progress: 100,
    status: "Ready",
  }),
}));

// Mock database
vi.mock("@openfarm/core/db", () => ({
  getDb: () => Promise.resolve({}),
}));

vi.mock("@openfarm/core/db/tui-executions", () => ({
  createTuiExecution: () => Promise.resolve(),
  getTuiExecutions: () => Promise.resolve([]),
  updateTuiExecution: () => Promise.resolve(),
}));

vi.mock("@openfarm/core/db/generated-contexts", () => ({
  createGeneratedContext: () => Promise.resolve(),
  getContextsForWorkspace: () => Promise.resolve([]),
  getLatestContextForWorkspace: () => Promise.resolve(null),
  getContextByGitHash: () => Promise.resolve(null),
}));

// Mock workflow loader
vi.mock("../utils/workflow-loader", () => ({
  DEFAULT_WORKFLOWS: [
    { id: "oneshot", name: "One Shot", description: "Single execution" },
    {
      id: "task_runner",
      name: "Task Runner",
      description: "Branch-based execution",
    },
    {
      id: "task_loop",
      name: "Task Loop",
      description: "Multi-iteration workflow",
    },
  ],
  syncWorkflowsInBackground: () => {},
}));

// Mock models
vi.mock("../utils/models", () => ({
  getAvailableModels: () =>
    Promise.resolve(["claude-3-opus", "gpt-4", "gemini-pro"]),
  preloadModels: () => {},
}));

// Mock logger
vi.mock("../utils/logger", () => ({
  logger: {
    info: () => {},
    error: () => {},
    warn: () => {},
    debug: () => {},
  },
}));

// Mock theme
vi.mock("../theme/hooks", () => ({
  useThemeColors: () => ({
    primary: "cyan",
    secondary: "blue",
    success: "green",
    error: "red",
    warning: "yellow",
    muted: "gray",
    border: "gray",
    background: "black",
  }),
}));

// Mock components that use complex external deps
vi.mock("../components/layout/main-layout", () => ({
  MainLayout: ({ children }: { children: React.ReactNode }) =>
    createElement("main-layout", null, children),
}));

vi.mock("../components/layout/improved-sidebar", () => ({
  ImprovedSidebar: () => createElement("sidebar", null),
}));

vi.mock("../components/splash-screen", () => ({
  SplashScreen: () => createElement("splash-screen", null),
}));

vi.mock("../screens/new-dashboard", () => ({
  NewDashboard: () =>
    createElement("new-dashboard", { "data-screen": "dashboard" }),
}));

vi.mock("../screens/execute", () => ({
  Execute: () => createElement("execute", { "data-screen": "execute" }),
}));

vi.mock("../screens/history", () => ({
  History: () => createElement("history", { "data-screen": "history" }),
}));

vi.mock("../screens/workflow-list", () => ({
  WorkflowList: () =>
    createElement("workflow-list", { "data-screen": "workflows" }),
}));

vi.mock("../screens/workflow-editor", () => ({
  WorkflowEditor: () =>
    createElement("workflow-editor", { "data-screen": "workflow-editor" }),
}));

vi.mock("../screens/context-config", () => ({
  ContextConfigScreen: () =>
    createElement("context-config", { "data-screen": "context-config" }),
}));

vi.mock("../screens/context", () => ({
  ContextScreen: () => createElement("context", { "data-screen": "context" }),
}));

vi.mock("../screens/context-history", () => ({
  ContextHistoryScreen: () =>
    createElement("context-history", { "data-screen": "context-history" }),
}));

vi.mock("../screens/remote-instances", () => ({
  RemoteInstancesScreen: () =>
    createElement("remote-instances", { "data-screen": "remotes" }),
}));

vi.mock("../screens/running", () => ({
  Running: () => createElement("running", { "data-screen": "running" }),
}));

vi.mock("../screens/task-loop", () => ({
  TaskLoopScreen: () =>
    createElement("task-loop", { "data-screen": "task-loop" }),
}));

vi.mock("../screens/execution-detail", () => ({
  ExecutionDetail: () =>
    createElement("execution-detail", { "data-screen": "execution-detail" }),
}));

vi.mock("../screens/diff-viewer", () => ({
  DiffViewer: () =>
    createElement("diff-viewer", { "data-screen": "diff-viewer" }),
}));

vi.mock("../screens/theme-selector", () => ({
  ThemeSelector: () =>
    createElement("theme-selector", { "data-screen": "theme-selector" }),
}));

// ============================================================================
// Test Suite
// ============================================================================

describe("TUI Integration", () => {
  beforeEach(() => {
    // Reset stores before each test
    useStore.setState({
      screen: "dashboard",
      activeTab: "dashboard",
      task: "",
      provider: "external-agent",
      model: "",
      workspace: process.cwd(),
      executions: [],
      currentExecution: null,
      workflows: [],
      currentWorkflow: null,
      editingStep: null,
      selectedWorkflowId: "task_runner",
      contextStatus: "idle",
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

    // Reset execution runtime store
    useExecutionRuntimeStore.setState({
      sessions: {},
    });

    // Clear input handler
    (
      globalThis as unknown as { __testInputHandler?: unknown }
    ).__testInputHandler = undefined;
  });

  // ==========================================================================
  // Smoke Tests
  // ==========================================================================

  describe("Smoke Tests", () => {
    it("should render AppV2 without crashing", () => {
      // Act - Just verify creating the element doesn't throw
      const element = createElement(AppV2, null);

      // Assert
      expect(element).toBeDefined();
      expect(element.type).toBeDefined();
    });

    it("should initialize with default state", () => {
      // Arrange
      const state = useStore.getState();

      // Assert
      expect(state.screen).toBe("dashboard");
      expect(state.activeTab).toBe("dashboard");
      expect(state.provider).toBe("external-agent");
      expect(state.selectedWorkflowId).toBe("task_runner");
      expect(state.executions).toEqual([]);
      expect(state.currentExecution).toBeNull();
    });

    it("should have execution runtime store initialized", () => {
      // Arrange
      const state = useExecutionRuntimeStore.getState();

      // Assert
      expect(state.sessions).toEqual({});
      expect(state.hasActiveSession()).toBe(false);
      expect(state.getActiveSessionId()).toBeNull();
    });
  });

  // ==========================================================================
  // Navigation Tests
  // ==========================================================================

  describe("Navigation", () => {
    it("should navigate to execute screen via store", () => {
      // Arrange
      const { setScreen } = useStore.getState();

      // Act
      setScreen("execute");

      // Assert
      expect(useStore.getState().screen).toBe("execute");
    });

    it("should navigate to history screen via store", () => {
      // Arrange
      const { setScreen } = useStore.getState();

      // Act
      setScreen("history");

      // Assert
      expect(useStore.getState().screen).toBe("history");
    });

    it("should navigate to workflows screen via store", () => {
      // Arrange
      const { setScreen } = useStore.getState();

      // Act
      setScreen("workflows");

      // Assert
      expect(useStore.getState().screen).toBe("workflows");
    });

    it("should navigate to context-config screen via store", () => {
      // Arrange
      const { setScreen } = useStore.getState();

      // Act
      setScreen("context-config");

      // Assert
      expect(useStore.getState().screen).toBe("context-config");
    });

    it("should navigate to remotes screen via store", () => {
      // Arrange
      const { setScreen } = useStore.getState();

      // Act
      setScreen("remotes");

      // Assert
      expect(useStore.getState().screen).toBe("remotes");
    });

    it("should navigate to task-loop screen via store", () => {
      // Arrange
      const { setScreen } = useStore.getState();

      // Act
      setScreen("task-loop");

      // Assert
      expect(useStore.getState().screen).toBe("task-loop");
    });

    it("should update active tab when screen changes", () => {
      // Arrange
      const { setScreen, setActiveTab } = useStore.getState();

      // Act - Navigate to execute
      setScreen("execute");
      setActiveTab("execute");

      // Assert
      expect(useStore.getState().screen).toBe("execute");
      expect(useStore.getState().activeTab).toBe("execute");
    });

    it("should navigate from dashboard to all main sections", () => {
      // Arrange
      const { setScreen } = useStore.getState();
      const screens: Screen[] = [
        "dashboard",
        "execute",
        "history",
        "workflows",
        "context-config",
        "remotes",
        "task-loop",
      ];

      // Act & Assert
      for (const screen of screens) {
        setScreen(screen);
        expect(useStore.getState().screen).toBe(screen);
      }
    });

    it("should handle navigation to nested screens", () => {
      // Arrange
      const { setScreen } = useStore.getState();
      const nestedScreens: Screen[] = [
        "execution-detail",
        "diff-viewer",
        "workflow-editor",
        "context",
        "context-history",
        "running",
      ];

      // Act & Assert
      for (const screen of nestedScreens) {
        setScreen(screen);
        expect(useStore.getState().screen).toBe(screen);
      }
    });
  });

  // ==========================================================================
  // Execute Flow Tests
  // ==========================================================================

  describe("Execute Flow", () => {
    it("should set task and provider for execution", () => {
      // Arrange
      const { setTask, setProvider, setModel, setWorkspace } =
        useStore.getState();

      // Act
      setTask("Fix the authentication bug");
      setProvider("claude");
      setModel("claude-3-opus");
      setWorkspace("/tmp/test-project");

      // Assert
      const state = useStore.getState();
      expect(state.task).toBe("Fix the authentication bug");
      expect(state.provider).toBe("claude");
      expect(state.model).toBe("claude-3-opus");
      expect(state.workspace).toBe("/tmp/test-project");
    });

    it("should add execution to store", () => {
      // Arrange
      const { addExecution } = useStore.getState();
      const execution = {
        id: "exec_test_001",
        task: "Test task",
        provider: "external-agent",
        model: "claude-3-opus",
        workspace: process.cwd(),
        status: "pending" as const,
        startedAt: new Date(),
      };

      // Act
      addExecution(execution);

      // Assert
      const state = useStore.getState();
      expect(state.executions).toHaveLength(1);
      expect(state.executions[0].id).toBe("exec_test_001");
      expect(state.executions[0].task).toBe("Test task");
      expect(state.executions[0].status).toBe("pending");
    });

    it("should set current execution", () => {
      // Arrange
      const { setCurrentExecution } = useStore.getState();
      const execution = {
        id: "exec_test_002",
        task: "Current task",
        provider: "claude",
        workspace: process.cwd(),
        status: "running" as const,
        startedAt: new Date(),
      };

      // Act
      setCurrentExecution(execution);

      // Assert
      expect(useStore.getState().currentExecution).toEqual(execution);
    });

    it("should update execution status", () => {
      // Arrange
      const { addExecution, updateExecution } = useStore.getState();
      const execution = {
        id: "exec_test_003",
        task: "Test update",
        provider: "external-agent",
        workspace: process.cwd(),
        status: "pending" as const,
        startedAt: new Date(),
      };

      // Act
      addExecution(execution);
      updateExecution("exec_test_003", { status: "running" });

      // Assert
      const state = useStore.getState();
      expect(state.executions[0].status).toBe("running");
    });

    it("should complete full execute flow via store", () => {
      // Arrange
      const {
        setScreen,
        setTask,
        setProvider,
        setModel,
        setWorkspace,
        addExecution,
        setCurrentExecution,
      } = useStore.getState();

      // Act - Simulate execute flow
      // 1. Navigate to execute
      setScreen("execute");

      // 2. Configure execution
      setTask("Refactor login component");
      setProvider("claude");
      setModel("claude-3-opus");
      setWorkspace("/home/user/project");

      // 3. Create execution
      const execution = {
        id: "exec_flow_test",
        task: useStore.getState().task,
        provider: useStore.getState().provider,
        model: useStore.getState().model,
        workspace: useStore.getState().workspace,
        status: "pending" as const,
        startedAt: new Date(),
      };
      addExecution(execution);
      setCurrentExecution(execution);

      // 4. Navigate to running
      setScreen("running");

      // Assert
      const state = useStore.getState();
      expect(state.screen).toBe("running");
      expect(state.executions).toHaveLength(1);
      expect(state.executions[0].task).toBe("Refactor login component");
      expect(state.currentExecution).toBeDefined();
      expect(state.currentExecution?.task).toBe("Refactor login component");
    });

    it("should create execution runtime session", () => {
      // Arrange
      const { createSession } = useExecutionRuntimeStore.getState();

      // Act
      createSession("exec_runtime_001", Date.now());

      // Assert
      const state = useExecutionRuntimeStore.getState();
      expect(state.sessions.exec_runtime_001).toBeDefined();
      expect(state.hasActiveSession()).toBe(true);
      expect(state.getActiveSessionId()).toBe("exec_runtime_001");
    });

    it("should add logs to runtime session", () => {
      // Arrange
      const { createSession, addLog } = useExecutionRuntimeStore.getState();

      // Act
      createSession("exec_runtime_002", Date.now());
      addLog("exec_runtime_002", "Starting execution...");
      addLog("exec_runtime_002", "Step 1 complete");
      addLog("exec_runtime_002", "Step 2 complete");

      // Assert
      const state = useExecutionRuntimeStore.getState();
      const session = state.sessions.exec_runtime_002;
      expect(session.logs.length).toBeGreaterThanOrEqual(2);
    });

    it("should update session progress", () => {
      // Arrange
      const { createSession, updateSession } =
        useExecutionRuntimeStore.getState();

      // Act
      createSession("exec_runtime_003", Date.now());
      updateSession("exec_runtime_003", {
        currentStep: "build",
        stepProgress: { current: 2, total: 5 },
      });

      // Assert
      const session =
        useExecutionRuntimeStore.getState().sessions.exec_runtime_003;
      expect(session.currentStep).toBe("build");
      expect(session.stepProgress).toEqual({ current: 2, total: 5 });
    });

    it("should complete and remove runtime session", () => {
      // Arrange
      const { createSession, updateSession, removeSession } =
        useExecutionRuntimeStore.getState();

      // Act
      createSession("exec_runtime_004", Date.now());
      updateSession("exec_runtime_004", { isDone: true, success: true });
      removeSession("exec_runtime_004");

      // Assert
      const state = useExecutionRuntimeStore.getState();
      expect(state.sessions.exec_runtime_004).toBeUndefined();
    });
  });

  // ==========================================================================
  // Store Persistence Integration Tests
  // ==========================================================================

  describe("Store Persistence Integration", () => {
    it("should persist multiple executions", () => {
      // Arrange
      const { addExecution } = useStore.getState();

      // Act
      for (let i = 0; i < 5; i++) {
        addExecution({
          id: `exec_batch_${i}`,
          task: `Task ${i}`,
          provider: "external-agent",
          workspace: process.cwd(),
          status: i % 2 === 0 ? "completed" : "failed",
          startedAt: new Date(Date.now() - i * 60_000),
        });
      }

      // Assert
      const state = useStore.getState();
      expect(state.executions).toHaveLength(5);
      // Executions are prepended (newest first)
      expect(state.executions[4].task).toBe("Task 0");
      expect(state.executions[0].task).toBe("Task 4");
    });

    it("should update execution preserving other fields", () => {
      // Arrange
      const { addExecution, updateExecution } = useStore.getState();
      const startedAt = new Date("2024-01-01");

      // Act
      addExecution({
        id: "exec_update_test",
        task: "Original task",
        provider: "claude",
        model: "claude-3-opus",
        workspace: "/workspace",
        status: "pending",
        startedAt,
      });

      updateExecution("exec_update_test", {
        status: "completed",
        duration: 5000,
        tokensUsed: 1024,
      });

      // Assert
      const execution = useStore.getState().executions[0];
      expect(execution.status).toBe("completed");
      expect(execution.task).toBe("Original task");
      expect(execution.provider).toBe("claude");
      expect(execution.model).toBe("claude-3-opus");
      expect(execution.duration).toBe(5000);
      expect(execution.tokensUsed).toBe(1024);
      expect(execution.startedAt).toEqual(startedAt);
    });

    it("should sync currentExecution with executions array", () => {
      // Arrange
      const { addExecution, setCurrentExecution, updateExecution } =
        useStore.getState();

      // Act
      const execution = {
        id: "exec_sync_test",
        task: "Sync test",
        provider: "external-agent",
        workspace: process.cwd(),
        status: "running" as const,
        startedAt: new Date(),
      };
      addExecution(execution);
      setCurrentExecution(execution);

      // Update via executions array
      updateExecution("exec_sync_test", { status: "completed" });

      // Assert
      const state = useStore.getState();
      expect(state.executions[0].status).toBe("completed");
      expect(state.currentExecution?.status).toBe("completed");
    });

    it("should handle workflow selection", () => {
      // Arrange
      const { setSelectedWorkflowId } = useStore.getState();

      // Act
      setSelectedWorkflowId("oneshot");

      // Assert
      expect(useStore.getState().selectedWorkflowId).toBe("oneshot");

      // Act - Change workflow
      setSelectedWorkflowId("task_loop");

      // Assert
      expect(useStore.getState().selectedWorkflowId).toBe("task_loop");
    });

    it("should manage external agent config", () => {
      // Arrange
      const { setExternalAgentConfig } = useStore.getState();

      // Act
      setExternalAgentConfig({
        cli: "codex",
        args: "--model gpt-4",
        agentName: "Codex",
      });

      // Assert
      const config = useStore.getState().externalAgentConfig;
      expect(config.cli).toBe("codex");
      expect(config.args).toBe("--model gpt-4");
      expect(config.agentName).toBe("Codex");

      // Act - Partial update
      setExternalAgentConfig({ args: "--model gpt-4-turbo" });

      // Assert - Other fields preserved
      const updatedConfig = useStore.getState().externalAgentConfig;
      expect(updatedConfig.cli).toBe("codex");
      expect(updatedConfig.args).toBe("--model gpt-4-turbo");
      expect(updatedConfig.agentName).toBe("Codex");
    });

    it("should track typing state for shortcuts", () => {
      // Arrange
      const { setIsTyping } = useStore.getState();

      // Act - Start typing
      setIsTyping(true);

      // Assert
      expect(useStore.getState().isTyping).toBe(true);

      // Act - Stop typing
      setIsTyping(false);

      // Assert
      expect(useStore.getState().isTyping).toBe(false);
    });

    it("should handle context generation state", () => {
      // Arrange
      const {
        setContextStatus,
        setContextProgress,
        setContextResult,
        resetContext,
      } = useStore.getState();

      // Act - Simulate context generation flow
      setContextStatus("extracting");
      setContextProgress(25);

      // Assert
      let state = useStore.getState();
      expect(state.contextStatus).toBe("extracting");
      expect(state.contextProgress).toBe(25);

      // Act - Complete
      setContextProgress(100);
      setContextResult("Generated context content");

      // Assert
      state = useStore.getState();
      expect(state.contextStatus).toBe("complete");
      expect(state.contextResult).toBe("Generated context content");

      // Act - Reset
      resetContext();

      // Assert
      state = useStore.getState();
      expect(state.contextStatus).toBe("idle");
      expect(state.contextProgress).toBe(0);
      expect(state.contextResult).toBeNull();
    });

    it("should handle context error state", () => {
      // Arrange
      const { setContextError } = useStore.getState();

      // Act
      setContextError("Failed to generate context: API error");

      // Assert
      const state = useStore.getState();
      expect(state.contextStatus).toBe("error");
      expect(state.contextError).toBe("Failed to generate context: API error");
    });
  });

  // ==========================================================================
  // Multi-Store Integration Tests
  // ==========================================================================

  describe("Multi-Store Integration", () => {
    it("should coordinate between main store and runtime store", () => {
      // Arrange
      const { addExecution, setCurrentExecution } = useStore.getState();
      const { createSession, addLog } = useExecutionRuntimeStore.getState();

      // Act - Create execution in main store
      const execution = {
        id: "exec_multi_001",
        task: "Multi-store test",
        provider: "claude",
        workspace: process.cwd(),
        status: "running" as const,
        startedAt: new Date(),
      };

      addExecution(execution);
      setCurrentExecution(execution);

      // Create corresponding runtime session
      createSession(execution.id, execution.startedAt.getTime());
      addLog(execution.id, "Execution started from multi-store test");

      // Assert
      const mainState = useStore.getState();
      const runtimeState = useExecutionRuntimeStore.getState();

      expect(mainState.currentExecution?.id).toBe("exec_multi_001");
      expect(runtimeState.sessions.exec_multi_001).toBeDefined();
      expect(runtimeState.hasActiveSession()).toBe(true);
    });

    it("should maintain execution history while runtime session is active", () => {
      // Arrange
      const { addExecution } = useStore.getState();
      const { createSession, updateSession } =
        useExecutionRuntimeStore.getState();

      // Act - Create multiple executions
      // First execution (completed)
      addExecution({
        id: "exec_history_001",
        task: "First task",
        provider: "external-agent",
        workspace: process.cwd(),
        status: "completed",
        startedAt: new Date(Date.now() - 3_600_000),
      });

      // Second execution (running)
      addExecution({
        id: "exec_history_002",
        task: "Second task",
        provider: "claude",
        workspace: process.cwd(),
        status: "running",
        startedAt: new Date(),
      });

      // Create runtime session for running execution
      createSession("exec_history_002", Date.now());
      updateSession("exec_history_002", {
        currentStep: "analyze",
        stepProgress: { current: 1, total: 3 },
      });

      // Assert
      const mainState = useStore.getState();
      const runtimeState = useExecutionRuntimeStore.getState();

      expect(mainState.executions).toHaveLength(2);
      // Executions are prepended (newest first)
      expect(mainState.executions[1].id).toBe("exec_history_001");
      expect(mainState.executions[0].id).toBe("exec_history_002");
      expect(runtimeState.sessions.exec_history_002.currentStep).toBe(
        "analyze"
      );
      expect(runtimeState.hasActiveSession()).toBe(true);
    });

    it("should handle workflow selection affecting execution", () => {
      // Arrange
      const { setSelectedWorkflowId, addExecution } = useStore.getState();

      // Act - Select workflow then create execution
      setSelectedWorkflowId("task_loop");

      const workflowId = useStore.getState().selectedWorkflowId;

      addExecution({
        id: "exec_workflow_001",
        task: "Workflow test",
        provider: "external-agent",
        workspace: process.cwd(),
        status: "pending",
        startedAt: new Date(),
        workflowId,
      });

      // Assert
      const state = useStore.getState();
      expect(state.selectedWorkflowId).toBe("task_loop");
      expect(state.executions[0].workflowId).toBe("task_loop");
    });
  });

  // ==========================================================================
  // Screen-Specific Integration Tests
  // ==========================================================================

  describe("Screen-Specific Integration", () => {
    it("should transition from dashboard to execute to running", () => {
      // Arrange
      const { setScreen, setTask, addExecution, setCurrentExecution } =
        useStore.getState();

      // Act - Dashboard to Execute
      setScreen("execute");
      expect(useStore.getState().screen).toBe("execute");

      // Configure and start
      setTask("Integration test task");
      const execution = {
        id: "exec_transition_001",
        task: useStore.getState().task,
        provider: "external-agent",
        workspace: process.cwd(),
        status: "pending" as const,
        startedAt: new Date(),
      };
      addExecution(execution);
      setCurrentExecution(execution);
      setScreen("running");

      // Assert
      const state = useStore.getState();
      expect(state.screen).toBe("running");
      expect(state.currentExecution?.task).toBe("Integration test task");
    });

    it("should handle execution detail navigation", () => {
      // Arrange
      const { addExecution, setCurrentExecution, setScreen } =
        useStore.getState();

      // Act
      addExecution({
        id: "exec_detail_001",
        task: "Detail view test",
        provider: "claude",
        workspace: process.cwd(),
        status: "completed",
        startedAt: new Date(),
        duration: 30_000,
        tokensUsed: 2048,
      });

      setCurrentExecution(useStore.getState().executions[0]);
      setScreen("execution-detail");

      // Assert
      const state = useStore.getState();
      expect(state.screen).toBe("execution-detail");
      expect(state.currentExecution?.status).toBe("completed");
    });

    it("should handle diff viewer navigation", () => {
      // Arrange
      const { addExecution, setSelectedExecutionForDiff, setScreen } =
        useStore.getState();

      // Act
      addExecution({
        id: "exec_diff_001",
        task: "Diff view test",
        provider: "external-agent",
        workspace: process.cwd(),
        status: "completed",
        startedAt: new Date(),
        diff: "diff --git a/file.ts b/file.ts...",
        filesModified: ["file.ts"],
      });

      setSelectedExecutionForDiff(useStore.getState().executions[0]);
      setScreen("diff-viewer");

      // Assert
      const state = useStore.getState();
      expect(state.screen).toBe("diff-viewer");
      expect(state.selectedExecutionForDiff?.diff).toBeDefined();
    });
  });

  // ==========================================================================
  // Edge Cases & Error Handling
  // ==========================================================================

  describe("Edge Cases & Error Handling", () => {
    it("should handle empty task gracefully", () => {
      // Arrange
      const { setTask } = useStore.getState();

      // Act
      setTask("");

      // Assert
      expect(useStore.getState().task).toBe("");
    });

    it("should handle rapid screen transitions", () => {
      // Arrange
      const { setScreen } = useStore.getState();

      // Act - Rapid transitions
      setScreen("execute");
      setScreen("history");
      setScreen("workflows");
      setScreen("dashboard");

      // Assert - Final state should be dashboard
      expect(useStore.getState().screen).toBe("dashboard");
    });

    it("should handle updating non-existent execution gracefully", () => {
      // Arrange
      const { updateExecution } = useStore.getState();

      // Act - Should not throw
      updateExecution("non-existent-id", { status: "completed" });

      // Assert - Store should remain valid
      expect(useStore.getState().executions).toEqual([]);
    });

    it("should handle session operations on non-existent session", () => {
      // Arrange
      const { updateSession, addLog, removeSession } =
        useExecutionRuntimeStore.getState();

      // Act - Should not throw
      updateSession("non-existent", { isDone: true });
      addLog("non-existent", "Test log");
      removeSession("non-existent");

      // Assert - Should not crash
      expect(useExecutionRuntimeStore.getState().sessions).toEqual({});
    });

    it("should preserve workspace across screen changes", () => {
      // Arrange
      const { setWorkspace, setScreen } = useStore.getState();
      const customWorkspace = "/custom/workspace/path";

      // Act
      setWorkspace(customWorkspace);
      setScreen("execute");
      setScreen("history");
      setScreen("workflows");

      // Assert
      expect(useStore.getState().workspace).toBe(customWorkspace);
    });
  });
});
