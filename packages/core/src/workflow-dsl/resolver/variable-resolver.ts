import { StepType } from "../../constants/actions";
import type {
  ConditionalStep,
  ExtendedWorkflowStep,
  LoopStep,
  ParallelStep,
  Workflow,
} from "../../types/workflow";
import { evaluateExpression } from "../expressions";
import type { ExpressionContext } from "../expressions/types";

/**
 * Resolves workflow parameters with provided values
 */
export function resolveWorkflowParameters(
  workflow: Workflow,
  providedVariables: Record<string, unknown>,
  context: ExpressionContext
): Record<string, unknown> {
  const resolved: Record<string, unknown> = {};

  // First, resolve workflow-level variables (these can be referenced in parameters)
  if (workflow.variables) {
    for (const [key, value] of Object.entries(workflow.variables)) {
      if (typeof value === "string" && value.includes("${")) {
        const evaluated = evaluateExpression(value, context);
        // If evaluation returned the original expression (variable not found),
        // keep it unresolved so it can be resolved later when variables are available
        if (typeof evaluated === "string" && evaluated === value) {
          resolved[key] = value;
        } else {
          resolved[key] = evaluated;
        }
      } else {
        resolved[key] = value;
      }
    }
  }

  // Then resolve parameters (parameters can override workflow variables)
  if (workflow.parameters) {
    for (const [key, param] of Object.entries(workflow.parameters)) {
      // Use provided value if available
      if (key in providedVariables) {
        const value = providedVariables[key];
        // Evaluate if it's a string expression
        if (typeof value === "string" && value.includes("${")) {
          const evaluated = evaluateExpression(value, context);
          // If evaluation returned the original expression (variable not found),
          // keep it unresolved so it can be resolved later when variables are available
          if (typeof evaluated === "string" && evaluated === value) {
            resolved[key] = value;
          } else {
            resolved[key] = evaluated;
          }
        } else {
          resolved[key] = value;
        }
      } else if (param.default !== undefined) {
        // Use default value
        if (typeof param.default === "string" && param.default.includes("${")) {
          const evaluated = evaluateExpression(param.default, context);
          // If evaluation returned the original expression (variable not found),
          // keep it unresolved so it can be resolved later when variables are available
          if (typeof evaluated === "string" && evaluated === param.default) {
            resolved[key] = param.default;
          } else {
            resolved[key] = evaluated;
          }
        } else {
          resolved[key] = param.default;
        }
      } else if (param.required) {
        throw new Error(
          `Required parameter '${key}' not provided for workflow '${workflow.id}'`
        );
      }
    }
  }

  // Merge with provided variables (for variables not in parameters or workflow variables)
  // Provided variables take lowest priority
  return { ...providedVariables, ...resolved };
}

/**
 * Resolves variables in workflow steps (evaluates expressions)
 */
export function resolveWorkflowVariables(
  workflow: Workflow,
  variables: Record<string, unknown>,
  context: ExpressionContext
): Workflow {
  const resolvedSteps = workflow.steps.map((step) =>
    resolveStepVariables(step, variables, context)
  );

  return {
    ...workflow,
    steps: resolvedSteps,
    variables: workflow.variables
      ? Object.fromEntries(
          Object.entries(workflow.variables).map(([key, value]) => [
            key,
            typeof value === "string" && value.includes("${")
              ? evaluateExpression(value, context)
              : value,
          ])
        )
      : undefined,
  };
}

/**
 * Resolves variables in a single step
 */
export function resolveStepVariables(
  step: ExtendedWorkflowStep,
  variables: Record<string, unknown>,
  context: ExpressionContext
): ExtendedWorkflowStep {
  // Resolve config
  const resolvedConfig: Record<string, unknown> = {};
  if (step.config) {
    for (const [key, value] of Object.entries(step.config)) {
      if (typeof value === "string" && value.includes("${")) {
        const resolved = evaluateExpression(value, context);
        resolvedConfig[key] = resolved;
      } else {
        resolvedConfig[key] = value;
      }
    }
  }

  // Resolve prompt
  let resolvedPrompt: string | undefined;
  if (step.prompt) {
    if (typeof step.prompt === "string" && step.prompt.includes("${")) {
      resolvedPrompt = evaluateExpression(step.prompt, context) as string;
    } else {
      resolvedPrompt = step.prompt;
    }
  }

  const baseStep = {
    ...step,
    config: resolvedConfig,
    prompt: resolvedPrompt,
  };

  // Handle conditional step
  if (step.type === StepType.CONDITIONAL) {
    const conditionalStep = step as ConditionalStep;
    return {
      ...baseStep,
      condition:
        typeof conditionalStep.condition === "string" &&
        conditionalStep.condition.includes("${")
          ? evaluateExpression(conditionalStep.condition, context)
          : conditionalStep.condition,
      if: conditionalStep.if?.map((s) =>
        resolveStepVariables(s, variables, context)
      ),
      else: conditionalStep.else?.map((s) =>
        resolveStepVariables(s, variables, context)
      ),
      switch: conditionalStep.switch
        ? Object.fromEntries(
            Object.entries(conditionalStep.switch).map(([key, steps]) => [
              key,
              steps.map((s) => resolveStepVariables(s, variables, context)),
            ])
          )
        : undefined,
      default: conditionalStep.default?.map((s) =>
        resolveStepVariables(s, variables, context)
      ),
    } as ExtendedWorkflowStep;
  }

  // Handle loop step
  if (step.type === StepType.LOOP) {
    const loopStep = step as LoopStep;
    return {
      ...baseStep,
      condition:
        loopStep.condition &&
        typeof loopStep.condition === "string" &&
        loopStep.condition.includes("${")
          ? evaluateExpression(loopStep.condition, context)
          : loopStep.condition,
      maxIterations:
        typeof loopStep.maxIterations === "string" &&
        loopStep.maxIterations.includes("${")
          ? evaluateExpression(loopStep.maxIterations, context)
          : loopStep.maxIterations,
      steps: loopStep.steps.map((s) =>
        resolveStepVariables(s, variables, context)
      ),
      breakOn:
        loopStep.breakOn &&
        typeof loopStep.breakOn === "string" &&
        loopStep.breakOn.includes("${")
          ? evaluateExpression(loopStep.breakOn, context)
          : loopStep.breakOn,
    } as ExtendedWorkflowStep;
  }

  // Handle parallel step
  if (step.type === StepType.PARALLEL) {
    const parallelStep = step as ParallelStep;
    return {
      ...baseStep,
      steps: parallelStep.steps.map((s) =>
        resolveStepVariables(s, variables, context)
      ),
    } as ExtendedWorkflowStep;
  }

  return baseStep;
}
