import { StepType } from "@openfarm/core/constants";
import type {
  ConditionalStep,
  ExtendedWorkflowStep,
  LoopStep,
  ParallelStep,
  Workflow,
} from "@openfarm/core/types/workflow";
import {
  buildExpressionContext,
  evaluateBooleanExpression,
  evaluateExpression,
} from "@openfarm/core/workflow-dsl";
import { err, ok, type Result } from "@openfarm/result";
import type { StepExecutionRequest } from "../types";

/**
 * Executes an advanced workflow step (conditional, loop, parallel)
 */
export async function executeAdvancedStep(
  step: ExtendedWorkflowStep,
  request: StepExecutionRequest,
  executeSimpleStep: (
    step: ExtendedWorkflowStep,
    request: StepExecutionRequest
  ) => Promise<Result<string>>,
  allWorkflows?: Workflow[]
): Promise<Result<unknown>> {
  const rawType = (step as { type?: unknown }).type;
  if (rawType === "subworkflow" || rawType === "slot") {
    const stepId = (step as { id?: unknown }).id;
    return err(
      new Error(
        `Step '${String(stepId)}' has unsupported type '${String(rawType)}'. Migrate using 'extends' or inline steps.`
      )
    );
  }

  switch (step.type) {
    case StepType.CONDITIONAL:
      return executeConditionalStep(
        step as ConditionalStep,
        request,
        executeSimpleStep,
        allWorkflows
      );
    case StepType.LOOP:
      return executeLoopStep(
        step as LoopStep,
        request,
        executeSimpleStep,
        allWorkflows
      );
    case StepType.PARALLEL:
      return executeParallelStep(
        step as ParallelStep,
        request,
        executeSimpleStep,
        allWorkflows
      );
    default: {
      // Not an advanced step, delegate to simple step executor
      const result = await executeSimpleStep(step, request);

      // Handle continueOnError for simple steps
      if (!result.ok && step.continueOnError) {
        const { logger } = request;
        await logger(
          `Step '${step.id}' failed but continueOnError is true. Error: ${result.error.message}. Continuing workflow.`
        );
        // Return success even though the step failed
        return ok(
          `Step '${step.id}' failed but workflow continued due to continueOnError`
        );
      }

      return result;
    }
  }
}

/**
 * Executes a conditional step (if/else or switch)
 */
async function executeConditionalStep(
  step: ConditionalStep,
  request: StepExecutionRequest,
  executeSimpleStep: (
    step: ExtendedWorkflowStep,
    request: StepExecutionRequest
  ) => Promise<Result<string>>,
  allWorkflows?: Workflow[]
): Promise<Result<string>> {
  const { logger, context, stepResults } = request;

  // Build expression context
  const expressionContext = buildExpressionContext(
    context.workItem,
    stepResults,
    {
      id: context.executionId,
      workflowId: context.workflowId,
      workItemId: context.workItemId,
    },
    {}
  );

  // Evaluate condition
  const conditionResult = evaluateBooleanExpression(
    step.condition,
    expressionContext
  );
  await logger(
    `Conditional step '${step.id}': condition evaluated to ${conditionResult}`
  );

  let stepsToExecute: ExtendedWorkflowStep[] | undefined;

  // Handle if/else
  if (step.if || step.else) {
    stepsToExecute = conditionResult ? step.if : step.else;
  }
  // Handle switch
  else if (step.switch) {
    const conditionValue = String(
      evaluateExpression(step.condition, expressionContext)
    );
    stepsToExecute = step.switch[conditionValue] || step.default;
  }

  if (!stepsToExecute || stepsToExecute.length === 0) {
    await logger(
      `Conditional step '${step.id}': no steps to execute for condition result`
    );
    return ok("Conditional step completed (no matching branch)");
  }

  // Execute steps in the selected branch
  await logger(
    `Conditional step '${step.id}': executing ${stepsToExecute.length} step(s) in selected branch`
  );

  for (const branchStep of stepsToExecute) {
    const result = await executeAdvancedStep(
      branchStep,
      request,
      executeSimpleStep,
      allWorkflows
    );
    if (!result.ok) {
      const errorMsg = result.error.message;
      if (step.continueOnError) {
        await logger(
          `Conditional step '${step.id}': step '${branchStep.id}' failed: ${errorMsg}. Continuing`
        );
        continue;
      }
      return err(
        new Error(`Conditional step '${step.id}' failed: ${errorMsg}`)
      );
    }
  }

  return ok(`Conditional step '${step.id}' completed successfully`);
}

/**
 * Executes a loop step (while, for, retry)
 */
