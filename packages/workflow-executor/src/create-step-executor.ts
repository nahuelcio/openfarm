/**
 * Step Executor Factory
 *
 * Creates a complete StepExecutor that handles all step types and actions.
 * This is the centralized dispatcher for workflow step execution.
 */

import { StepType } from "@openfarm/core/constants";
import { err, type Result } from "@openfarm/result";
import type {
  StepExecutionRequest as EngineStepExecutionRequest,
  StepExecutor,
} from "@openfarm/workflow-engine";
import { executeAgentAction } from "./executors/agent-executor";
import { executeCommandAction } from "./executors/command-executor";
import { executeDetectionAction } from "./executors/detection-executor";
import { executeGitAction } from "./executors/git-executor";
import { executePlanningActionRouter } from "./executors/planning-executor";
import { executePlatformAction } from "./executors/platform-executor";
import { executePromptAction } from "./executors/prompt-executor";
import { executeReviewAction } from "./executors/review-executor";
import { executeSessionAction } from "./executors/session-executor";
import { executeTaskAction } from "./executors/task-executor";
import type { StepExecutionRequest } from "./types";

function normalizeStepResults(
  stepResults: unknown[]
): Array<{ stepId: string; result?: string }> {
  return stepResults.flatMap((stepResult) => {
    if (!(stepResult && typeof stepResult === "object")) {
      return [];
    }

    const record = stepResult as Record<string, unknown>;
    const stepId = record.stepId;
    if (typeof stepId !== "string") {
      return [];
    }

    const result =
      typeof record.result === "string" ? record.result : undefined;
    return [{ stepId, result }];
  });
}

/**
 * Creates a complete StepExecutor that dispatches to all action executors
 */
export function createStepExecutor(): StepExecutor {
  return {
    execute: async (request: EngineStepExecutionRequest, context) => {
      const { stepType, action } = request;

      // Build full request with context
      const fullRequest: StepExecutionRequest = {
        step: {
          id: request.stepId,
          type: stepType as StepType,
          action,
          config: request.params || {},
        },
        context: context.context,
        logger: context.log.info.bind(context.log),
        flags: {
          previewMode: context.previewMode,
        },
        services: {},
        stepResults: normalizeStepResults(context.stepResults),
      };

      // Dispatch based on step type
      let result: Result<unknown>;

      switch (stepType) {
        case StepType.GIT:
          result = await executeGitAction(fullRequest);
          break;

        case StepType.CODE:
        case StepType.LLM:
          result = await executeAgentAction(fullRequest);
          break;

        case StepType.COMMAND:
          result = await executeCommandAction(fullRequest);
          break;

        case StepType.PLATFORM:
          result = await executePlatformAction(fullRequest);
          break;

        case StepType.PLANNING:
          result = await executePlanningActionRouter(fullRequest);
          break;

        case StepType.REVIEW:
          result = await executeReviewAction(fullRequest);
          break;

        case StepType.TASK:
          result = await executeTaskAction(fullRequest);
          break;

        case StepType.PROMPT:
          result = await executePromptAction(fullRequest);
          break;

        case StepType.DETECTION:
          result = await executeDetectionAction(fullRequest);
          break;

        case StepType.SESSION:
          result = await executeSessionAction(fullRequest);
          break;

        case StepType.HUMAN:
          // Human steps are handled by the workflow engine's approval handler
          result = err(
            new Error(
              "Human steps should be handled by the approval handler, not the step executor"
            )
          );
          break;

        case StepType.CONDITIONAL:
        case StepType.LOOP:
        case StepType.PARALLEL:
          // Advanced steps are handled by the workflow engine
          result = err(
            new Error(
              "Advanced steps (conditional, loop, parallel) should be handled by the workflow engine, not the step executor"
            )
          );
          break;

        default:
          result = err(new Error(`Unknown step type: ${stepType}`));
      }

      // Convert Result to StepExecutionResult
      if (result.ok) {
        return {
          success: true,
          value: result.value,
        };
      }

      return {
        success: false,
        error: result.error,
      };
    },
  };
}
