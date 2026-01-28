import { StepType } from "../constants/actions";
import type {
  ConditionalStep,
  ExtendedWorkflowStep,
  LoopStep,
  ParallelStep,
  Workflow,
} from "../types/workflow";

export interface ValidationError {
  path: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/**
 * Validates a workflow structure
 */
export function validateWorkflow(workflow: Workflow): ValidationResult {
  const errors: ValidationError[] = [];

  // Validate basic structure
  if (!workflow.id || typeof workflow.id !== "string") {
    errors.push({
      path: "id",
      message: "Workflow must have a valid 'id' field",
    });
  }

  if (!workflow.name || typeof workflow.name !== "string") {
    errors.push({
      path: "name",
      message: "Workflow must have a valid 'name' field",
    });
  }

  // Abstract workflows can have empty steps (they're templates)
  if (
    !workflow.abstract &&
    (!(workflow.steps && Array.isArray(workflow.steps)) ||
      workflow.steps.length === 0)
  ) {
    errors.push({
      path: "steps",
      message: "Non-abstract workflow must have at least one step",
    });
  }

  // Validate parameters if present
  if (workflow.parameters) {
    for (const [key, param] of Object.entries(workflow.parameters)) {
      const paramPath = `parameters.${key}`;
      if (
        !(
          param.type &&
          ["string", "number", "boolean", "object", "array"].includes(
            param.type
          )
        )
      ) {
        errors.push({
          path: paramPath,
          message: `Parameter '${key}' must have a valid type (string, number, boolean, object, or array)`,
        });
      }
    }
  }

  // Validate steps
  if (workflow.steps) {
    const stepIds = new Set<string>();
    for (let i = 0; i < workflow.steps.length; i++) {
      const step = workflow.steps[i];
      if (!step) {
        errors.push({
          path: `steps[${i}]`,
          message: "Step is required",
        });
        continue;
      }
      const stepPath = `steps[${i}]`;
      const stepErrors = validateStep(step, stepPath, stepIds);
      errors.push(...stepErrors);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validates a single step
 */
function validateStep(
  step: ExtendedWorkflowStep,
  path: string,
  stepIds: Set<string>
): ValidationError[] {
  const errors: ValidationError[] = [];

  const rawType = (step as { type?: unknown }).type;
  if (rawType === "subworkflow" || rawType === "slot") {
    errors.push({
      path: `${path}.type`,
      message: `Unsupported step type '${rawType}'. Migrate using 'extends' or inline steps.`,
    });
    return errors;
  }

  // Validate step ID
  if (!step.id || typeof step.id !== "string") {
    errors.push({
      path: `${path}.id`,
      message: "Step must have a valid 'id' field",
    });
    return errors; // Can't continue validation without ID
  }

  // Check for duplicate step IDs
  if (stepIds.has(step.id)) {
    errors.push({
      path: `${path}.id`,
      message: `Duplicate step ID: '${step.id}'`,
    });
  }
  stepIds.add(step.id);

  // Validate step type
  if (!step.type) {
    errors.push({
      path: `${path}.type`,
      message: "Step must have a 'type' field",
    });
    return errors;
  }

  // Type-specific validation
  switch (step.type) {
    case StepType.CONDITIONAL:
      errors.push(...validateConditionalStep(step as ConditionalStep, path));
      break;
    case StepType.LOOP:
      errors.push(...validateLoopStep(step as LoopStep, path));
      break;
    case StepType.PARALLEL:
      errors.push(...validateParallelStep(step as ParallelStep, path));
      break;
    default:
      // Simple step validation
      if (!step.action || typeof step.action !== "string") {
        errors.push({
          path: `${path}.action`,
          message: "Step must have a valid 'action' field",
        });
      }
      break;
  }

  return errors;
}

/**
 * Validates a conditional step
 */
function validateConditionalStep(
  step: ConditionalStep,
  path: string
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!step.condition || typeof step.condition !== "string") {
    errors.push({
      path: `${path}.condition`,
      message:
        "Conditional step must have a 'condition' field (string expression)",
    });
  }

  // Must have either if/else or switch
  if (!(step.if || step.switch)) {
    errors.push({
      path: `${path}`,
      message: "Conditional step must have either 'if' or 'switch' field",
    });
  }

  // Validate if branch
  if (step.if) {
    if (!Array.isArray(step.if) || step.if.length === 0) {
      errors.push({
        path: `${path}.if`,
        message: "Conditional step 'if' must be a non-empty array of steps",
      });
    } else {
      const stepIds = new Set<string>();
      for (let i = 0; i < step.if.length; i++) {
        const subStep = step.if[i];
        if (!subStep) {
          errors.push({
            path: `${path}.if[${i}]`,
            message: "Step is required",
          });
          continue;
        }
        const subErrors = validateStep(subStep, `${path}.if[${i}]`, stepIds);
        errors.push(...subErrors);
      }
    }
  }

  // Validate else branch
  if (step.else) {
    if (Array.isArray(step.else)) {
      const stepIds = new Set<string>();
      for (let i = 0; i < step.else.length; i++) {
        const subStep = step.else[i];
        if (!subStep) {
          errors.push({
            path: `${path}.else[${i}]`,
            message: "Step is required",
          });
          continue;
        }
        const subErrors = validateStep(subStep, `${path}.else[${i}]`, stepIds);
        errors.push(...subErrors);
      }
    } else {
      errors.push({
        path: `${path}.else`,
        message: "Conditional step 'else' must be an array of steps",
      });
    }
  }

  // Validate switch cases
  if (step.switch) {
    for (const [caseKey, caseSteps] of Object.entries(step.switch)) {
      if (Array.isArray(caseSteps)) {
        const stepIds = new Set<string>();
        for (let i = 0; i < caseSteps.length; i++) {
          const subStep = caseSteps[i];
          if (!subStep) {
            errors.push({
              path: `${path}.switch.${caseKey}[${i}]`,
              message: "Step is required",
            });
            continue;
          }
          const subErrors = validateStep(
            subStep,
            `${path}.switch.${caseKey}[${i}]`,
            stepIds
          );
          errors.push(...subErrors);
        }
      } else {
        errors.push({
          path: `${path}.switch.${caseKey}`,
          message: `Switch case '${caseKey}' must be an array of steps`,
        });
      }
    }
  }

  return errors;
}

/**
 * Validates a loop step
 */
function validateLoopStep(step: LoopStep, path: string): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!(step.loopType && ["while", "for", "retry"].includes(step.loopType))) {
    errors.push({
      path: `${path}.loopType`,
      message: "Loop step must have a valid 'loopType' (while, for, or retry)",
    });
  }

  if (!(step.steps && Array.isArray(step.steps)) || step.steps.length === 0) {
    errors.push({
      path: `${path}.steps`,
      message: "Loop step must have a non-empty 'steps' array",
    });
  } else {
    const stepIds = new Set<string>();
    for (let i = 0; i < step.steps.length; i++) {
      const subStep = step.steps[i];
      if (!subStep) {
        errors.push({
          path: `${path}.steps[${i}]`,
          message: "Step is required",
        });
        continue;
      }
      const subErrors = validateStep(subStep, `${path}.steps[${i}]`, stepIds);
      errors.push(...subErrors);
    }
  }

  // while loops must have a condition
  if (step.loopType === "while" && !step.condition) {
    errors.push({
      path: `${path}.condition`,
      message: "While loop must have a 'condition' field",
    });
  }

  // retry loops should have maxIterations
  if (step.loopType === "retry" && !step.maxIterations) {
    errors.push({
      path: `${path}.maxIterations`,
      message: "Retry loop should have a 'maxIterations' field",
    });
  }

  return errors;
}

/**
 * Validates a parallel step
 */
function validateParallelStep(
  step: ParallelStep,
  path: string
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!(step.steps && Array.isArray(step.steps)) || step.steps.length === 0) {
    errors.push({
      path: `${path}.steps`,
      message: "Parallel step must have a non-empty 'steps' array",
    });
  } else {
    const stepIds = new Set<string>();
    for (let i = 0; i < step.steps.length; i++) {
      const subStep = step.steps[i];
      if (!subStep) {
        errors.push({
          path: `${path}.steps[${i}]`,
          message: "Step is required",
        });
        continue;
      }
      const subErrors = validateStep(subStep, `${path}.steps[${i}]`, stepIds);
      errors.push(...subErrors);
    }
  }

