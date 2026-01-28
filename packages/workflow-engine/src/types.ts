/**
 * Core types for workflow engine
 *
 * These abstractions allow the engine to be framework-agnostic:
 * - EventBus: Abstract event emission (DB, Inngest, SSE handled by caller)
 * - Logger: Abstract logging (console, SSE, file handled by caller)
 * - ApprovalHandler: Abstract human approval (Inngest waitForEvent vs other mechanisms)
 */

import type { WorkflowContext } from "@openfarm/agent-runner";
import type {
  AgentConfiguration,
  Workflow,
  WorkflowEvent,
} from "@openfarm/core";

/**
 * Abstract event bus for emitting workflow events
 * Server implementation handles DB persistence, Inngest routing, SSE broadcast
 */
export interface EventBus {
  emit(event: WorkflowEvent): Promise<void>;
}

/**
 * Abstract logger with optional streaming support
 * Server implementation adds SSE broadcast, file writes, etc.
 */
export interface WorkflowLogger {
  info(message: string): Promise<void>;
  error(message: string): Promise<void>;
  debug(message: string): Promise<void>;
}

/**
 * Handler for human approval steps (framework abstraction)
 * Server implementation uses Inngest waitForEvent
 */
export interface ApprovalHandler {
  waitForApproval(
    stepId: string,
    executionId: string,
    options?: { timeout?: string }
  ): Promise<{ approved: boolean; reason?: string }>;
}

/**
 * Configuration for workflow engine
 * All dependencies are injected - allows testing without Inngest/SSE
 */
export interface WorkflowEngineConfig {
  db: unknown; // Database instance (from @openfarm/core/db)
  eventBus: EventBus; // Event emission
  logger: WorkflowLogger; // Logging with optional streaming
  approvalHandler: ApprovalHandler; // Human approval mechanism
  stepExecutor: StepExecutor; // Step execution dispatcher
  errorHandler: ErrorHandler; // Error processing
}

/**
 * Configuration for step execution
 */
export interface StepExecutionConfig {
  jobId: string;
  previewMode: boolean;
  agentConfig: AgentConfiguration;
  allWorkflows: unknown[];
}

/**
 * Request to execute a workflow
 */
export interface WorkflowExecutionRequest {
  executionId: string;
  workflowId: string;
  workItemId: string;
  jobId: string;
  context: WorkflowContext;
  agentConfig: unknown;
  previewMode: boolean;
}

/**
 * Result of workflow execution
 */
export interface WorkflowExecutionResult {
  success: boolean;
  executionId: string;
  completedSteps: number;
  totalSteps: number;
  error?: string;
  result?: unknown;
}

/**
 * Abstract step executor (dispatcher pattern)
 * Implementation handles git, agent code, platform operations, etc.
 */
export interface StepExecutor {
  execute(
    request: StepExecutionRequest,
    context: ExecutionContext
  ): Promise<StepExecutionResult>;
}

/**
 * Request for step execution
 */
export interface StepExecutionRequest {
  stepId: string;
  stepType: string;
  action: string;
  params?: Record<string, unknown>;
}

/**
 * Result of step execution
 */
export interface StepExecutionResult {
  success: boolean;
  value?: unknown;
  error?: Error;
}

/**
 * Context available during step execution
 */
export interface ExecutionContext {
  workflow: Workflow;
  context: WorkflowContext;
  jobId: string;
  previewMode: boolean;
  agentConfig: AgentConfiguration;
  allWorkflows: Workflow[];
  log: WorkflowLogger;
  stepResults: unknown[];
}

/**
 * Abstract error handler
 */
export interface ErrorHandler {
  handle(
    error: unknown,
    context: { executionId: string; stepId?: string; stage: string }
  ): Promise<void>;
}

/**
 * Step status update options
 */
export interface UpdateStepStatusOptions {
  executionId: string;
  stepId: string;
  status: "RUNNING" | "COMPLETED" | "FAILED";
  result?: unknown;
  error?: Error;
  startedAt?: string;
}

/**
 * Step event data
 */
export interface StepEventData {
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
