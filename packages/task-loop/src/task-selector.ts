/**
 * Task Selector
 *
 * Selects tasks from the work item pool based on configured strategy.
 * Supports priority-based, FIFO, LIFO, and random selection.
 */

import type { WorkItem } from "@openfarm/core";
import type {
  TaskLoopTask,
  TaskLoopTaskStatus,
  TaskSelectorConfig,
} from "./types";

/**
 * Priority scores for sorting (higher = more important)
 */
const PRIORITY_SCORES: Record<string, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

/**
 * Converts a WorkItem to a TaskLoopTask with initial state
 */
export function toTaskLoopTask(
  workItem: WorkItem,
  order: number
): TaskLoopTask {
  return {
    ...workItem,
    loopStatus: "pending" as TaskLoopTaskStatus,
    loopOrder: order,
    retryCount: 0,
  };
}

/**
 * Selects tasks based on the configured strategy
 */
export class TaskSelector {
  constructor(private readonly config: TaskSelectorConfig) {}

  /**
   * Select and order tasks from the available work items
   */
  select(tasks: TaskLoopTask[]): TaskLoopTask[] {
    // Filter to only pending tasks
    let pending = tasks.filter((t) => t.loopStatus === "pending");

    // Sort based on strategy
    switch (this.config.strategy) {
      case "priority":
        pending = this.sortByPriority(pending);
        break;
      case "fifo":
        pending = this.sortByFifo(pending);
        break;
      case "lifo":
        pending = this.sortByLifo(pending);
        break;
      case "random":
        pending = this.shuffle(pending);
        break;
      default:
        pending = this.sortByPriority(pending);
    }

    // Apply limit if specified
    if (this.config.limit && this.config.limit > 0) {
      pending = pending.slice(0, this.config.limit);
    }

    return pending;
  }

  /**
   * Get the next task to process
   */
  getNext(tasks: TaskLoopTask[]): TaskLoopTask | undefined {
    const selected = this.select(tasks);
    return selected[0];
  }

  /**
   * Sort tasks by priority (critical > high > medium > low)
   * Within same priority, sort by creation time (older first)
   */
  private sortByPriority(tasks: TaskLoopTask[]): TaskLoopTask[] {
    return [...tasks].sort((a, b) => {
      const priorityDiff =
        (PRIORITY_SCORES[b.priority || "medium"] || 0) -
        (PRIORITY_SCORES[a.priority || "medium"] || 0);

      if (priorityDiff !== 0) {
        return priorityDiff;
      }

      // Same priority: sort by order (which correlates to creation)
      return a.loopOrder - b.loopOrder;
    });
  }

  /**
   * Sort by FIFO (first in, first out)
   */
  private sortByFifo(tasks: TaskLoopTask[]): TaskLoopTask[] {
    return [...tasks].sort((a, b) => a.loopOrder - b.loopOrder);
  }

  /**
   * Sort by LIFO (last in, first out)
   */
  private sortByLifo(tasks: TaskLoopTask[]): TaskLoopTask[] {
    return [...tasks].sort((a, b) => b.loopOrder - a.loopOrder);
  }

  /**
   * Shuffle array randomly
   */
  private shuffle(tasks: TaskLoopTask[]): TaskLoopTask[] {
    const result = [...tasks];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
}

/**
 * Filter tasks based on config criteria
 */
export function filterTasks(
  tasks: TaskLoopTask[],
  filters: {
    project?: string;
    minPriority?: "low" | "medium" | "high" | "critical";
    tagsFilter?: string[];
  }
): TaskLoopTask[] {
  return tasks.filter((task) => {
    // Filter by project
    if (filters.project && task.project !== filters.project) {
      return false;
    }

    // Filter by minimum priority
    if (filters.minPriority) {
      const taskScore = PRIORITY_SCORES[task.priority || "medium"] || 0;
      const minScore = PRIORITY_SCORES[filters.minPriority] || 0;
      if (taskScore < minScore) {
        return false;
      }
    }

    // Filter by tags (task must have all specified tags)
    if (filters.tagsFilter && filters.tagsFilter.length > 0) {
      const taskTags = task.tags || [];
      const hasAllTags = filters.tagsFilter.every((tag) =>
        taskTags.includes(tag)
      );
      if (!hasAllTags) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Create a default task selector with priority strategy
 */
export function createDefaultTaskSelector(limit?: number): TaskSelector {
  return new TaskSelector({
    strategy: "priority",
    respectDependencies: true,
    limit,
  });
}