  if (
    step.maxConcurrency !== undefined &&
    (typeof step.maxConcurrency !== "number" || step.maxConcurrency < 1)
  ) {
    errors.push({
      path: `${path}.maxConcurrency`,
      message: "Parallel step 'maxConcurrency' must be a positive number",
    });
  }

  return errors;
}

/**
 * Validates workflow for circular dependencies in inheritance
 */
export function validateCircularDependencies(
  workflow: Workflow,
  allWorkflows: Workflow[],
  visited: Set<string> = new Set()
): ValidationResult {
  const errors: ValidationError[] = [];

  if (visited.has(workflow.id)) {
    errors.push({
      path: "workflow",
      message: `Circular dependency detected: ${Array.from(visited).join(" -> ")} -> ${workflow.id}`,
    });
    return { valid: false, errors };
  }

  visited.add(workflow.id);

  // Check inheritance chain
  if (workflow.extends) {
    const parentWorkflow = allWorkflows.find((w) => w.id === workflow.extends);

    if (parentWorkflow) {
      const inheritanceResult = validateCircularDependencies(
        parentWorkflow,
        allWorkflows,
        new Set(visited)
      );
      if (!inheritanceResult.valid) {
        errors.push(...inheritanceResult.errors);
      }
    } else {
      errors.push({
        path: "extends",
        message: `Parent workflow '${workflow.extends}' not found`,
      });
    }
  }

  visited.delete(workflow.id);

  return {
    valid: errors.length === 0,
    errors,
  };
}
