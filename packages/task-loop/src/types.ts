/**
 * Task Loop Types
 *
 * Core types for the autonomous task execution loop.
 * Inspired by Ralph TUI's approach to task orchestration.
 */

import type { WorkItem } from "@openfarm/core";
import type { Workflow } from "@openfarm/core/types";

/**
 * Status of a task in the loop
 */
export type TaskLoopTaskStatus =
  | "pending" // Waiting to be processed
  | "selected" // Selected for execution
  | "running" // Currently being executed
  | "completed" // Successfully completed
  | "failed" // Failed after retries
  | "skipped"; // Skipped (dependencies not met, etc.)

/**
 * Status of the task loop session
 */
export type TaskLoopSessionStatus =
  | "idle" // Not started
  | "running" // Actively processing tasks
  | "paused" // Paused by user
  | "completed" // All tasks processed
  | "failed" // Stopped due to error
  | "resuming"; // Resuming from previous session

/**
 * Configuration for the task loop
 */
export interface TaskLoopConfig {
  /** Maximum number of iterations (tasks to process) */
  maxIterations?: number;
  /** Delay between tasks in ms */
  delayBetweenTasks?: number;
  /** Whether to stop on first failure */
  stopOnFailure?: boolean;
  /** Number of retries for failed tasks */
  maxRetries?: number;
  /** Filter tasks by project */
  projectFilter?: string;
  /** Filter tasks by priority */
  minPriority?: "low" | "medium" | "high" | "critical";
  /** Filter tasks by tags */
  tags?: string[];
  /** Workflow to use for each task */
  workflowId?: string;
  /** Provider to use (opencode, claude, etc.) */
  provider?: string;
  /** Model to use */
  model?: string;
  /** Whether to run in dry-run mode */
  dryRun?: boolean;
  /** Auto-commit changes */
  autoCommit?: boolean;
  /** Create PR on completion */
  createPR?: boolean;
}

/**
 * A task in the loop (extends WorkItem with loop-specific state)
 */
export interface TaskLoopTask extends WorkItem {
  loopStatus: TaskLoopTaskStatus;
  loopOrder: number;
  retryCount: number;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  result?: string;
}

/**
 * Session persistence state
 */
export interface TaskLoopSession {
  id: string;
  status: TaskLoopSessionStatus;
  config: TaskLoopConfig;
  tasks: TaskLoopTask[];
  currentTaskIndex: number;
  completedTasks: number;
  failedTasks: number;
  skippedTasks: number;
  startedAt: string;
  updatedAt: string;
  completedAt?: string;
  logs: string[];
  metadata?: Record<string, unknown>;
}

/**
 * Result of a single task execution
 */
export interface TaskExecutionResult {
  success: boolean;
  taskId: string;
  output?: string;
  error?: string;
  durationMs: number;
  changes?: {
    filesModified?: string[];
    filesCreated?: string[];
    filesDeleted?: string[];
    diff?: string;
  };
}

/**
 * Prompt building configuration
 */
export interface PromptBuilderConfig {
  /** Template for the prompt */
  template?: string;
  /** Include acceptance criteria */
  includeAcceptanceCriteria?: boolean;
  /** Include pre-instructions */
  includePreInstructions?: boolean;
  /** Include context from previous tasks */
  includeContext?: boolean;
  /** Custom context to include */
  customContext?: string;
}

/**
 * Completion detection strategy
 */
export type CompletionDetectionStrategy =
  | "heuristic" // Look for completion markers in output
  | "llm-judge" // Use LLM to evaluate completion
  | "git-changes" // Check if git changes were made
  | "manual"; // Wait for manual confirmation

/**
 * Configuration for completion detection
 */
export interface CompletionDetectorConfig {
  strategy: CompletionDetectionStrategy;
  /** Markers that indicate completion (for heuristic strategy) */
  completionMarkers?: string[];
  /** Markers that indicate failure */
  failureMarkers?: string[];
  /** Timeout in ms */
  timeoutMs?: number;
  /** Minimum changes to consider complete (for git-changes) */
  minChanges?: number;
}

/**
 * Task selection strategy
 */
export type TaskSelectionStrategy =
  | "priority" // By priority (critical > high > medium > low)
  | "fifo" // First in, first out
  | "lifo" // Last in, first out
  | "random"; // Random selection

/**
 * Configuration for task selection
 */
export interface TaskSelectorConfig {
  strategy: TaskSelectionStrategy;
  /** Respect task dependencies */
  respectDependencies?: boolean;
  /** Max tasks to select */
  limit?: number;
}

/**
 * Events emitted by the task loop
 */
export interface TaskLoopEvent {
  type:
    | "session.started"
    | "session.paused"
    | "session.resumed"
    | "session.completed"
    | "session.failed"
    | "task.selected"
    | "task.started"
    | "task.completed"
    | "task.failed"
    | "task.skipped"
    | "task.retry"
    | "log";
  timestamp: string;
  sessionId: string;
  taskId?: string;
  data?: unknown;
}

/**
 * Event handler for task loop events
 */
export type TaskLoopEventHandler = (
  event: TaskLoopEvent
) => void | Promise<void>;

/**
 * Logger interface for task loop
 */
export interface TaskLoopLogger {
  debug(message: string): void | Promise<void>;
  info(message: string): void | Promise<void>;
  warn(message: string): void | Promise<void>;
  error(message: string): void | Promise<void>;
}

/**
 * Task executor function
 */
export type TaskExecutor = (
  task: TaskLoopTask,
  prompt: string,
  config: TaskLoopConfig,
  options: {
    logger?: TaskLoopLogger;
    signal?: AbortSignal;
    onStepChange?: (step: string, current: number, total: number) => void;
  }
) => Promise<TaskExecutionResult>;

/**
 * Options for running the task loop
 */
export interface TaskLoopRunOptions {
  /** Resume from existing session */
  resumeSessionId?: string;
  /** Start from specific task */
  startFromTaskId?: string;
  /** Event handler */
  onEvent?: TaskLoopEventHandler;
  /** Logger */
  logger?: TaskLoopLogger;
  /** Abort signal for cancellation */
  signal?: AbortSignal;
  /** Task executor (if not provided, uses default workflow-based execution) */
  taskExecutor?: TaskExecutor;
}

/**
 * Database row for task loop session
 */
export interface TaskLoopSessionRow {
  id: string;
  status: string;
  config: string;
  tasks: string;
  current_task_index: number;
  completed_tasks: number;
  failed_tasks: number;
  skipped_tasks: number;
  started_at: string;
  updated_at: string;
  completed_at: string | null;
  logs: string;
  metadata: string | null;
}
