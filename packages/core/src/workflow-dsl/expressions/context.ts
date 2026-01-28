import type { WorkItem } from "../../types/domain";
import type { ExpressionContext } from "./types";

/**
 * Builds expression context from available data
 */
export function buildExpressionContext(
  workItem?: WorkItem,
  stepResults?: Array<{
    stepId: string;
    result?: string;
    status?: string;
    error?: string;
  }>,
  execution?: {
    id: string;
    workflowId: string;
    workItemId: string;
    status?: string;
  },
  variables?: Record<string, unknown>
): ExpressionContext {
  const context: ExpressionContext = {
    workItem,
    stepResults: {},
    execution,
    variables: variables || {},
  };

  // Build stepResults map
  if (stepResults) {
    for (const result of stepResults) {
      context.stepResults![result.stepId] = {
        stepId: result.stepId,
        status: result.status,
        result: result.result,
        error: result.error,
      };
    }
  }

  return context;
}

/**
 * Gets a value from context using dot notation (e.g., "workItem.title")
 *
 * Resolution order for simple paths (no dots):
 * 1. Check context top-level keys (workItem, stepResults, execution, variables)
 * 2. Check inside context.variables
 *
 * For dotted paths (e.g., "workItem.title"):
 * - Navigate through the context object structure
 */
export function getContextValue(
  path: string,
  context: ExpressionContext
): unknown {
  const parts = path.split(".");

  // For simple paths (no dots), check variables first if not a known top-level key
  if (parts.length === 1) {
    const key = parts[0];
    if (!key) {
      return undefined;
    }
    const topLevelKeys = ["workItem", "stepResults", "execution", "variables"];

    // If it's not a top-level context key, check in variables
    if (
      !topLevelKeys.includes(key) &&
      context.variables &&
      key in context.variables
    ) {
      return context.variables[key];
    }
  }

  // Also handle "variables.xxx" explicitly to access variables
  if (parts[0] === "variables" && parts.length > 1 && context.variables) {
    const variablePath = parts.slice(1);
    let value: unknown = context.variables;

    for (const part of variablePath) {
      if (value === null || value === undefined) {
        return undefined;
      }
      if (typeof value !== "object") {
        return undefined;
      }
      value = (value as Record<string, unknown>)[part];
    }

    return value;
  }

  // Standard path resolution through context
  let value: unknown = context;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (!part) {
      return undefined;
    }

    if (value === null || value === undefined) {
      return undefined;
    }
    if (typeof value !== "object") {
      return undefined;
    }

    value = (value as Record<string, unknown>)[part];
  }

  return value;
}
