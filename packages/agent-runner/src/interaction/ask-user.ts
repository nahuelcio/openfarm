import { SYSTEM_PROMPTS } from "@openfarm/config";
import { OpenCodeConfigService } from "@openfarm/core";
import { QuestionType } from "@openfarm/core/constants/enums";
import { JobStatus, WorkflowStatus } from "@openfarm/core/constants/status";
import {
  getDb,
  getJob,
  type LowdbInstance,
  updateJob,
  updateWorkflowExecution,
} from "@openfarm/core/db";
import { v4 as uuidv4 } from "uuid";
import { llmService } from "../llm";

/**
 * Custom error thrown when a workflow should be suspended
 * instead of polling for user input
 */
export interface AskUserOptions {
  question: string;
  type?: QuestionType;
  options?: string[]; // For 'choice' type
  jobId: string;
  smart?: boolean;
  context?: string;
  // Workflow suspend/resume support
  workflowExecutionId?: string; // If provided, workflow will suspend instead of polling
  stepId?: string; // Step ID where the question is being asked
}

/**
 * Helper function for agents to ask questions to the user
 * This will pause the agent execution until the user responds
 * Refactored to receive db as dependency for better testability
 */
export const askUser = async (
  options: AskUserOptions,
  db?: LowdbInstance
): Promise<string> => {
  let {
    question,
    type = QuestionType.TEXT,
    options: choiceOptions,
    jobId,
    smart = false,
    context = "",
  } = options;

  // Use provided db or get default
  const dbInstance = db || (await getDb());

  if (smart) {
    const openCodeConfigService = dbInstance
      ? new OpenCodeConfigService(dbInstance)
      : await OpenCodeConfigService.create();

    const resolved = await openCodeConfigService.resolveModel("server");
    const apiKey = await openCodeConfigService.getProviderApiKey(
      resolved.provider,
      "server"
    );

    const result = await llmService.complete({
      prompt: `The agent is working on a task and needs help from the user.
            Current context: ${context}
            Original technical question: ${question}

            Please rephrase this question to make it clear, professional, and easy to understand for a human.
            If it's a confirmation, make sure to explain the implications.
            Respond ONLY with the rephrased question text in English.`,
      systemPrompt: SYSTEM_PROMPTS.mediator,
      provider: {
        provider: resolved.provider,
        model: resolved.model,
        apiKey: apiKey || undefined,
      },
    });

    const smartQuestion = result.text;

    if (smartQuestion) {
      question = smartQuestion;
    }
  }

  const job = await getJob(dbInstance, jobId);

  if (!job) {
    throw new Error(`Job ${jobId} not found`);
  }

  const questionId = uuidv4();
  const newQuestion = {
    id: questionId,
    question,
    type,
    options: choiceOptions || undefined,
    createdAt: new Date().toISOString(),
  };

  // If called from a workflow, atomically update both job and workflow execution
  if (options.workflowExecutionId && options.stepId) {
    // Extract to local variables for TypeScript type narrowing
    const workflowExecutionId = options.workflowExecutionId;
    const stepId = options.stepId;

    // Use a single transaction to atomically update job and workflow execution
    await dbInstance.begin(async (tx: LowdbInstance) => {
      // Update job within transaction
      const jobUpdateResult = await updateJob(
        tx,
        jobId,
        (j) => {
          const updatedJob = { ...j };
          if (!updatedJob.questions) {
            updatedJob.questions = [];
          }
          updatedJob.questions = [...updatedJob.questions, newQuestion];
          updatedJob.status = JobStatus.WAITING_FOR_USER;
          updatedJob.currentQuestionId = questionId;
          return updatedJob;
        },
        tx
      );

      if (!jobUpdateResult.ok) {
        throw new Error(
          `Failed to persist question to database: ${jobUpdateResult.error.message}`
        );
      }

      // Update workflow execution within same transaction
      const executionUpdateResult = await updateWorkflowExecution(
        tx,
        workflowExecutionId,
        (exec) => ({
          ...exec,
          status: WorkflowStatus.PAUSED,
          currentStepId: stepId,
          updatedAt: new Date().toISOString(),
        }),
        tx
      );

      if (!executionUpdateResult.ok) {
        throw new Error(
          `Failed to suspend workflow: ${executionUpdateResult.error.message}`
        );
      }
    });

    // We don't throw WorkflowSuspendError anymore.
    // With Inngest, the caller should handle the pause/resume via step.waitForEvent
    // But askUser is synchronous-like for the caller.
    // If we want to support askUser in Inngest, we should probably return a special value or handle it differently.
    // For now, let's just return a placeholder or throw a standard error that Inngest can catch if needed,
    // but ideally we should migrate askUser usage to Inngest events too.
    // Since this function is likely used by agents (Opencode/Claude Code), and they expect a string response...
    // This part is tricky. If agents use `askUser`, they block.
    // Inngest steps can't block indefinitely on a promise.

    // For now, removing the throw of WorkflowSuspendError as requested.
    // We will throw a generic error to stop execution, assuming the caller (if Inngest) handles the pause state we just wrote to DB.
    throw new Error(
      `Workflow paused for user input (Question ID: ${questionId})`
    );
  }
  // Legacy behavior: only update job (for non-workflow contexts)
  const updateResult = await updateJob(dbInstance, jobId, (j) => {
    const updatedJob = { ...j };
    if (!updatedJob.questions) {
      updatedJob.questions = [];
    }
    updatedJob.questions = [...updatedJob.questions, newQuestion];
    updatedJob.status = JobStatus.WAITING_FOR_USER;
    updatedJob.currentQuestionId = questionId;
    return updatedJob;
  });

  if (!updateResult.ok) {
    throw new Error(
      `Failed to persist question to database: ${updateResult.error.message}`
    );
  }

  // Legacy polling behavior (for non-workflow contexts)
  // Poll for answer (check every 2 seconds, timeout after 1 hour)
  const startTime = Date.now();
  const timeout = 60 * 60 * 1000; // 1 hour
  const pollInterval = 2000; // 2 seconds

  while (Date.now() - startTime < timeout) {
    await new Promise((resolve) => setTimeout(resolve, pollInterval));

    const dbCheck = await getDb();
    const jobCheck = await getJob(dbCheck, jobId);

    if (jobCheck) {
      const questionCheck = jobCheck.questions?.find(
        (q) => q.id === questionId
      );
      if (questionCheck?.answeredAt && questionCheck.answer) {
        return questionCheck.answer;
      }

      // If job was cancelled or failed, throw error
      if (jobCheck.status === JobStatus.FAILED) {
        throw new Error(
          "Job was cancelled or failed while waiting for user response"
        );
      }
    }
  }

  throw new Error("Timeout waiting for user response");
};
