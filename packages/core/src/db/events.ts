// Use any type to avoid importing from bun during bundling
type SQL = any;

import { err, ok, type Result } from "@openfarm/result";
import type { WorkflowEvent, WorkflowEventType } from "../types/events";
import { parseJson, toJson } from "./utils";

/**
 * Interface for database row representation of a workflow event
 */
interface WorkflowEventRow {
  id: string;
  execution_id: string;
  event_type: string;
  event_data: string;
  timestamp: string;
  sequence_number: number;
  metadata: string | null;
}

/**
 * Options for querying events
 */
export interface GetEventsOptions {
  eventType?: WorkflowEventType;
  limit?: number;
  offset?: number;
  fromTimestamp?: string;
  toTimestamp?: string;
}

/**
 * Adds a workflow event to the database.
 * This function automatically assigns a sequence number based on existing events for the execution.
 *
 * @param db - The SQL database instance
 * @param event - The workflow event to add
 * @param existingTransaction - Optional existing transaction to use
 * @returns Result indicating success or failure
 *
 * @example
 * ```typescript
 * const event: WorkflowStartedEvent = {
 *   id: uuidv4(),
 *   executionId: 'exec-123',
 *   eventType: 'workflow.started',
 *   timestamp: new Date().toISOString(),
 *   sequenceNumber: 0,
 *   eventData: { ... }
 * };
 * const result = await addWorkflowEvent(db, event);
 * if (result.ok) {
 *   console.log('Event added successfully');
 * }
 * ```
 */
export async function addWorkflowEvent(
  db: SQL,
  event: WorkflowEvent,
  existingTransaction?: SQL
): Promise<Result<void>> {
  try {
    const executeInTransaction = async (tx: SQL) => {
      // Get the current max sequence number for this execution
      const existingEvents = await tx`
        SELECT MAX(sequence_number) as max_seq
        FROM workflow_events
        WHERE execution_id = ${event.executionId}
      `;
      const maxSeq =
        existingEvents &&
        Array.isArray(existingEvents) &&
        existingEvents.length > 0
          ? (existingEvents[0]?.max_seq ?? -1)
          : -1;
      const nextSequence = maxSeq + 1;

      // Ensure sequence number matches (or use calculated one)
      const finalEvent = {
        ...event,
        sequenceNumber: nextSequence,
      };

      // Use INSERT OR IGNORE to handle duplicate IDs gracefully
      // This can happen when Inngest retries a step and the same event is emitted again
      await tx`
        INSERT OR IGNORE INTO workflow_events (
          id, execution_id, event_type, event_data, timestamp, sequence_number, metadata
        ) VALUES (
          ${finalEvent.id},
          ${finalEvent.executionId},
          ${finalEvent.eventType},
          ${toJson(finalEvent.eventData)},
          ${finalEvent.timestamp},
          ${finalEvent.sequenceNumber},
          ${finalEvent.metadata ? toJson(finalEvent.metadata) : null}
        )
      `;
    };

    if (existingTransaction) {
      await executeInTransaction(existingTransaction);
    } else {
      await db.begin(async (tx: SQL) => {
        await executeInTransaction(tx);
      });
    }

    return ok(undefined);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[DB] Error in addWorkflowEvent:", errorMessage);
    return err(new Error(`Failed to add workflow event: ${errorMessage}`));
  }
}

/**
 * Retrieves all workflow events for a specific execution, ordered by sequence number.
 *
 * @param db - The SQL database instance
 * @param executionId - The execution ID to get events for
 * @param options - Optional query options
 * @returns Array of workflow events
 *
 * @example
 * ```typescript
 * const events = await getWorkflowEvents(db, 'exec-123');
 * console.log(`Found ${events.length} events`);
 * ```
 */
