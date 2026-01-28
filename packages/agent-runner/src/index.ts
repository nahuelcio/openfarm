// Agent Runner - Core exports for OpenFarm

// Engine factory and types
export {
  type CodingEngineFactoryOptions,
  createCodingEngine,
} from "./engines/factory";

// Interaction
export { type AskUserOptions, askUser } from "./interaction/ask-user";

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