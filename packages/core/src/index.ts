// @openfarm/core - Core package for Minions Farm
// Re-exports from shared packages + core-specific functionality

// Logger (from @openfarm/logger)
export { createLogger, logger } from "@openfarm/logger";
// Result type y utilidades (from @openfarm/result)
export {
  err,
  flatMap,
  map,
  mapError,
  match,
  ok,
  pipe,
  type Result,
  tap,
  unwrap,
  unwrapOr,
} from "@openfarm/result";
// Utils (from @openfarm/utils)
export {
  chunk,
  filterAsync,
  mapAsync,
  parallel,
  type RetryConfig,
  retry,
  sequence,
  withTimeout,
} from "@openfarm/utils";

// Constants
export { StepAction, StepType } from "./constants/actions";
export {
  BranchPrefix,
  ChatRole,
  MaxRoundsBehavior,
  OpencodeEventType,
  QuestionType,
  WorkItemType,
} from "./constants/enums";
export {
  DEFAULT_HOSTS,
  DEFAULT_PORTS,
  DEFAULT_TIMEOUTS,
} from "./constants/ports";
export { JobStatus, WorkflowStatus } from "./constants/status";
// Services
export { AgentConfigService } from "./services/agent-config-service";
export { OpenCodeConfigService } from "./services/opencode-config";
export { testProviderConnection } from "./services/provider-tester";
// Types
export type { ChangesSummary } from "./types/adapters";
export type { ChatMessage, ChatSession } from "./types/chat";
export type {
  AgentConfig,
  AgentConfiguration,
  AgentConfigurationRules,
  Bug,
  WorkItem,
} from "./types/domain";
export type { WorkflowEvent, WorkflowEventType } from "./types/events";
export type { GitConfig } from "./types/git";
export type {
  EngineCapabilities as PluginCapabilities,
  EnginePlugin as Plugin,
  PluginConfig,
  PluginMetadata,
} from "./types/plugin";
export type { ExecFunction } from "./types/runtime";
export type {
  ExtendedWorkflowStep,
  Workflow,
  WorkflowExecution,
  WorkflowStep,
} from "./types/workflow";
// Server-side code (API routes) should import directly from '@openfarm/core/db'
// Client components only need types, which are available from "./types" and "./constants"
