/**
 * AST (Abstract Syntax Tree) types for workflow DSL
 */

export interface WorkflowAST {
  id: string;
  name: string;
  description?: string;
  extends?: string; // ID of parent workflow to inherit from
  abstract?: boolean; // If true, workflow cannot be executed directly (inheritance-only via extends)
  reusable?: boolean; // Deprecated, use abstract instead
  parameters?: Record<string, ParameterAST>;
  variables?: Record<string, unknown>;
  steps: StepAST[];
  version?: string;
  metadata?: Record<string, unknown>;
}

export interface ParameterAST {
  type: "string" | "number" | "boolean" | "object" | "array";
  required?: boolean;
  default?: unknown;
  description?: string;
}

export type StepAST =
  | SimpleStepAST
  | ConditionalStepAST
  | LoopStepAST
  | ParallelStepAST;

export interface SimpleStepAST {
  id: string;
  type: string;
  action: string;
  config?: Record<string, unknown>;
  timeout?: number;
  retryCount?: number;
  continueOnError?: boolean;
  model?: string;
  prompt?: string;
}

export interface ConditionalStepAST {
  id: string;
  type: "conditional";
  condition: string;
  if?: StepAST[];
  else?: StepAST[];
  switch?: Record<string, StepAST[]>;
  default?: StepAST[];
  timeout?: number;
  retryCount?: number;
  continueOnError?: boolean;
}

export interface LoopStepAST {
  id: string;
  type: "loop";
  loopType: "while" | "for" | "retry";
  condition?: string;
  maxIterations?: number | string;
  steps: StepAST[];
  breakOn?: string;
  onError?: "continue" | "break" | "fail";
  timeout?: number;
  retryCount?: number;
  continueOnError?: boolean;
}

export interface ParallelStepAST {
  id: string;
  type: "parallel";
  steps: StepAST[];
  maxConcurrency?: number;
  failFast?: boolean;
  timeout?: number;
  retryCount?: number;
  continueOnError?: boolean;
}

/**
 * Parses YAML workflow definition to AST
 */
