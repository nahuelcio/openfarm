/**
 * Event Sourcing Types for Workflow Execution
 *
 * This module defines the event types used for event sourcing in workflow executions.
 * Events are immutable records of what happened during a workflow execution.
 */

/**
 * Base interface for all workflow events
 */
export interface WorkflowEventBase {
  id: string;
  executionId: string;
  timestamp: string;
  sequenceNumber: number;
  metadata?: Record<string, unknown>;
}

/**
 * Event emitted when a workflow execution starts
 */
export interface WorkflowStartedEvent extends WorkflowEventBase {
  eventType: "workflow.started";
  eventData: {
    workflowId: string;
    workItemId: string;
    jobId: string;
    previewMode: boolean;
  };
}

/**
 * Event emitted when a workflow execution completes successfully
 */
export interface WorkflowCompletedEvent extends WorkflowEventBase {
  eventType: "workflow.completed";
  eventData: {
    result?: string;
    executionTimeSeconds?: number;
    completedSteps: number;
    totalSteps: number;
  };
}

/**
 * Event emitted when a workflow execution fails
 */
export interface WorkflowFailedEvent extends WorkflowEventBase {
  eventType: "workflow.failed";
  eventData: {
    error: string;
    errorMessage: string;
    failedAtStepId?: string;
    completedSteps: number;
    totalSteps: number;
  };
}

/**
 * Event emitted when a workflow step is executed
 */
export interface StepExecutedEvent extends WorkflowEventBase {
  eventType: "step.executed";
  eventData: {
    stepId: string;
    stepType: string;
    action: string;
    status: "completed" | "failed";
    result?: string;
    error?: string;
    startedAt: string;
    completedAt: string;
    durationMs: number;
  };
}

/**
 * Event emitted when an agent makes an important decision
 */
export interface AgentDecisionEvent extends WorkflowEventBase {
  eventType: "agent.decision";
  eventData: {
    decisionType: string;
    context: string;
    decision: unknown;
    reasoning?: string;
    stepId?: string;
  };
}

/**
 * Event emitted when a workflow is paused (e.g., waiting for approval)
 */
export interface WorkflowPausedEvent extends WorkflowEventBase {
  eventType: "workflow.paused";
  eventData: {
    reason: string;
    waitingFor?: string;
    pausedAtStepId?: string;
  };
}

/**
 * Event emitted when a workflow is resumed after being paused
 */
export interface WorkflowResumedEvent extends WorkflowEventBase {
  eventType: "workflow.resumed";
  eventData: {
    resumeJobId?: string;
    resumedFromStepId?: string;
  };
}

/**
 * Event emitted when a workflow is cancelled
 */
export interface WorkflowCancelledEvent extends WorkflowEventBase {
  eventType: "workflow.cancelled";
  eventData: {
    cancelledBy?: string;
    cancelledAtStepId?: string;
    reason?: string;
  };
}

/**
 * Union type of all possible workflow events
 */
export type WorkflowEvent =
  | WorkflowStartedEvent
  | WorkflowCompletedEvent
  | WorkflowFailedEvent
  | StepExecutedEvent
  | AgentDecisionEvent
  | WorkflowPausedEvent
  | WorkflowResumedEvent
  | WorkflowCancelledEvent;

/**
 * Event type strings (for type checking and filtering)
 */
export type WorkflowEventType = WorkflowEvent["eventType"];

/**
 * Helper type to extract event data type from event type
 */
export type EventDataByType<T extends WorkflowEventType> = Extract<
  WorkflowEvent,
  { eventType: T }
>["eventData"];
