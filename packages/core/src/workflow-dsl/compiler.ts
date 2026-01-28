import { StepType } from "../constants/actions";
import type {
  ExtendedWorkflowStep,
  Workflow,
  WorkflowParameter,
} from "../types/workflow";
import type {
  ConditionalStepAST,
  LoopStepAST,
  ParallelStepAST,
  SimpleStepAST,
  StepAST,
  WorkflowAST,
} from "./parser";

/**
 * Compiles AST to Workflow structure
 */
export function compileWorkflow(ast: WorkflowAST): Workflow {
  const workflow: Workflow = {
    id: ast.id,
    name: ast.name,
    description: ast.description,
    extends: ast.extends,
    abstract: ast.abstract,
    reusable: ast.reusable,
    parameters: ast.parameters
      ? Object.fromEntries(
          Object.entries(ast.parameters).map(([key, param]) => [
            key,
            {
              type: param.type,
              required: param.required,
              default: param.default,
              description: param.description,
            } as WorkflowParameter,
          ])
        )
      : undefined,
    variables: ast.variables,
    steps: ast.steps.map(compileStep),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: ast.version,
    metadata: ast.metadata,
  };

  return workflow;
}

/**
 * Compiles a step AST to WorkflowStep
 */
function compileStep(step: StepAST): ExtendedWorkflowStep {
  if (step.type === "subworkflow" || step.type === "slot") {
    const stepId = (step as { id?: unknown }).id;
    throw new Error(
      `Step '${String(stepId)}' has unsupported type '${step.type}'. Migrate using 'extends' or inline steps.`
    );
  }
  if (step.type === "conditional") {
    return compileConditionalStep(step as ConditionalStepAST);
  }
  if (step.type === "loop") {
    return compileLoopStep(step as LoopStepAST);
  }
  if (step.type === "parallel") {
    return compileParallelStep(step as ParallelStepAST);
  }
  return compileSimpleStep(step as SimpleStepAST);
}

/**
 * Compiles a simple step
 */
function compileSimpleStep(step: SimpleStepAST): ExtendedWorkflowStep {
  return {
    id: step.id,
    type: step.type as StepType,
    action: step.action,
    config: step.config || {},
    timeout: step.timeout,
    retryCount: step.retryCount,
    continueOnError: step.continueOnError,
    model: step.model,
    prompt: step.prompt,
  };
}

/**
 * Compiles a conditional step
 */
function compileConditionalStep(
  step: ConditionalStepAST
): ExtendedWorkflowStep {
  return {
    id: step.id,
    type: StepType.CONDITIONAL,
    action: "", // Conditional steps don't have actions
    config: {},
    condition: step.condition,
    if: step.if?.map(compileStep),
    else: step.else?.map(compileStep),
    switch: step.switch
      ? Object.fromEntries(
          Object.entries(step.switch).map(([key, steps]) => [
            key,
            steps.map(compileStep),
          ])
        )
      : undefined,
    default: step.default?.map(compileStep),
    timeout: step.timeout,
    retryCount: step.retryCount,
    continueOnError: step.continueOnError,
  };
}

/**
 * Compiles a loop step
 */
function compileLoopStep(step: LoopStepAST): ExtendedWorkflowStep {
  return {
    id: step.id,
    type: StepType.LOOP,
    action: "", // Loop steps don't have actions
    config: {},
    loopType: step.loopType,
    condition: step.condition,
    maxIterations: step.maxIterations,
    steps: step.steps.map(compileStep),
    breakOn: step.breakOn,
    onError: step.onError,
    timeout: step.timeout,
    retryCount: step.retryCount,
    continueOnError: step.continueOnError,
  };
}

/**
 * Compiles a parallel step
 */
function compileParallelStep(step: ParallelStepAST): ExtendedWorkflowStep {
  return {
    id: step.id,
    type: StepType.PARALLEL,
    action: "", // Parallel steps don't have actions
    config: {},
    steps: step.steps.map(compileStep),
    maxConcurrency: step.maxConcurrency,
    failFast: step.failFast,
    timeout: step.timeout,
    retryCount: step.retryCount,
    continueOnError: step.continueOnError,
  };
}