export async function parseWorkflowYAML(
  yamlContent: string
): Promise<WorkflowAST> {
  // Import js-yaml dynamically
  const yaml = await import("js-yaml");

  try {
    const parsed = yaml.load(yamlContent) as unknown;

    if (!parsed || typeof parsed !== "object") {
      throw new Error("Invalid YAML: root must be an object");
    }

    const workflow = parsed as Record<string, unknown>;

    // Validate required fields
    if (!workflow.id || typeof workflow.id !== "string") {
      throw new Error("Workflow must have an 'id' field (string)");
    }
    if (!workflow.name || typeof workflow.name !== "string") {
      throw new Error("Workflow must have a 'name' field (string)");
    }
    if (!(workflow.steps && Array.isArray(workflow.steps))) {
      throw new Error("Workflow must have a 'steps' field (array)");
    }

    // Parse workflow
    const ast: WorkflowAST = {
      id: workflow.id,
      name: workflow.name,
      description: workflow.description as string | undefined,
      extends: workflow.extends as string | undefined,
      abstract: workflow.abstract as boolean | undefined,
      reusable: workflow.reusable as boolean | undefined,
      parameters: workflow.parameters as
        | Record<string, ParameterAST>
        | undefined,
      variables: workflow.variables as Record<string, unknown> | undefined,
      steps: parseSteps(workflow.steps),
      version: workflow.version as string | undefined,
      metadata: workflow.metadata as Record<string, unknown> | undefined,
    };

    return ast;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to parse YAML workflow: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Parses steps array
 */
function parseSteps(steps: unknown[]): StepAST[] {
  return steps.map((step, index) => {
    if (!step || typeof step !== "object") {
      throw new Error(`Step ${index} must be an object`);
    }

    const stepObj = step as Record<string, unknown>;

    if (!stepObj.id || typeof stepObj.id !== "string") {
      throw new Error(`Step ${index} must have an 'id' field (string)`);
    }

    if (!stepObj.type || typeof stepObj.type !== "string") {
      throw new Error(`Step ${index} must have a 'type' field (string)`);
    }

    const type = stepObj.type as string;

    // Parse based on type
    switch (type) {
      case "conditional":
        return parseConditionalStep(stepObj, index);
      case "loop":
        return parseLoopStep(stepObj, index);
      case "parallel":
        return parseParallelStep(stepObj, index);
      case "subworkflow":
      case "slot": {
        const stepId = stepObj.id as string;
        throw new Error(
          `Step ${index} (${stepId}) has unsupported type '${type}'. Migrate using 'extends' or inline steps.`
        );
      }
      default:
        return parseSimpleStep(stepObj, index);
    }
  });
}

/**
 * Parses a simple step
 */
function parseSimpleStep(
  step: Record<string, unknown>,
  index: number
): SimpleStepAST {
  if (!step.action || typeof step.action !== "string") {
    throw new Error(
      `Step ${index} (${step.id}) must have an 'action' field (string)`
    );
  }

  return {
    id: step.id as string,
    type: step.type as string,
    action: step.action as string,
    config: step.config as Record<string, unknown> | undefined,
    timeout: step.timeout as number | undefined,
    retryCount: step.retryCount as number | undefined,
    continueOnError: step.continueOnError as boolean | undefined,
    model: step.model as string | undefined,
    prompt: step.prompt as string | undefined,
  };
}

/**
 * Parses a conditional step
 */
function parseConditionalStep(
  step: Record<string, unknown>,
  index: number
): ConditionalStepAST {
  if (!step.condition || typeof step.condition !== "string") {
    throw new Error(
      `Conditional step ${index} (${step.id}) must have a 'condition' field (string)`
    );
  }

  return {
    id: step.id as string,
    type: "conditional",
    condition: step.condition as string,
    if: step.if ? parseSteps(step.if as unknown[]) : undefined,
    else: step.else ? parseSteps(step.else as unknown[]) : undefined,
    switch: step.switch
      ? (Object.fromEntries(
          Object.entries(step.switch as Record<string, unknown>).map(
            ([key, value]) => [key, parseSteps(value as unknown[])]
          )
        ) as Record<string, StepAST[]>)
      : undefined,
    default: step.default ? parseSteps(step.default as unknown[]) : undefined,
    timeout: step.timeout as number | undefined,
    retryCount: step.retryCount as number | undefined,
    continueOnError: step.continueOnError as boolean | undefined,
  };
}

/**
 * Parses a loop step
 */
function parseLoopStep(
  step: Record<string, unknown>,
  index: number
): LoopStepAST {
  if (!step.loopType || typeof step.loopType !== "string") {
    throw new Error(
      `Loop step ${index} (${step.id}) must have a 'loopType' field (string)`
    );
  }

  if (!["while", "for", "retry"].includes(step.loopType)) {
    throw new Error(
      `Loop step ${index} (${step.id}) must have loopType 'while', 'for', or 'retry'`
    );
  }

  if (!(step.steps && Array.isArray(step.steps))) {
    throw new Error(
      `Loop step ${index} (${step.id}) must have a 'steps' field (array)`
    );
  }

  return {
    id: step.id as string,
    type: "loop",
    loopType: step.loopType as "while" | "for" | "retry",
    condition: step.condition as string | undefined,
    maxIterations:
      step.maxIterations !== undefined
        ? typeof step.maxIterations === "number"
          ? step.maxIterations
          : (step.maxIterations as string)
        : undefined,
    steps: parseSteps(step.steps as unknown[]),
    breakOn: step.breakOn as string | undefined,
    onError: step.onError as "continue" | "break" | "fail" | undefined,
    timeout: step.timeout as number | undefined,
    retryCount: step.retryCount as number | undefined,
    continueOnError: step.continueOnError as boolean | undefined,
  };
}

/**
 * Parses a parallel step
 */
function parseParallelStep(
  step: Record<string, unknown>,
  index: number
): ParallelStepAST {
  if (!(step.steps && Array.isArray(step.steps))) {
    throw new Error(
      `Parallel step ${index} (${step.id}) must have a 'steps' field (array)`
    );
  }

  return {
    id: step.id as string,
    type: "parallel",
    steps: parseSteps(step.steps as unknown[]),
    maxConcurrency: step.maxConcurrency as number | undefined,
    failFast: step.failFast as boolean | undefined,
    timeout: step.timeout as number | undefined,
    retryCount: step.retryCount as number | undefined,
    continueOnError: step.continueOnError as boolean | undefined,
  };
}
