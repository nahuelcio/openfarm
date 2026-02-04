/**
 * Completion Detector
 *
 * Detects whether a task has been completed successfully.
 * Supports multiple strategies: heuristic, git-changes, llm-judge, manual.
 */

import type {
  CompletionDetectorConfig,
  CompletionDetectionStrategy,
  TaskExecutionResult,
  TaskLoopTask,
} from "./types";

/**
 * Default completion markers
 */
const DEFAULT_COMPLETION_MARKERS = [
  "task completed",
  "done",
  "finished",
  "completed successfully",
  "changes applied",
  "implemented",
  "✓",
  "✅",
  "success",
  "all requirements met",
];

/**
 * Default failure markers
 */
const DEFAULT_FAILURE_MARKERS = [
  "failed",
  "error",
  "unable to",
  "cannot",
  "unable to complete",
  "task failed",
  "❌",
  "✗",
  "not possible",
  "insufficient information",
];

/**
 * Result of completion detection
 */
export interface CompletionDetectionResult {
  completed: boolean;
  confidence: number; // 0-1
  reason: string;
  shouldRetry: boolean;
}

/**
 * Detects task completion based on configured strategy
 */
export class CompletionDetector {
  private config: CompletionDetectorConfig;

  constructor(config?: CompletionDetectorConfig) {
    this.config = {
      strategy: "heuristic",
      completionMarkers: DEFAULT_COMPLETION_MARKERS,
      failureMarkers: DEFAULT_FAILURE_MARKERS,
      timeoutMs: 300000, // 5 minutes default
      minChanges: 1,
      ...config,
    };
  }

  /**
   * Detect if a task has been completed
   */
  async detect(
    result: TaskExecutionResult,
    task: TaskLoopTask
  ): Promise<CompletionDetectionResult> {
    switch (this.config.strategy) {
      case "heuristic":
        return this.detectHeuristic(result, task);
      case "git-changes":
        return this.detectGitChanges(result);
      case "llm-judge":
        return this.detectLlmJudge(result, task);
      case "manual":
        return this.detectManual();
      default:
        return this.detectHeuristic(result, task);
    }
  }

  /**
   * Heuristic detection based on output markers
   */
  private detectHeuristic(
    result: TaskExecutionResult,
    _task: TaskLoopTask
  ): CompletionDetectionResult {
    const output = (result.output || "").toLowerCase();
    const error = (result.error || "").toLowerCase();

    // Check for failure markers first
    for (const marker of this.config.failureMarkers || []) {
      if (output.includes(marker.toLowerCase()) || error.includes(marker.toLowerCase())) {
        return {
          completed: false,
          confidence: 0.8,
          reason: `Failure marker detected: "${marker}"`,
          shouldRetry: !this.isFatalError(output + error),
        };
      }
    }

    // Check for success markers
    for (const marker of this.config.completionMarkers || []) {
      if (output.includes(marker.toLowerCase())) {
        return {
          completed: true,
          confidence: 0.7,
          reason: `Completion marker detected: "${marker}"`,
          shouldRetry: false,
        };
      }
    }

    // If no explicit markers, check for success result
    if (result.success) {
      // Check if there are file changes
      const hasChanges =
        (result.changes?.filesModified?.length || 0) > 0 ||
        (result.changes?.filesCreated?.length || 0) > 0 ||
        (result.changes?.filesDeleted?.length || 0) > 0;

      if (hasChanges) {
        return {
          completed: true,
          confidence: 0.6,
          reason: "Task succeeded with file changes",
          shouldRetry: false,
        };
      }

      // Success but no changes - might be a read-only task or no-op
      return {
        completed: true,
        confidence: 0.4,
        reason: "Task succeeded but no file changes detected",
        shouldRetry: false,
      };
    }

    // Failed with no clear markers
    return {
      completed: false,
      confidence: 0.5,
      reason: result.error || "Task failed without specific error",
      shouldRetry: true,
    };
  }

  /**
   * Detection based on git changes
   */
  private detectGitChanges(result: TaskExecutionResult): CompletionDetectionResult {
    const modified = result.changes?.filesModified?.length || 0;
    const created = result.changes?.filesCreated?.length || 0;
    const deleted = result.changes?.filesDeleted?.length || 0;
    const total = modified + created + deleted;

    const minChanges = this.config.minChanges || 1;

    if (total >= minChanges) {
      return {
        completed: true,
        confidence: 0.8,
        reason: `Detected ${total} file changes (${modified} modified, ${created} created, ${deleted} deleted)`,
        shouldRetry: false,
      };
    }

    if (result.success) {
      return {
        completed: true,
        confidence: 0.3,
        reason: "Task succeeded but no file changes detected",
        shouldRetry: false,
      };
    }

    return {
      completed: false,
      confidence: 0.5,
      reason: `Only ${total} file changes detected (minimum: ${minChanges})`,
      shouldRetry: true,
    };
  }

  /**
   * LLM-based completion judgment (placeholder for future implementation)
   */
  private async detectLlmJudge(
    result: TaskExecutionResult,
    task: TaskLoopTask
  ): Promise<CompletionDetectionResult> {
    // This would use an LLM to evaluate if the task is complete
    // by comparing the output/diff against acceptance criteria
    // For now, fall back to heuristic
    return this.detectHeuristic(result, task);
  }

  /**
   * Manual confirmation (always returns pending)
   */
  private detectManual(): CompletionDetectionResult {
    return {
      completed: false,
      confidence: 0,
      reason: "Waiting for manual confirmation",
      shouldRetry: false,
    };
  }

  /**
   * Check if an error is fatal (should not retry)
   */
  private isFatalError(error: string): boolean {
    const fatalMarkers = [
      "permission denied",
      "not found",
      "does not exist",
      "invalid",
      "unauthorized",
      "authentication failed",
      "repository not found",
    ];

    const lowerError = error.toLowerCase();
    return fatalMarkers.some((marker) => lowerError.includes(marker));
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<CompletionDetectorConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current strategy
   */
  getStrategy(): CompletionDetectionStrategy {
    return this.config.strategy;
  }
}

/**
 * Create a default completion detector
 */
export function createDefaultCompletionDetector(): CompletionDetector {
  return new CompletionDetector({
    strategy: "heuristic",
    completionMarkers: DEFAULT_COMPLETION_MARKERS,
    failureMarkers: DEFAULT_FAILURE_MARKERS,
  });
}

/**
 * Create a completion detector for git-changes strategy
 */
export function createGitChangesDetector(minChanges = 1): CompletionDetector {
  return new CompletionDetector({
    strategy: "git-changes",
    minChanges,
  });
}
