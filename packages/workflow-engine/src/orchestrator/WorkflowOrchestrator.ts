/**
 * Workflow Orchestrator
 *
 * Core execution engine that orchestrates step-by-step workflow execution.
 * Framework-agnostic: doesn't know about Inngest, SSE, or HTTP concerns.
 *
 * Responsibilities:
 * - Execute workflow steps in sequence
 * - Manage step lifecycle (RUNNING → COMPLETED/FAILED)
 * - Reload step results and context between steps
 * - Handle approvals, errors, cancellations
 * - Emit events for observability
 */

import type { WorkflowContext } from "@openfarm/agent-runner";
import { getDb, getWorkflowExecution, getWorkflows } from "@openfarm/core/db";
import type {
  ExtendedWorkflowStep,
  Workflow,
} from "@openfarm/core/types/workflow";
import type {
  ApprovalHandler,
  EventBus,
  ExecutionContext,
  StepExecutionConfig,
  StepExecutor,
  WorkflowEngineConfig,
  WorkflowExecutionRequest,
  WorkflowExecutionResult,
  WorkflowLogger,
} from "../types";

/**
 * Execute a complete workflow from start to finish
 *
 * This is the main entry point. It orchestrates the entire workflow lifecycle:
 * 1. Load workflow and all related data
 * 2. Execute each step in sequence
 * 3. Manage step status transitions
 * 4. Emit events for observability
 * 5. Handle errors and cancellations
 */