export async function getWorkflowEvents(
  db: SQL,
  executionId: string,
  options: GetEventsOptions = {}
): Promise<WorkflowEvent[]> {
  try {
    const {
      eventType,
      limit,
      offset = 0,
      fromTimestamp,
      toTimestamp,
    } = options;

    // Build conditions dynamically
    const conditions: string[] = ["execution_id = $1"];
    const params: unknown[] = [executionId];
    let paramIndex = 2;

    if (eventType) {
      conditions.push(`event_type = $${paramIndex}`);
      params.push(eventType);
      paramIndex++;
    }

    if (fromTimestamp) {
      conditions.push(`timestamp >= $${paramIndex}`);
      params.push(fromTimestamp);
      paramIndex++;
    }

    if (toTimestamp) {
      conditions.push(`timestamp <= $${paramIndex}`);
      params.push(toTimestamp);
      paramIndex++;
    }

    let query = `SELECT * FROM workflow_events WHERE ${conditions.join(" AND ")} ORDER BY sequence_number ASC`;

    if (limit !== undefined) {
      query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);
    }

    // Use raw query with Bun SQL
    const rows = await db.unsafe(query, params);
    const eventsArray = Array.isArray(rows) ? rows : [];

    return eventsArray.map((row: WorkflowEventRow) => {
      const eventData = parseJson<unknown>(row.event_data);
      const metadata = row.metadata
        ? parseJson<Record<string, unknown>>(row.metadata)
        : undefined;

      return {
        id: row.id,
        executionId: row.execution_id,
        eventType: row.event_type as WorkflowEventType,
        timestamp: row.timestamp,
        sequenceNumber: row.sequence_number,
        eventData: eventData as any, // Type assertion needed due to union type
        metadata,
      } as WorkflowEvent;
    });
  } catch (error) {
    console.error("[DB] Error in getWorkflowEvents:", error);
    // Fallback to simpler query if dynamic query fails
    try {
      const rows = await db`
        SELECT * FROM workflow_events
        WHERE execution_id = ${executionId}
        ORDER BY sequence_number ASC
      `;
      const eventsArray = Array.isArray(rows) ? rows : [];
      return eventsArray
        .filter((row: WorkflowEventRow) => {
          if (options.eventType && row.event_type !== options.eventType) {
            return false;
          }
          if (options.fromTimestamp && row.timestamp < options.fromTimestamp) {
            return false;
          }
          if (options.toTimestamp && row.timestamp > options.toTimestamp) {
            return false;
          }
          return true;
        })
        .slice(
          options.offset || 0,
          options.limit ? (options.offset || 0) + options.limit : undefined
        )
        .map((row: WorkflowEventRow) => {
          const eventData = parseJson<unknown>(row.event_data);
          const metadata = row.metadata
            ? parseJson<Record<string, unknown>>(row.metadata)
            : undefined;

          return {
            id: row.id,
            executionId: row.execution_id,
            eventType: row.event_type as WorkflowEventType,
            timestamp: row.timestamp,
            sequenceNumber: row.sequence_number,
            eventData: eventData as any,
            metadata,
          } as WorkflowEvent;
        });
    } catch (fallbackError) {
      console.error("[DB] Error in getWorkflowEvents fallback:", fallbackError);
      return [];
    }
  }
}

/**
 * Retrieves workflow events filtered by type across all executions.
 *
 * @param db - The SQL database instance
 * @param eventType - The event type to filter by
 * @param options - Optional query options
 * @returns Array of workflow events
 *
 * @example
 * ```typescript
 * const startedEvents = await getEventsByType(db, 'workflow.started', { limit: 100 });
 * console.log(`Found ${startedEvents.length} workflow started events`);
 * ```
 */
