/**
 * Task Loop Orchestrator
 *
 * The main orchestrator for the autonomous task execution loop.
 * Inspired by Ralph TUI's approach:
 * 1. SELECT task → 2. BUILD prompt → 3. EXECUTE → 4. DETECT → 5. REPEAT
 */

import { getDb, getLocalWorkItems } from "@openfarm/core/db";
import { CompletionDetector } from "./completion-detector";
import { PromptBuilder } from "./prompt-builder";
import { SessionManager } from "./session-manager";
import { filterTasks, TaskSelector, toTaskLoopTask } from "./task-selector";
import type {
  TaskExecutionResult,
  TaskLoopConfig,
  TaskLoopEvent,
  TaskLoopLogger,
  TaskLoopRunOptions,
  TaskLoopSession,
  TaskLoopTask,
} from "./types";
import { cleanupGitSetup, executeGitSetup } from "./workflow-adapter";

/**
 * Default logger that outputs to console
 */
const defaultLogger: TaskLoopLogger = {
  debug: (msg) => console.debug(`[TaskLoop] ${msg}`),
  info: (msg) => console.info(`[TaskLoop] ${msg}`),
  warn: (msg) => console.warn(`[TaskLoop] ${msg}`),
  error: (msg) => console.error(`[TaskLoop] ${msg}`),
};

/**
 * Task Loop Orchestrator
 */
export class TaskLoopOrchestrator {
  private sessionManager: SessionManager | null = null;
  private selector: TaskSelector;
  private promptBuilder: PromptBuilder;
  private completionDetector: CompletionDetector;
  private logger: TaskLoopLogger;
  private abortController: AbortController | null = null;
  private isRunning = false;
  private stopRequested = false;
  private stopReason: string | null = null;

  constructor(private config: TaskLoopConfig) {
    this.logger = defaultLogger;
    this.selector = new TaskSelector({
      strategy: "priority",
      respectDependencies: true,
    });
    this.promptBuilder = new PromptBuilder();
    this.completionDetector = new CompletionDetector();
  }

  /**
   * Run the task loop
   */
  async run(options: TaskLoopRunOptions = {}): Promise<TaskLoopSession> {
    if (this.isRunning) {
      throw new Error("Task loop is already running");
    }

    this.isRunning = true;
    this.abortController = new AbortController();
    this.stopRequested = false;
    this.stopReason = null;

    // Combine external signal with internal controller
    let abortHandler: (() => void) | null = null;
    if (options.signal) {
      abortHandler = () => {
        this.abortController?.abort();
      };
      options.signal.addEventListener("abort", abortHandler);
      if (options.signal.aborted) {
        this.abortController.abort();
      }
    }

    // Setup logger
    this.logger = options.logger || defaultLogger;

    // Initialize database connection
    const db = await getDb();
    this.sessionManager = new SessionManager(db);

    // Create or resume session
    let session: TaskLoopSession;
    if (options.resumeSessionId) {
      const existing = await this.sessionManager.load(options.resumeSessionId);
      if (!existing) {
        throw new Error(`Session not found: ${options.resumeSessionId}`);
      }
      session = existing;
      session.status = "resuming";
      await this.sessionManager.save();
      await this.log("session", `Resumed session ${session.id}`);
    } else {
      session = await this.sessionManager.create(this.config);
      await this.log("session", `Created new session ${session.id}`);
    }

    // Emit session started event
    await this.emitEvent(options, {
      type: "session.started",
      timestamp: new Date().toISOString(),
      sessionId: session.id,
    });

    try {
      // Load tasks if not resuming or if tasks are empty
      if (session.tasks.length === 0) {
        await this.loadTasks(session);
      }

      // Update status to running
      session.status = "running";
      await this.sessionManager.save();

      // Main loop
      await this.processLoop(session, options);

      if (this.stopRequested) {
        session.status = "failed";
        session.completedAt = new Date().toISOString();
        await this.sessionManager.save();

        const reason =
          this.stopReason || "Stopped due to stopOnFailure configuration";
        await this.log("error", `Session stopped: ${reason}`);

        await this.emitEvent(options, {
          type: "session.failed",
          timestamp: new Date().toISOString(),
          sessionId: session.id,
          data: { error: reason },
        });
      } else {
        // Complete session
        session.status = "completed";
        session.completedAt = new Date().toISOString();
        await this.sessionManager.save();

        await this.log(
          "session",
          `Session completed: ${session.completedTasks} completed, ${session.failedTasks} failed, ${session.skippedTasks} skipped`
        );

        await this.emitEvent(options, {
          type: "session.completed",
          timestamp: new Date().toISOString(),
          sessionId: session.id,
          data: {
            completed: session.completedTasks,
            failed: session.failedTasks,
            skipped: session.skippedTasks,
          },
        });
      }
    } catch (error) {
      // Handle cancellation
      if (this.abortController?.signal.aborted && !this.stopRequested) {
        session.status = "paused";
        await this.sessionManager.save();
        await this.log("session", "Session paused by user");

        await this.emitEvent(options, {
          type: "session.paused",
          timestamp: new Date().toISOString(),
          sessionId: session.id,
        });
      } else {
        // Handle error
        session.status = "failed";
        await this.sessionManager.save();
        const message = error instanceof Error ? error.message : String(error);
        await this.log("error", `Session failed: ${message}`);

        await this.emitEvent(options, {
          type: "session.failed",
          timestamp: new Date().toISOString(),
          sessionId: session.id,
          data: { error: message },
        });
      }
    } finally {
      this.isRunning = false;
      this.abortController = null;
      if (options.signal && abortHandler) {
        options.signal.removeEventListener("abort", abortHandler);
      }
    }

    return session;
  }

