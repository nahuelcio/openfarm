import type {
  Workflow,
  WorkflowParameter,
  WorkflowStep,
} from "../types/workflow";
import { compileWorkflow } from "./compiler";
import { parseWorkflowYAML } from "./parser";

/**
 * Converts a JSON workflow to YAML format
 */
export async function convertWorkflowToYAML(
  workflow: Workflow
): Promise<string> {
  // Import js-yaml dynamically
  const yaml = await import("js-yaml");

  // Convert workflow to plain object
  const workflowObj = workflowToPlainObject(workflow);

  try {
    return yaml.dump(workflowObj, {
      indent: 2,
      lineWidth: -1, // No line width limit
      noRefs: true, // Don't use YAML references
      sortKeys: false, // Preserve key order
    });
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to convert workflow to YAML: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Converts a YAML workflow string to Workflow object
 */
export async function convertYAMLToWorkflow(
  yamlContent: string
): Promise<Workflow> {
  const ast = await parseWorkflowYAML(yamlContent);
  return compileWorkflow(ast);
}

/**
 * Converts a JSON workflow (from existing format) to Workflow object
 */
export function convertJSONToWorkflow(jsonWorkflow: unknown): Workflow {
  if (!jsonWorkflow || typeof jsonWorkflow !== "object") {
    throw new Error("JSON workflow must be an object");
  }

  const workflow = jsonWorkflow as Record<string, unknown>;

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

  // Convert to Workflow format
  const result: Workflow = {
    id: workflow.id,
    name: workflow.name,
    description: workflow.description as string | undefined,
    reusable: workflow.reusable as boolean | undefined,
    parameters: workflow.parameters as
      | Record<string, WorkflowParameter>
      | undefined,
    variables: workflow.variables as Record<string, unknown> | undefined,
    steps: (workflow.steps as unknown[]).map(convertJSONStep),
    createdAt: (workflow.createdAt as string) || new Date().toISOString(),
    updatedAt: (workflow.updatedAt as string) || new Date().toISOString(),
    version: workflow.version as string | undefined,
    metadata: workflow.metadata as Record<string, unknown> | undefined,
  };

  return result;
}

/**
 * Converts a JSON step to WorkflowStep format
 */
function convertJSONStep(step: unknown): WorkflowStep {
  if (!step || typeof step !== "object") {
    throw new Error("Step must be an object");
  }

  const stepObj = step as Record<string, unknown>;

  if (!stepObj.id || typeof stepObj.id !== "string") {
    throw new Error("Step must have an 'id' field (string)");
  }
  if (!stepObj.type || typeof stepObj.type !== "string") {
    throw new Error("Step must have a 'type' field (string)");
  }

  if (stepObj.type === "subworkflow" || stepObj.type === "slot") {
    throw new Error(
      `Step '${String(stepObj.id)}' has unsupported type '${stepObj.type}'. Migrate using 'extends' or inline steps.`
    );
  }

  // For JSON workflows, we only support simple steps (no conditionals, loops, etc.)
  // These will be converted to the basic WorkflowStep format
  return {
    id: stepObj.id,
    type: stepObj.type as WorkflowStep["type"],
    action: (stepObj.action as string) || "",
    config: (stepObj.config as Record<string, unknown>) || {},
    timeout: stepObj.timeout as number | undefined,
    retryCount: stepObj.retryCount as number | undefined,
    continueOnError: stepObj.continueOnError as boolean | undefined,
    model: stepObj.model as string | undefined,
    prompt: stepObj.prompt as string | undefined,
  };
}

/**
 * Converts workflow to plain object for YAML serialization
 */
function workflowToPlainObject(workflow: Workflow): Record<string, unknown> {
  const obj: Record<string, unknown> = {
    id: workflow.id,
    name: workflow.name,
  };

  if (workflow.description) {
    obj.description = workflow.description;
  }

  if (workflow.reusable !== undefined) {
    obj.reusable = workflow.reusable;
  }

  if (workflow.parameters) {
    obj.parameters = workflow.parameters;
  }

  if (workflow.variables) {
    obj.variables = workflow.variables;
  }

  obj.steps = workflow.steps.map(stepToPlainObject);

  if (workflow.version) {
    obj.version = workflow.version;
  }

  if (workflow.metadata) {
    obj.metadata = workflow.metadata;
  }

  return obj;
}

/**
 * Converts a step to plain object for YAML serialization
 */
function stepToPlainObject(step: Record<string, unknown>): unknown {
  const obj: Record<string, unknown> = {
    id: step.id,
    type: step.type,
  };

  if (step.type === "subworkflow" || step.type === "slot") {
    throw new Error(
      `Cannot serialize unsupported step type '${step.type}' (step id: ${String(step.id)}).`
    );
  }

  // Add action for simple steps
  if (step.action) {
    obj.action = step.action;
  }

  // Add config
  if (step.config && Object.keys(step.config).length > 0) {
    obj.config = step.config;
  }

  // Conditional step
  if (step.type === "conditional") {
    obj.condition = step.condition;
    if (step.if) {
      obj.if = step.if.map(stepToPlainObject);
    }
    if (step.else) {
      obj.else = step.else.map(stepToPlainObject);
    }
    if (step.switch) {
      obj.switch = Object.fromEntries(
        Object.entries(step.switch).map(([key, steps]) => [
          key,
          (steps as any[]).map(stepToPlainObject),
        ])
      );
    }
    if (step.default) {
      obj.default = step.default.map(stepToPlainObject);
    }
  }

  // Loop step
  if (step.type === "loop") {
    obj.loopType = step.loopType;
    if (step.condition) {
      obj.condition = step.condition;
    }
    if (step.maxIterations !== undefined) {
      obj.maxIterations = step.maxIterations;
    }
    obj.steps = step.steps.map(stepToPlainObject);
    if (step.breakOn) {
      obj.breakOn = step.breakOn;
    }
    if (step.onError) {
      obj.onError = step.onError;
    }
  }

  // Parallel step
  if (step.type === "parallel") {
    obj.steps = step.steps.map(stepToPlainObject);
    if (step.maxConcurrency !== undefined) {
      obj.maxConcurrency = step.maxConcurrency;
    }
    if (step.failFast !== undefined) {
      obj.failFast = step.failFast;
    }
  }

  // Common fields
  if (step.timeout !== undefined) {
    obj.timeout = step.timeout;
  }
  if (step.retryCount !== undefined) {
    obj.retryCount = step.retryCount;
  }
  if (step.continueOnError !== undefined) {
    obj.continueOnError = step.continueOnError;
  }
  if (step.model) {
    obj.model = step.model;
  }
  if (step.prompt) {
    obj.prompt = step.prompt;
  }

  return obj;
}
