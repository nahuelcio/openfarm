/**
 * OpenFarm Task Loop
 *
 * Autonomous task execution loop inspired by Ralph TUI.
 * Provides a loop orchestrator that:
 * 1. SELECTs tasks by priority
 * 2. BUILDs prompts from task data
 * 3. EXECUTEs via workflow engine
 * 4. DETECTs completion
 * 5. REPEATs until done
 */

// Types
export type {
  TaskLoopConfig,
  TaskLoopSession,
  TaskLoopTask,
  TaskLoopTaskStatus,
  TaskLoopSessionStatus,
  TaskExecutionResult,
  TaskLoopRunOptions,
  TaskLoopEvent,
  TaskLoopLogger,
  PromptBuilderConfig,
  CompletionDetectorConfig,
  CompletionDetectionStrategy,
  TaskSelectionStrategy,
  TaskSelectorConfig,
  TaskExecutor,
} from "./types";

// Orchestrator
export {
  TaskLoopOrchestrator,
  runTaskLoop,
  resumeTaskLoop,
} from "./orchestrator";

// Task Selector
export {
  TaskSelector,
  toTaskLoopTask,
  filterTasks,
  createDefaultTaskSelector,
} from "./task-selector";

// Prompt Builder
export {
  PromptBuilder,
  PROMPT_TEMPLATES,
  createDefaultPromptBuilder,
  createPromptBuilder,
} from "./prompt-builder";

// Completion Detector
export {
  CompletionDetector,
  createDefaultCompletionDetector,
  createGitChangesDetector,
} from "./completion-detector";

// Session Manager
export {
  SessionManager,
  createSession,
  saveSession,
  getSession,
  getActiveSessions,
  getRecentSessions,
  deleteSession,
  addSessionLog,
  updateSessionStatus,
  generateSessionId,
} from "./session-manager";

// Workflow Adapter
export {
  executeGitSetup,
  cleanupGitSetup,
  getAvailableWorkflows,
} from "./workflow-adapter";
