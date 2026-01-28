/**
 * Orchestrator exports
 *
 * Core classes and utilities for workflow orchestration:
 * - executeWorkflow: Main execution loop
 * - setupWorkflowContext: Workflow resolution and variable evaluation
 * - setupRepository: Repository authentication and setup
 */

export {
  type ContextSetupResult,
  setupWorkflowContext,
} from "./ContextResolver";
export {
  cleanupWorkflowResources,
  finishWorkflowExecution,
  handleCancellation,
} from "./LifecycleHandlers";
export {
  type RepositorySetupResult,
  setupRepository,
} from "./RepositoryManager";
export { executeWorkflow } from "./WorkflowOrchestrator";
