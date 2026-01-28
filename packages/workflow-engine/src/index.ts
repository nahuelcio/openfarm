/**
 * @openfarm/workflow-engine
 *
 * Core workflow orchestration engine that:
 * - Executes workflows step-by-step with lifecycle management
 * - Emits events for real-time processing and event sourcing
 * - Handles errors, cancellation, and approval workflows
 * - Supports both local and Kubernetes pod execution
 *
 * This package provides pure business logic for workflow orchestration.
 * The server (Elysia/Inngest) injects infrastructure like SSE, logging, and execution factories.
 *
 * Framework-agnostic: knows nothing about Inngest, SSE, or HTTP.
 * All infrastructure concerns are injected via interfaces.
 */

// Error handling
export {
  failure,
  fromSerializableError,
  isRetryableError,
  type OperationResult,
  type SerializableError,
  success,
  toSerializableError,
  WorkflowError,
  WorkflowErrors,
  WorkflowErrorType,
  wrapOperation,
} from "./errors";
// Event system
export {
  createStepExecutedEvent,
  createWorkflowCompletedEvent,
  createWorkflowFailedEvent,
  createWorkflowPausedEvent,
  createWorkflowResumedEvent,
  createWorkflowStartedEvent,
  DatabaseEventBus,
  type EventBus,
  InMemoryEventBus,
} from "./events";
// Main orchestrator
export {
  cleanupWorkflowResources,
  executeWorkflow,
  finishWorkflowExecution,
  handleCancellation,
  setupRepository,
  setupWorkflowContext,
} from "./orchestrator";
// Core types and interfaces
export type {
  ApprovalHandler,
  ErrorHandler,
  ExecutionContext,
  StepEventData,
  StepExecutionConfig,
  StepExecutionRequest,
  StepExecutionResult,
  StepExecutor,
  UpdateStepStatusOptions,
  WorkflowEngineConfig,
  WorkflowExecutionRequest,
  WorkflowExecutionResult,
  WorkflowLogger,
} from "./types";
