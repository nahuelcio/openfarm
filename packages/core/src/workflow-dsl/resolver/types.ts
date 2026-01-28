import type { WorkItem } from "../../types/domain";
import type { Workflow } from "../../types/workflow";

// Use any type to avoid importing from bun during bundling
type SQL = any;

/**
 * Options for workflow resolution
 */
export interface ResolveOptions {
  /** Database instance to search for workflows */
  db?: SQL;
  /** Path to workflow files directory */
  workflowFilesPath?: string;
  /** Pre-loaded workflows cache */
  allWorkflows?: Workflow[];
  /** Maximum recursion depth (default: 10) */
  maxDepth?: number;
}

/**
 * Context for workflow resolution
 */
export interface ResolveContext {
  /** Work item being processed */
  workItem?: WorkItem;
  /** Results from previously executed steps */
  stepResults?: Array<{
    stepId: string;
    result?: string;
    status?: string;
    error?: string;
  }>;
  /** Execution metadata */
  execution?: {
    id: string;
    workflowId: string;
    workItemId: string;
    status?: string;
  };
  /** Variables available during resolution */
  variables?: Record<string, unknown>;
  /** Track visited workflows for circular dependency detection */
  visitedWorkflows?: Set<string>;
  /** Current recursion depth */
  depth?: number;
}

/**
 * Step result interface for resolved step execution context
 */
export interface StepResult {
  stepId: string;
  result?: string;
  status?: string;
  error?: string;
}