export async function getEventsByType(
  db: SQL,
  eventType: WorkflowEventType,
  options: Omit<GetEventsOptions, "eventType"> = {}
): Promise<WorkflowEvent[]> {
  try {
    const { limit, offset = 0, fromTimestamp, toTimestamp } = options;

    // Use simple query with template literals and filter in memory for now
    // This is simpler and more reliable than dynamic SQL construction
    const rows = await db`
      SELECT * FROM workflow_events
      WHERE event_type = ${eventType}
      ORDER BY timestamp DESC, sequence_number ASC
    `;

    const eventsArray = Array.isArray(rows) ? rows : [];

    // Apply filters and pagination
    const filtered = eventsArray.filter((row: WorkflowEventRow) => {
      if (fromTimestamp && row.timestamp < fromTimestamp) {
        return false;
      }
      if (toTimestamp && row.timestamp > toTimestamp) {
        return false;
      }
      return true;
    });

    const paginated =
      limit !== undefined
        ? filtered.slice(offset, offset + limit)
        : filtered.slice(offset);

    return paginated.map((row: WorkflowEventRow) => {
      const eventData = parseJson<unknown>(row.event_data);
      const metadata = row.metadata
        ? parseJson<Record<string, unknown>>(row.metadata)
        : undefined;

      return {
        id: row.id,
        executionId: row.execution_id,
        eventType: row.event_type as WorkflowEventType,
        timestamp: row.timestamp,
        sequenceNumber: row.sequence_number,
        eventData: eventData as any,
        metadata,
      } as WorkflowEvent;
    });
  } catch (error) {
    console.error("[DB] Error in getEventsByType:", error);
    return [];
  }
}

/**
 * Reconstructs the workflow execution state from events.
 * This is useful for debugging and replay functionality.
 *
 * @param events - Array of workflow events in sequence order
 * @returns Reconstructed state information
 *
 * @example
 * ```typescript
 * const events = await getWorkflowEvents(db, 'exec-123');
 * const state = replayEvents(events);
 * console.log(`Workflow ${state.workflowId} executed ${state.completedSteps} steps`);
 * ```
 */
export function replayEvents(events: WorkflowEvent[]): {
  executionId: string;
  workflowId?: string;
  workItemId?: string;
  jobId?: string;
  status: string;
  completedSteps: number;
  failedSteps: number;
  events: WorkflowEvent[];
  timeline: Array<{
    timestamp: string;
    eventType: WorkflowEventType;
    description: string;
  }>;
} {
  const sortedEvents = [...events].sort(
    (a, b) => a.sequenceNumber - b.sequenceNumber
  );

  let workflowId: string | undefined;
  let workItemId: string | undefined;
  let jobId: string | undefined;
  let status = "unknown";
  let completedSteps = 0;
  let failedSteps = 0;

  const timeline: Array<{
    timestamp: string;
    eventType: WorkflowEventType;
    description: string;
  }> = [];

  for (const event of sortedEvents) {
    // Extract initial context from started event
    if (event.eventType === "workflow.started") {
      workflowId = (event.eventData as any).workflowId;
      workItemId = (event.eventData as any).workItemId;
      jobId = (event.eventData as any).jobId;
      status = "running";
      timeline.push({
        timestamp: event.timestamp,
        eventType: event.eventType,
        description: `Workflow started: ${workflowId}`,
      });
    } else if (event.eventType === "step.executed") {
      const stepData = event.eventData as any;
      if (stepData.status === "completed") {
        completedSteps++;
      } else if (stepData.status === "failed") {
        failedSteps++;
      }
      timeline.push({
        timestamp: event.timestamp,
        eventType: event.eventType,
        description: `Step ${stepData.stepId} ${stepData.status}: ${stepData.action}`,
      });
    } else if (event.eventType === "workflow.completed") {
      status = "completed";
      timeline.push({
        timestamp: event.timestamp,
        eventType: event.eventType,
        description: "Workflow completed successfully",
      });
    } else if (event.eventType === "workflow.failed") {
      status = "failed";
      const failedData = event.eventData as any;
      timeline.push({
        timestamp: event.timestamp,
        eventType: event.eventType,
        description: `Workflow failed: ${failedData.errorMessage}`,
      });
    } else if (event.eventType === "workflow.cancelled") {
      status = "cancelled";
      timeline.push({
        timestamp: event.timestamp,
        eventType: event.eventType,
        description: "Workflow cancelled",
      });
    } else {
      timeline.push({
        timestamp: event.timestamp,
        eventType: event.eventType,
        description: `${event.eventType} event`,
      });
    }
  }

  return {
    executionId: sortedEvents[0]?.executionId || "",
    workflowId,
    workItemId,
    jobId,
    status,
    completedSteps,
    failedSteps,
    events: sortedEvents,
    timeline,
  };
}
