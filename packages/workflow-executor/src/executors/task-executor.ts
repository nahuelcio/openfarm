/**
 * Task Executor
 *
 * Executes task-related actions for task-loop workflows:
 * - task.select: Select next task from queue
 * - task.load: Load tasks from database
 * - task.filter: Filter tasks by criteria
 * - task.update_status: Update task status
 */

import { StepAction } from "@openfarm/core/constants/actions";
import { getDb, getLocalWorkItems } from "@openfarm/core/db";
import type { WorkItem } from "@openfarm/core/types";
import { err, ok, type Result } from "@openfarm/result";
import type { StepExecutionRequest } from "../types";

/**
 * Priority scores for task selection
 */
const PRIORITY_SCORES: Record<string, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

/**
 * Task with loop metadata
 */
interface TaskLoopTask extends WorkItem {
  loopStatus: "pending" | "running" | "completed" | "failed";
  loopOrder: number;
  retryCount: number;
}

/**
 * Executes task.load action - loads tasks from database
 */
async function executeTaskLoad(
  request: StepExecutionRequest
): Promise<Result<TaskLoopTask[]>> {
  const { logger } = request;

  await logger("Loading tasks from database...");

  const db = await getDb();
  const workItems = await getLocalWorkItems(db);

  // Convert to task loop tasks
  const tasks: TaskLoopTask[] = workItems.map((wi, i) => ({
    ...wi,
    loopStatus: "pending" as const,
    loopOrder: i,
    retryCount: 0,
  }));

  await logger(`Loaded ${tasks.length} tasks`);
  return ok(tasks);
}

/**
 * Executes task.filter action - filters tasks by criteria
 */
async function executeTaskFilter(
  request: StepExecutionRequest
): Promise<Result<TaskLoopTask[]>> {
  const { step, context, logger } = request;
  const config = step.config || {};

  const tasks = (context.workflowVariables?.tasks || []) as TaskLoopTask[];
  const project = config.project as string | undefined;
  const minPriority = config.minPriority as string | undefined;
  const tags = config.tags as string[] | undefined;
  const status = config.status as string[] | undefined;

  await logger(`Filtering ${tasks.length} tasks...`);

  const filtered = tasks.filter((task) => {
    // Filter by project
    if (project && task.project !== project) {
      return false;
    }

    // Filter by minimum priority
    if (minPriority) {
      const taskScore = PRIORITY_SCORES[task.priority || "medium"] || 0;
      const minScore = PRIORITY_SCORES[minPriority] || 0;
      if (taskScore < minScore) {
        return false;
      }
    }

    // Filter by tags
    if (tags && tags.length > 0) {
      const taskTags = task.tags || [];
      const hasAllTags = tags.every((tag) => taskTags.includes(tag));
      if (!hasAllTags) {
        return false;
      }
    }

    // Filter by status
    if (status && status.length > 0) {
      if (!status.includes(task.status)) {
        return false;
      }
    }

    return true;
  });

  await logger(`Filtered to ${filtered.length} tasks`);
  return ok(filtered);
}

/**
 * Executes task.select action - selects next task from queue
 */
async function executeTaskSelect(
  request: StepExecutionRequest
): Promise<Result<TaskLoopTask | null>> {
  const { step, context, logger } = request;
  const config = step.config || {};

  const tasks = (context.workflowVariables?.tasks || []) as TaskLoopTask[];
  const strategy = (config.strategy as string) || "priority";

  await logger(`Selecting next task using strategy: ${strategy}`);

  // Filter to only pending tasks
  const pending = tasks.filter((t) => t.loopStatus === "pending");

  if (pending.length === 0) {
    await logger("No pending tasks available");
    return ok(null);
  }

  let selected: TaskLoopTask;

  switch (strategy) {
    case "priority":
      // Sort by priority (critical > high > medium > low), then by order
      pending.sort((a, b) => {
        const priorityDiff =
          (PRIORITY_SCORES[b.priority || "medium"] || 0) -
          (PRIORITY_SCORES[a.priority || "medium"] || 0);
        if (priorityDiff !== 0) {
          return priorityDiff;
        }
        return a.loopOrder - b.loopOrder;
      });
      selected = pending[0];
      break;

    case "fifo":
      // First in, first out
      pending.sort((a, b) => a.loopOrder - b.loopOrder);
      selected = pending[0];
      break;

    case "lifo":
      // Last in, first out
      pending.sort((a, b) => b.loopOrder - a.loopOrder);
      selected = pending[0];
      break;

    case "random":
      // Random selection
      selected = pending[Math.floor(Math.random() * pending.length)];
      break;

    default:
      return err(new Error(`Unknown selection strategy: ${strategy}`));
  }

  await logger(`Selected task: ${selected.title} (${selected.id})`);
  return ok(selected);
}

/**
 * Executes task.update_status action - updates task status
 */
async function executeTaskUpdateStatus(
  request: StepExecutionRequest
): Promise<Result<string>> {
  const { step, context, logger } = request;
  const config = step.config || {};

  const taskId = config.taskId as string;
  const status = config.status as TaskLoopTask["loopStatus"];

  if (!(taskId && status)) {
    return err(new Error("taskId and status are required"));
  }

  const tasks = (context.workflowVariables?.tasks || []) as TaskLoopTask[];
  const task = tasks.find((t) => t.id === taskId);

  if (!task) {
    return err(new Error(`Task not found: ${taskId}`));
  }

  task.loopStatus = status;
  await logger(`Updated task ${taskId} status to: ${status}`);

  return ok(`Task status updated: ${status}`);
}

/**
 * Routes task actions to the appropriate executor
 */
export async function executeTaskAction(
  request: StepExecutionRequest
): Promise<Result<unknown>> {
  const { step } = request;
  const action = step.action;

  if (action === StepAction.TASK_LOAD) {
    return executeTaskLoad(request);
  }
  if (action === StepAction.TASK_FILTER) {
    return executeTaskFilter(request);
  }
  if (action === StepAction.TASK_SELECT) {
    return executeTaskSelect(request);
  }
  if (action === StepAction.TASK_UPDATE_STATUS) {
    return executeTaskUpdateStatus(request);
  }

  return err(new Error(`Unknown task action: ${action}`));
}
