// Agent Runner - Core exports for OpenFarm

// Engine factory and types
export {
  createCodingEngine,
  type CodingEngineFactoryOptions,
} from "./engines/factory";

// Orchestration
export {
  type Orchestrator,
  type WorkspaceProvisionConfig,
  type ExecuteOptions,
  type ExecuteResult,
  type WorkspaceInfo,
} from "./orchestration/orchestrator";

// LLM Service
export { LlmService, LlmError, llmService } from "./llm/llm-service";

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
  startOpenCodeServer,
  stopOpenCodeServer,
  getOpenCodeServerStatus,
  getOpenCodeServerUrl,
} from "./services/opencode-server";

// Utils
export { CircuitBreaker } from "./utils/circuit-breaker";

// Interaction
export { askUser, type AskUserOptions } from "./interaction/ask-user";