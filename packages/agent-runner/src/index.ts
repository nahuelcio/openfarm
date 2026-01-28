// Agent Runner - Core exports for OpenFarm

// Engine factory and types
export {
  createCodingEngine,
  type CodingEngineFactoryOptions,
} from "./engines/factory";

// Interaction
export { askUser, type AskUserOptions } from "./interaction/ask-user";

// LLM Service
export { LlmError, LlmService, llmService } from "./llm/llm-service";

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
  OpenCodeAuthAdapter,
  getOpenCodeAuthAdapter,
  resetOpenCodeAuthAdapter,
  type AuthStatus,
  type DeviceCode,
  type OAuthCallbackResult,
  type OAuthCompletionCallback,
  type OpenCodeAuthAdapterConfig,
} from "./services/opencode-auth";

export {
  getOpenCodeServerStatus,
  getOpenCodeServerUrl,
  startOpenCodeServer,
  stopOpenCodeServer,
} from "./services/opencode-server";

// Utils
export { CircuitBreaker } from "./utils/circuit-breaker";