async function executeLoopStep(
  step: LoopStep,
  request: StepExecutionRequest,
  executeSimpleStep: (
    step: ExtendedWorkflowStep,
    request: StepExecutionRequest
  ) => Promise<Result<string>>,
  allWorkflows?: Workflow[]
): Promise<Result<string>> {
  const { logger, context, stepResults } = request;

  await logger(`Loop step '${step.id}': starting ${step.loopType} loop`);

  // Build expression context
  const expressionContext = buildExpressionContext(
    context.workItem,
    stepResults,
    {
      id: context.executionId,
      workflowId: context.workflowId,
      workItemId: context.workItemId,
    },
    {}
  );

  let iteration = 0;
  const maxIterations =
    typeof step.maxIterations === "number"
      ? step.maxIterations
      : typeof step.maxIterations === "string"
        ? Number(evaluateExpression(step.maxIterations, expressionContext)) ||
          10
        : 10;

  while (true) {
    iteration++;
    await logger(
      `Loop step '${step.id}': iteration ${iteration}/${maxIterations || "∞"}`
    );

    // Check max iterations
    if (maxIterations && iteration > maxIterations) {
      await logger(
        `Loop step '${step.id}': reached max iterations (${maxIterations})`
      );
      break;
    }

    // For while loops, check condition
    if (step.loopType === "while" && step.condition) {
      const conditionResult = evaluateBooleanExpression(
        step.condition,
        expressionContext
      );
      if (!conditionResult) {
        await logger(
          `Loop step '${step.id}': condition evaluated to false, breaking`
        );
        break;
      }
    }

    // Execute steps in loop
    let loopError: Error | undefined;
    for (const loopStep of step.steps) {
      const result = await executeAdvancedStep(
        loopStep,
        request,
        executeSimpleStep,
        allWorkflows
      );
      if (!result.ok) {
        loopError = result.error;

        // Handle error based on onError setting
        if (step.onError === "continue") {
          await logger(
            `Loop step '${step.id}': step '${loopStep.id}' failed but continuing loop`
          );
        } else if (step.onError === "break") {
          await logger(
            `Loop step '${step.id}': step '${loopStep.id}' failed, breaking loop`
          );
          break;
        } else {
          // fail (default)
          return err(
            new Error(
              `Loop step '${step.id}' failed at iteration ${iteration}: ${loopError.message}`
            )
          );
        }
      }
    }

    // Check breakOn condition
    if (step.breakOn) {
      const breakResult = evaluateBooleanExpression(
        step.breakOn,
        expressionContext
      );
      if (breakResult) {
        await logger(`Loop step '${step.id}': breakOn condition met, breaking`);
        break;
      }
    }

    // For retry loops, break on success (no errors)
    if (step.loopType === "retry" && !loopError) {
      await logger(`Loop step '${step.id}': retry succeeded, breaking`);
      break;
    }

    // For for loops, we just iterate the specified number of times
    if (step.loopType === "for" && iteration >= maxIterations) {
      break;
    }
  }

  return ok(`Loop step '${step.id}' completed after ${iteration} iteration(s)`);
}

/**
 * Executes a parallel step
 */
async function executeParallelStep(
  step: ParallelStep,
  request: StepExecutionRequest,
  executeSimpleStep: (
    step: ExtendedWorkflowStep,
    request: StepExecutionRequest
  ) => Promise<Result<string>>,
  allWorkflows?: Workflow[]
): Promise<Result<string>> {
  const { logger } = request;

  await logger(
    `Parallel step '${step.id}': executing ${step.steps.length} step(s) in parallel`
  );

  const maxConcurrency = step.maxConcurrency || step.steps.length;
  const results: Array<{ step: ExtendedWorkflowStep; result: Result<string> }> =
    [];

  // Execute steps in parallel with concurrency limit
  const executing: Promise<void>[] = [];
  let currentIndex = 0;

  for (let i = 0; i < Math.min(maxConcurrency, step.steps.length); i++) {
    const promise = (async () => {
      while (currentIndex < step.steps.length) {
        const stepIndex = currentIndex++;
        const parallelStep = step.steps[stepIndex];
        if (!parallelStep) {
          continue;
        }

        const result = (await executeAdvancedStep(
          parallelStep,
          request,
          executeSimpleStep,
          allWorkflows
        )) as Result<string>;
        results.push({ step: parallelStep, result });

        if (step.failFast && !result.ok) {
          await logger(
            `Parallel step '${step.id}': step '${parallelStep.id}' failed, failFast enabled`
          );
        }
      }
    })();
    executing.push(promise);
  }

  await Promise.all(executing);

  // Check results
  const failures = results.filter((r) => !r.result.ok);
  if (failures.length > 0) {
    const errorMessages = failures
      .map((f) => {
        const error = (f.result as { error?: Error }).error;
        return `Step '${f.step.id}': ${error?.message || "Unknown error"}`;
      })
      .join("; ");
    return err(
      new Error(
        `Parallel step '${step.id}' had ${failures.length} failure(s): ${errorMessages}`
      )
    );
  }

  return ok(
    `Parallel step '${step.id}' completed successfully (${results.length} step(s))`
  );
}
