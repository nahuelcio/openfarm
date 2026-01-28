import type { Workflow } from "../../types/workflow";
import { mergeWorkflows } from "./inheritance-merger";
import type { ResolveContext, ResolveOptions } from "./types";
import { findWorkflow } from "./workflow-loader";

/**
 * Resolves workflow inheritance (extends) and returns the fully resolved workflow
 */
export async function resolveWorkflowInheritance(
  workflow: Workflow,
  context: ResolveContext,
  options: ResolveOptions = {}
): Promise<Workflow> {
  const { maxDepth = 10 } = options;

  const visited = context.visitedWorkflows || new Set<string>();
  const depth = context.depth || 0;

  // Check recursion depth
  if (depth >= maxDepth) {
    throw new Error(
      `Maximum recursion depth (${maxDepth}) exceeded while resolving workflow inheritance for '${workflow.id}'. Possible circular dependency.`
    );
  }

  // If no parent, return as-is
  if (!workflow.extends) {
    return workflow;
  }

  const parentId = workflow.extends;

  // Check for circular dependencies
  if (visited.has(workflow.id)) {
    throw new Error(
      `Circular inheritance detected: ${Array.from(visited).join(" -> ")} -> ${workflow.id}`
    );
  }

  visited.add(workflow.id);

  // Load parent workflow
  const parentWorkflow = await findWorkflow(parentId, options);

  if (!parentWorkflow) {
    throw new Error(
      `Parent workflow '${parentId}' not found for workflow '${workflow.id}'`
    );
  }

  // Recursively resolve parent's inheritance first
  const newContext: ResolveContext = {
    ...context,
    visitedWorkflows: visited,
    depth: depth + 1,
  };
  const resolvedParent = await resolveWorkflowInheritance(
    parentWorkflow,
    newContext,
    options
  );

  // Merge workflows: child overrides parent
  const mergedWorkflow = mergeWorkflows(resolvedParent, workflow);

  visited.delete(workflow.id);

  return mergedWorkflow;
}