  /**
   * Pause the task loop
   */
  pause(): void {
    if (this.isRunning && this.abortController) {
      this.abortController.abort();
      this.logger.info("Pausing task loop...");
    }
  }

  /**
   * Check if running
   */
  getIsRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Load tasks from database
   */
  private async loadTasks(session: TaskLoopSession): Promise<void> {
    if (!this.sessionManager) {
      throw new Error("Session manager not initialized");
    }
    await this.log("info", "Loading tasks from database...");

    const db = await getDb();
    const workItems = await getLocalWorkItems(db);

    // Convert to task loop tasks
    let tasks = workItems.map((wi, i) => toTaskLoopTask(wi, i));

    // Apply filters
    tasks = filterTasks(tasks, {
      project: this.config.projectFilter,
      minPriority: this.config.minPriority,
      tagsFilter: this.config.tags,
    });

    // Only include pending/new tasks
    tasks = tasks.filter(
      (t) =>
        t.status === "new" || t.status === "assigned" || t.status === "fixing"
    );

    session.tasks = tasks;
    await this.sessionManager.save();

    await this.log("info", `Loaded ${tasks.length} tasks`);
  }

  /**
   * Main processing loop
   */
  private async processLoop(
    session: TaskLoopSession,
    options: TaskLoopRunOptions
  ): Promise<void> {
    const maxIterations = this.config.maxIterations || Number.POSITIVE_INFINITY;
    let iteration = 0;

    while (iteration < maxIterations) {
      if (this.stopRequested) {
        break;
      }
      // Check cancellation
      if (this.abortController?.signal.aborted) {
        throw new Error("CANCELLED");
      }

      // Get next task
      const nextTask = this.selector.getNext(session.tasks);

      if (!nextTask) {
        await this.log("info", "No more pending tasks");
        break;
      }

      // Process task
      await this.processTask(nextTask, session, options);

      iteration++;

      // Delay between tasks if configured
      if (this.config.delayBetweenTasks && this.config.delayBetweenTasks > 0) {
        await this.sleep(this.config.delayBetweenTasks);
      }
    }

    if (iteration >= maxIterations) {
      await this.log("info", `Reached maximum iterations (${maxIterations})`);
    }
  }

