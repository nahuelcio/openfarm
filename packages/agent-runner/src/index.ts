// Agent Runner - Core exports for OpenFarm

// Re-export from core for convenience
export { defaultFileSystem } from "@openfarm/core/db/connection";
// Engine factory and types
export {
  type CodingEngineFactoryOptions,
  createCodingEngine,
} from "./engines/factory";
// Workflow Engine
export type { WorkflowContext } from "./engines/workflow/types";
// Interaction
export { type AskUserOptions, askUser } from "./interaction/ask-user";
// LLM Service
export { LlmError, LlmService, llmService } from "./llm/llm-service";
// Operations - Auth
export { authenticateRepository } from "./operations/auth/authenticate";
// Operations - Git
export { ensureMainRepo } from "./operations/git/ensure";
export {
  createWorktree,
  removeWorktree,
} from "./operations/git/worktree";
// Orchestration
export type {
  ExecuteOptions,
  ExecuteResult,
  Orchestrator,
  WorkspaceInfo,
  WorkspaceProvisionConfig,
} from "./orchestration/orchestrator";
// Services - OpenCode
export {
  type AuthStatus,
  type DeviceCode,
  getOpenCodeAuthAdapter,
  type OAuthCallbackResult,
  type OAuthCompletionCallback,
  OpenCodeAuthAdapter,
  type OpenCodeAuthAdapterConfig,
  resetOpenCodeAuthAdapter,
} from "./services/opencode-auth";
export {
  getOpenCodeServerStatus,
  getOpenCodeServerUrl,
  startOpenCodeServer,
  stopOpenCodeServer,
} from "./services/opencode-server";
// Utils
export { CircuitBreaker } from "./utils/circuit-breaker";
