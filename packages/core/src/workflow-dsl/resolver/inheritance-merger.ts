import type { ExtendedWorkflowStep, Workflow } from "../../types/workflow";

/**
 * Merges a parent workflow with a child workflow
 * Child values override parent values
 */
export function mergeWorkflows(parent: Workflow, child: Workflow): Workflow {
  // Merge steps: child steps override parent steps with same ID.
  // New child steps are inserted according to the child's step order (anchored between parent steps when possible).
  const _parentStepsMap = new Map(parent.steps.map((step) => [step.id, step]));
  const childStepsMap = new Map(child.steps.map((step) => [step.id, step]));

  // Identify parent step IDs
  const parentStepIds = new Set(parent.steps.map((s) => s.id));

  // Separate child steps into: overrides (same ID as parent) and new steps (different ID)
  const childNewSteps: ExtendedWorkflowStep[] = [];

  for (const childStep of child.steps) {
    if (!parentStepIds.has(childStep.id)) {
      childNewSteps.push(childStep);
    }
  }

  // Decide where to insert new child steps.
  // Strategy:
  // - If a new step appears between two parent steps in the child order, insert it between those parent steps.
  // - If it only has a previous parent anchor, insert it after that parent step.
  // - If it only has a next parent anchor, insert it before that parent step.
  // - If it has no anchors, append at the end.
  const insertBefore = new Map<string, ExtendedWorkflowStep[]>();
  const insertAfter = new Map<string, ExtendedWorkflowStep[]>();
  const appendAtEnd: ExtendedWorkflowStep[] = [];

  const findPrevParentStepId = (childIndex: number): string | undefined => {
    for (let i = childIndex - 1; i >= 0; i--) {
      const stepId = child.steps[i]?.id;
      if (stepId && parentStepIds.has(stepId)) {
        return stepId;
      }
    }
    return undefined;
  };

  const findNextParentStepId = (childIndex: number): string | undefined => {
    for (let i = childIndex + 1; i < child.steps.length; i++) {
      const stepId = child.steps[i]?.id;
      if (stepId && parentStepIds.has(stepId)) {
        return stepId;
      }
    }
    return undefined;
  };

  for (let i = 0; i < child.steps.length; i++) {
    const step = child.steps[i];
    if (!step || parentStepIds.has(step.id)) {
      continue;
    }

    const nextParentId = findNextParentStepId(i);
    const prevParentId = findPrevParentStepId(i);

    if (nextParentId) {
      const bucket = insertBefore.get(nextParentId) || [];
      bucket.push(step);
      insertBefore.set(nextParentId, bucket);
      continue;
    }

    if (prevParentId) {
      const bucket = insertAfter.get(prevParentId) || [];
      bucket.push(step);
      insertAfter.set(prevParentId, bucket);
      continue;
    }

    appendAtEnd.push(step);
  }

  // Build merged steps: parent steps with overrides, new steps inserted per insertion maps
  const mergedSteps: ExtendedWorkflowStep[] = [];
  const processedIds = new Set<string>();

  // Process parent steps
  for (const parentStep of parent.steps) {
    const before = insertBefore.get(parentStep.id);
    if (before) {
      for (const step of before) {
        mergedSteps.push(step);
        processedIds.add(step.id);
      }
    }

    if (childStepsMap.has(parentStep.id)) {
      // Child overrides parent step
      mergedSteps.push(childStepsMap.get(parentStep.id)!);
      processedIds.add(parentStep.id);
    } else {
      // Keep parent step
      mergedSteps.push(parentStep);
      processedIds.add(parentStep.id);
    }

    const after = insertAfter.get(parentStep.id);
    if (after) {
      for (const step of after) {
        mergedSteps.push(step);
        processedIds.add(step.id);
      }
    }
  }

  // Add any remaining new child steps that weren't inserted
  for (const childStep of childNewSteps) {
    if (!processedIds.has(childStep.id)) {
      mergedSteps.push(childStep);
      processedIds.add(childStep.id);
    }
  }

  for (const step of appendAtEnd) {
    if (!processedIds.has(step.id)) {
      mergedSteps.push(step);
      processedIds.add(step.id);
    }
  }

  // Merge variables: child overrides parent
  const mergedVariables = {
    ...parent.variables,
    ...child.variables,
  };

  // Merge parameters: child can add new parameters, but can't remove parent ones
  const mergedParameters = {
    ...parent.parameters,
    ...child.parameters,
  };

  // Merge metadata: child overrides parent
  const mergedMetadata = {
    ...parent.metadata,
    ...child.metadata,
  };

  return {
    ...child,
    // Keep child's id, name, description, but merge other fields
    description: child.description || parent.description,
    // Abstract: child explicitly set takes precedence, otherwise child is NOT abstract (undefined means executable)
    // Only inherit abstract from parent if child explicitly sets it to the same value, otherwise default to executable
    abstract: child.abstract ?? undefined,
    reusable: child.reusable ?? parent.reusable,
    parameters:
      Object.keys(mergedParameters).length > 0 ? mergedParameters : undefined,
    variables:
      Object.keys(mergedVariables).length > 0 ? mergedVariables : undefined,
    steps: mergedSteps,
    metadata:
      Object.keys(mergedMetadata).length > 0 ? mergedMetadata : undefined,
    // Remove extends field as inheritance is now resolved
    extends: undefined,
  };
}