  /**
   * Process a single task
   */
  private async processTask(
    task: TaskLoopTask,
    session: TaskLoopSession,
    options: TaskLoopRunOptions
  ): Promise<void> {
    if (!this.sessionManager) {
      throw new Error("Session manager not initialized");
    }
    const taskIndex = session.tasks.findIndex((t) => t.id === task.id);
    if (taskIndex === -1) return;

    // Update task status
    task.loopStatus = "running";
    task.startedAt = new Date().toISOString();
    session.currentTaskIndex = taskIndex;
    await this.sessionManager.save();

    await this.log("task", `Starting task: ${task.title} (${task.id})`);

    await this.emitEvent(options, {
      type: "task.started",
      timestamp: new Date().toISOString(),
      sessionId: session.id,
      taskId: task.id,
      data: { title: task.title, priority: task.priority },
    });

    try {
      // Build prompt
      const prompt = this.promptBuilder.build(task);
      await this.log("debug", `Prompt built (${prompt.length} chars)`);

      // Execute task
      const result = await this.executeTask(task, prompt, options);

      // Detect completion
      const detection = await this.completionDetector.detect(result, task);

      if (detection.completed) {
        // Task completed successfully
        task.loopStatus = "completed";
        task.completedAt = new Date().toISOString();
        task.result = result.output;
        session.completedTasks++;

        await this.log(
          "task",
          `Task completed: ${task.title} (${detection.reason})`
        );

        await this.emitEvent(options, {
          type: "task.completed",
          timestamp: new Date().toISOString(),
          sessionId: session.id,
          taskId: task.id,
          data: { reason: detection.reason, durationMs: result.durationMs },
        });
      } else {
        // Task failed
        task.retryCount++;

        const maxRetries = Number.isFinite(this.config.maxRetries)
          ? Math.max(0, this.config.maxRetries as number)
          : 0;
        if (task.retryCount <= maxRetries && detection.shouldRetry) {
          // Retry
          task.loopStatus = "pending";
          await this.log("task", `Retrying task (attempt ${task.retryCount})`);

          await this.emitEvent(options, {
            type: "task.retry",
            timestamp: new Date().toISOString(),
            sessionId: session.id,
            taskId: task.id,
            data: { attempt: task.retryCount },
          });
        } else {
          // Mark as failed
          task.loopStatus = "failed";
          task.completedAt = new Date().toISOString();
          task.error = detection.reason;
          session.failedTasks++;

          await this.log(
            "error",
            `Task failed: ${task.title} (${detection.reason})`
          );

          await this.emitEvent(options, {
            type: "task.failed",
            timestamp: new Date().toISOString(),
            sessionId: session.id,
            taskId: task.id,
            data: { reason: detection.reason, error: result.error },
          });

          // Stop on failure if configured
          if (this.config.stopOnFailure) {
            this.stopRequested = true;
            this.stopReason = `Task ${task.id} failed and stopOnFailure is enabled`;
            this.abortController?.abort();
            return;
          }
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      if (message === "CANCELLED") {
        task.loopStatus = "pending";
        throw error;
      }

      task.loopStatus = "failed";
      task.completedAt = new Date().toISOString();
      task.error = message;
      session.failedTasks++;

      await this.log("error", `Task error: ${task.title} (${message})`);

      await this.emitEvent(options, {
        type: "task.failed",
        timestamp: new Date().toISOString(),
        sessionId: session.id,
        taskId: task.id,
        data: { error: message },
      });

      if (this.config.stopOnFailure) {
        this.stopRequested = true;
        this.stopReason =
          error instanceof Error ? error.message : "Task failed";
        this.abortController?.abort();
        return;
      }
    } finally {
      await this.sessionManager.save();
    }
  }

  /**
   * Execute a single task
   */
  private async executeTask(
    task: TaskLoopTask,
    prompt: string,
    options: TaskLoopRunOptions
  ): Promise<TaskExecutionResult> {
    // Use custom executor if provided
    if (options.taskExecutor) {
      return options.taskExecutor(task, prompt, this.config, {
        logger: this.logger,
        signal: this.abortController?.signal,
        onStepChange: (step, current, total) => {
          this.logger.info(`Step ${current}/${total}: ${step}`);
        },
      });
    }

    // Default: simple execution with git setup
    const workspace = process.cwd();
    const startTime = Date.now();

    try {
      // Git setup
      const setup = await executeGitSetup({
        workItem: task,
        config: this.config,
        workspace,
        logger: this.logger,
        signal: this.abortController?.signal,
      });

      if (!setup.success) {
        return {
          success: false,
          taskId: task.id,
          error: setup.error || "Git setup failed",
          durationMs: Date.now() - startTime,
        };
      }

      // Note: Without a task executor, we can't actually run the agent.
      // The caller should provide a taskExecutor.
      await this.logger.warn(
        "No task executor provided, skipping agent execution"
      );

      // Cleanup
      if (setup.branchName || setup.worktreePath) {
        await cleanupGitSetup(
          workspace,
          setup.branchName || "",
          setup.worktreePath || "",
          this.logger
        );
      }

      return {
        success: true,
        taskId: task.id,
        output: "Git setup completed (no agent executor provided)",
        durationMs: Date.now() - startTime,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        taskId: task.id,
        error: message,
        durationMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Emit event
   */
  private async emitEvent(
    options: TaskLoopRunOptions,
    event: TaskLoopEvent
  ): Promise<void> {
    if (options.onEvent) {
      void Promise.resolve()
        .then(() => options.onEvent?.(event))
        .catch((error) => {
          this.logger.error(`Event handler error: ${error}`);
        });
    }
  }

  /**
   * Log helper
   */
  private async log(
    level: "session" | "task" | "info" | "debug" | "error" | "warn",
    message: string
  ): Promise<void> {
    if (!this.sessionManager) {
      return;
    }
    const formatted = `[${level.toUpperCase()}] ${message}`;

    switch (level) {
      case "debug":
        await this.logger.debug(formatted);
        break;
      case "error":
        await this.logger.error(formatted);
        break;
      case "warn":
        await this.logger.warn(formatted);
        break;
      default:
        await this.logger.info(formatted);
    }

    // Also add to session logs
    await this.sessionManager.log(message);
  }

  /**
   * Get current session (if any)
   */
  getSession(): TaskLoopSession | null {
    return this.sessionManager?.getCurrentSession() ?? null;
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Create and run a task loop
 */
export async function runTaskLoop(
  config: TaskLoopConfig,
  options?: TaskLoopRunOptions
): Promise<TaskLoopSession> {
  const orchestrator = new TaskLoopOrchestrator(config);
  return orchestrator.run(options);
}

/**
 * Resume a task loop session
 */
export async function resumeTaskLoop(
  sessionId: string,
  options?: Omit<TaskLoopRunOptions, "resumeSessionId">
): Promise<TaskLoopSession> {
  // Load session to get config
  const db = await getDb();
  const { getSession } = await import("./session-manager");
  const session = await getSession(db, sessionId);

  if (!session) {
    throw new Error(`Session not found: ${sessionId}`);
  }

  const orchestrator = new TaskLoopOrchestrator(session.config);
  return orchestrator.run({ ...options, resumeSessionId: sessionId });
}
