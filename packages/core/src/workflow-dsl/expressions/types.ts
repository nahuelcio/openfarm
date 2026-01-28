import type { WorkItem } from "../../types/domain";

/**
 * Context for expression evaluation
 */
export interface ExpressionContext {
  // Work item data
  workItem?: WorkItem;

  // Step results from previous steps
  stepResults?: Record<
    string,
    {
      stepId: string;
      status?: string;
      result?: string;
      error?: string;
    }
  >;

  // Execution metadata
  execution?: {
    id: string;
    workflowId: string;
    workItemId: string;
    status?: string;
  };

  // Workflow variables
  variables?: Record<string, unknown>;

  // Additional context
  [key: string]: unknown;
}

/**
 * Expression evaluation result
 */
export interface ExpressionResult {
  value: unknown;
  type:
    | "string"
    | "number"
    | "boolean"
    | "object"
    | "array"
    | "null"
    | "undefined";
}

/**
 * Function signature for built-in functions
 */
export type ExpressionFunction = (
  args: unknown[],
  context: ExpressionContext
) => unknown;
