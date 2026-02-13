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

// Completion Detector
export {
  CompletionDetector,
  createDefaultCompletionDetector,
  createGitChangesDetector,
} from "./completion-detector";

// Orchestrator
export {
  resumeTaskLoop,
  runTaskLoop,
  TaskLoopOrchestrator,
} from "./orchestrator";
// Prompt Builder
export {
  createDefaultPromptBuilder,
  createPromptBuilder,
  PROMPT_TEMPLATES,
  PromptBuilder,
} from "./prompt-builder";
// Session Manager
export {
  addSessionLog,
  createSession,
  deleteSession,
  generateSessionId,
  getActiveSessions,
  getRecentSessions,
  getSession,
  SessionManager,
  saveSession,
  updateSessionStatus,
} from "./session-manager";
// Task Selector
export {
  createDefaultTaskSelector,
  filterTasks,
  TaskSelector,
  toTaskLoopTask,
} from "./task-selector";
// Types
export type {
  CompletionDetectionStrategy,
  CompletionDetectorConfig,
  PromptBuilderConfig,
  TaskExecutionResult,
  TaskExecutor,
  TaskLoopConfig,
  TaskLoopEvent,
  TaskLoopLogger,
  TaskLoopRunOptions,
  TaskLoopSession,
  TaskLoopSessionStatus,
  TaskLoopTask,
  TaskLoopTaskStatus,
  TaskSelectionStrategy,
  TaskSelectorConfig,
} from "./types";

// Workflow Adapter
export {
  cleanupGitSetup,
  executeGitSetup,
  getAvailableWorkflows,
} from "./workflow-adapter";