export async function executeWorkflow(
  request: WorkflowExecutionRequest,
  config: WorkflowEngineConfig
): Promise<WorkflowExecutionResult> {
  const { executionId, jobId, context, previewMode, agentConfig } = request;
  const { logger, eventBus, stepExecutor, errorHandler } = config;

  const logSteps = process.env.WORKFLOW_ORCHESTRATOR_LOG_STEPS === "true";
  const logStepResults =
    process.env.WORKFLOW_ORCHESTRATOR_LOG_STEP_RESULTS === "true";

  try {
    // Load workflow data
    const database = await getDb();
    const allWorkflows = await getWorkflows(database);

    // Find the target workflow
    const workflow = allWorkflows.find((w) => w.id === request.workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${request.workflowId}`);
    }

    // Emit workflow started event
    await eventBus.emit({
      id: `evt-${Date.now()}`,
      executionId,
      eventType: "workflow.started",
      timestamp: new Date().toISOString(),
      sequenceNumber: 0,
      eventData: {
        workflowId: workflow.id,
        workItemId: request.workItemId,
        jobId,
        previewMode,
      },
    });

    // Execute each step
    let completedSteps = 0;
    const stepExecutionConfig: StepExecutionConfig = {
      jobId,
      previewMode,
      agentConfig: agentConfig as StepExecutionConfig["agentConfig"],
      allWorkflows,
    };

    for (const workflowStep of workflow.steps) {
      try {
        await executeWorkflowStep(
          workflowStep,
          context,
          workflow,
          stepExecutionConfig,
          logger,
          eventBus,
          stepExecutor,
          config.approvalHandler,
          logSteps,
          logStepResults,
          allWorkflows,
          database,
          executionId
        );

        completedSteps++;
      } catch (stepError) {
        // Handle step error
        await errorHandler.handle(stepError, {
          executionId,
          stepId: workflowStep.id,
          stage: "step-execution",
        });

        // Emit workflow failed event
        await eventBus.emit({
          id: `evt-${Date.now()}`,
          executionId,
          eventType: "workflow.failed",
          timestamp: new Date().toISOString(),
          sequenceNumber: 0,
          eventData: {
            error:
              stepError instanceof Error
                ? stepError.message
                : String(stepError),
            errorMessage:
              stepError instanceof Error
                ? stepError.message
                : String(stepError),
            failedAtStepId: workflowStep.id,
            completedSteps,
            totalSteps: workflow.steps.length,
          },
        });

        throw stepError;
      }
    }

    // Emit workflow completed event
    await eventBus.emit({
      id: `evt-${Date.now()}`,
      executionId,
      eventType: "workflow.completed",
      timestamp: new Date().toISOString(),
      sequenceNumber: 0,
      eventData: {
        result: "success",
        completedSteps,
        totalSteps: workflow.steps.length,
      },
    });

    return {
      success: true,
      executionId,
      completedSteps,
      totalSteps: workflow.steps.length,
    };
  } catch (error) {
    await logger.error(
      `Workflow execution failed: ${error instanceof Error ? error.message : String(error)}`
    );

    return {
      success: false,
      executionId,
      completedSteps: 0,
      totalSteps: 0,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Execute a single workflow step with full lifecycle management
 */
async function executeWorkflowStep(
  step: ExtendedWorkflowStep,
  context: WorkflowContext,
  workflow: Workflow,
  stepConfig: StepExecutionConfig,
  logger: WorkflowLogger,
  eventBus: EventBus,
  stepExecutor: StepExecutor,
  approvalHandler: ApprovalHandler,
  logSteps: boolean,
  logStepResults: boolean,
  allWorkflows: Workflow[],
  database: unknown,
  executionId: string
): Promise<void> {
  const { jobId, previewMode, agentConfig } = stepConfig;

  // Reload current execution state before step
  const currentExecution = await getWorkflowExecution(
    database as any,
    executionId
  );
  const stepResults = currentExecution?.stepResults || [];

  // Reload branchName if updated by previous step
  const executionBranchName = (
    currentExecution as { branchName?: string } | undefined
  )?.branchName;
  if (executionBranchName && executionBranchName !== context.branchName) {
    if (logSteps) {
      await logger.debug(
        `Reloaded branchName from execution: '${context.branchName}' -> '${executionBranchName}'`
      );
    }
    context.branchName = executionBranchName;
  }

  if (logSteps) {
    await logger.debug(
      `Executing step: ${step.id} (${step.action}), reloaded ${stepResults.length} stepResults`
    );
  }

  if (logStepResults && stepResults.length > 0) {
    for (const sr of stepResults) {
      const stepResult = sr as {
        stepId?: string;
        result?: string;
        status?: string;
      };
      const hasResult = !!stepResult.result;
      const resultLength = stepResult.result?.length || 0;
      await logger.debug(
        `StepResult: stepId=${stepResult.stepId}, status=${stepResult.status}, hasResult=${hasResult}, resultLength=${resultLength}`
      );
    }
  }

  // Handle approval steps specially
  if (step.action === "human.approval") {
    await handleApprovalStep(
      step,
      context,
      jobId,
      approvalHandler,
      logger,
      eventBus,
      executionId
    );
    return;
  }

  const startedAt = new Date().toISOString();
  const startTime = Date.now();

  try {
    // Mark step as running
    await logger.info(`Starting step: ${step.id} (${step.action})`);

    // Build execution context
    const executionContext: ExecutionContext = {
      workflow,
      context,
      jobId,
      previewMode,
      agentConfig: agentConfig as any,
      allWorkflows,
      log: logger,
      stepResults,
    };

    // Execute step
    const result = await stepExecutor.execute(
      {
        stepId: step.id,
        stepType: step.type || "unknown",
        action: step.action || "",
        params: step.config || {},
      },
      executionContext
    );

    if (!result.success) {
      throw new Error(
        `Step execution failed: ${result.error?.message || "Unknown error"}`
      );
    }

    const completedAt = new Date().toISOString();
    const durationMs = Date.now() - startTime;

    // Emit step completed event
    await eventBus.emit({
      id: `evt-${Date.now()}`,
      executionId,
      eventType: "step.executed",
      timestamp: completedAt,
      sequenceNumber: 0,
      eventData: {
        stepId: step.id,
        stepType: step.type || "unknown",
        action: step.action || "",
        status: "completed" as const,
        result: result.value ? String(result.value) : undefined,
        startedAt,
        completedAt,
        durationMs,
      },
    });

    await logger.info(
      `Completed step: ${step.id} (${step.action}) in ${durationMs}ms`
    );
  } catch (error) {
    const completedAt = new Date().toISOString();
    const durationMs = Date.now() - startTime;

    // Emit step failed event
    await eventBus.emit({
      id: `evt-${Date.now()}`,
      executionId,
      eventType: "step.executed",
      timestamp: completedAt,
      sequenceNumber: 0,
      eventData: {
        stepId: step.id,
        stepType: step.type || "unknown",
        action: step.action || "",
        status: "failed" as const,
        error: error instanceof Error ? error.message : String(error),
        startedAt,
        completedAt,
        durationMs,
      },
    });

    // Check if step allows continuation on error
    if (step.continueOnError) {
      await logger.error(`Step failed but continueOnError is set: ${step.id}`);
      return;
    }

    throw error;
  }
}

/**
 * Handle human approval workflow steps
 */
async function handleApprovalStep(
  step: ExtendedWorkflowStep,
  context: WorkflowContext,
  jobId: string,
  approvalHandler: ApprovalHandler,
  logger: WorkflowLogger,
  eventBus: EventBus,
  executionId: string
): Promise<void> {
  try {
    await logger.info(`Waiting for approval: ${step.id}`);

    // Emit workflow paused event
    await eventBus.emit({
      id: `evt-${Date.now()}`,
      executionId,
      eventType: "workflow.paused",
      timestamp: new Date().toISOString(),
      sequenceNumber: 0,
      eventData: {
        reason: "Waiting for human approval",
        waitingFor: step.id,
        pausedAtStepId: step.id,
      },
    });

    // Wait for approval (delegated to handler implementation)
    const approval = await approvalHandler.waitForApproval(
      step.id,
      executionId,
      {
        timeout: "7d",
      }
    );

    if (!approval.approved) {
      throw new Error(
        `Approval rejected: ${approval.reason || "No reason provided"}`
      );
    }

    // Emit workflow resumed event
    await eventBus.emit({
      id: `evt-${Date.now()}`,
      executionId,
      eventType: "workflow.resumed",
      timestamp: new Date().toISOString(),
      sequenceNumber: 0,
      eventData: {
        resumedFromStepId: step.id,
      },
    });

    await logger.info(`Approval granted: ${step.id}`);
  } catch (error) {
    await logger.error(
      `Approval step failed: ${error instanceof Error ? error.message : String(error)}`
    );
    throw error;
  }
}
