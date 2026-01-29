/**
 * Event Bus System
 *
 * Abstract event emission for workflow events.
 * Implementations handle persistence, broadcasting, and routing.
 *
 * Architecture:
 * - EventBus interface: abstract contract
 * - DatabaseEventBus: persists to database only
 * - InMemoryEventBus: for testing
 *
 * Server wraps DatabaseEventBus to add:
 * - Inngest routing
 * - SSE broadcasting
 */

import type { WorkflowEvent } from "@openfarm/core";
import { addWorkflowEvent, getDb } from "@openfarm/core/db";
import type { EventBus } from "../types";

/**
 * In-memory event bus for testing
 */
export class InMemoryEventBus implements EventBus {
  private events: WorkflowEvent[] = [];

  async emit(event: WorkflowEvent): Promise<void> {
    this.events.push(event);
  }

  getEvents(): WorkflowEvent[] {
    return this.events;
  }

  clear(): void {
    this.events = [];
  }
}

/**
 * Event bus that persists events to database for event sourcing
 * This is the base implementation. Server wraps it to add Inngest/SSE.
 */
export class DatabaseEventBus implements EventBus {
  async emit(event: WorkflowEvent): Promise<void> {
    try {
      const db = await getDb();

      const result = await addWorkflowEvent(db, event);

      if (!result.ok) {
        console.error(
          `[EventBus] Failed to save event ${event.id} to database:`,
          result.error
        );
        // Continue - event sourcing should be non-blocking
      }
    } catch (error) {
      console.error("[EventBus] Error emitting event:", error);
      // Continue - event sourcing should never block workflow execution
    }
  }
}

/**
 * Event helper: Create workflow.started event
 */
export function createWorkflowStartedEvent(
  executionId: string,
  data: {
    workflowId: string;
    workItemId: string;
    jobId: string;
    previewMode: boolean;
  }
): WorkflowEvent {
  return {
    id: `evt-${Date.now()}-${Math.random()}`,
    executionId,
    eventType: "workflow.started",
    timestamp: new Date().toISOString(),
    sequenceNumber: 0,
    eventData: data,
  };
}

/**
 * Event helper: Create workflow.completed event
 */
export function createWorkflowCompletedEvent(
  executionId: string,
  data: {
    result?: string;
    executionTimeSeconds?: number;
    completedSteps: number;
    totalSteps: number;
  }
): WorkflowEvent {
  return {
    id: `evt-${Date.now()}-${Math.random()}`,
    executionId,
    eventType: "workflow.completed",
    timestamp: new Date().toISOString(),
    sequenceNumber: 0,
    eventData: data,
  };
}

/**
 * Event helper: Create workflow.failed event
 */
export function createWorkflowFailedEvent(
  executionId: string,
  data: {
    error: string;
    errorMessage: string;
    failedAtStepId?: string;
    completedSteps: number;
    totalSteps: number;
  }
): WorkflowEvent {
  return {
    id: `evt-${Date.now()}-${Math.random()}`,
    executionId,
    eventType: "workflow.failed",
    timestamp: new Date().toISOString(),
    sequenceNumber: 0,
    eventData: data,
  };
}

/**
 * Event helper: Create step.executed event
 */
export function createStepExecutedEvent(
  executionId: string,
  data: {
    stepId: string;
    stepType: string;
    action: string;
    status: "completed" | "failed";
    result?: string;
    error?: string;
    startedAt: string;
    completedAt: string;
    durationMs: number;
  }
): WorkflowEvent {
  return {
    id: `evt-${Date.now()}-${Math.random()}`,
    executionId,
    eventType: "step.executed",
    timestamp: new Date().toISOString(),
    sequenceNumber: 0,
    eventData: data,
  };
}

/**
 * Event helper: Create workflow.paused event
 */
export function createWorkflowPausedEvent(
  executionId: string,
  data: {
    reason: string;
    waitingFor?: string;
    pausedAtStepId?: string;
  }
): WorkflowEvent {
  return {
    id: `evt-${Date.now()}-${Math.random()}`,
    executionId,
    eventType: "workflow.paused",
    timestamp: new Date().toISOString(),
    sequenceNumber: 0,
    eventData: data,
  };
}

/**
 * Event helper: Create workflow.resumed event
 */
export function createWorkflowResumedEvent(
  executionId: string,
  data: {
    resumeJobId?: string;
    resumedFromStepId?: string;
  }
): WorkflowEvent {
  return {
    id: `evt-${Date.now()}-${Math.random()}`,
    executionId,
    eventType: "workflow.resumed",
    timestamp: new Date().toISOString(),
    sequenceNumber: 0,
    eventData: data,
  };
}
