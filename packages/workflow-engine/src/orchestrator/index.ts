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
} from "./context-resolver";
export {
  cleanupWorkflowResources,
  finishWorkflowExecution,
  handleCancellation,
} from "./lifecycle-handlers";
export {
  type RepositorySetupResult,
  setupRepository,
} from "./repository-manager";
export { executeWorkflow } from "./workflow-orchestrator";
