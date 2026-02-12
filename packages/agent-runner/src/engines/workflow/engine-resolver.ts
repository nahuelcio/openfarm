import type {
  ChangesSummary,
  CodingEngine,
} from "@openfarm/core/types/adapters";
import type { ChatMessage } from "@openfarm/core/types/chat";
import type { AgentConfiguration } from "@openfarm/core/types/domain";
import type { AgentCodeConfig } from "./executors/validation";
import type { CodingEngineFactory } from "./types";

/**
 * Runtime type for the coding engine execution environment
 */
export type RuntimeType = "local" | "docker" | "kubernetes" | "worktree";

/**
 * Options for configuring the default engine
 */
export interface EngineOptions {
  provider?: AgentConfiguration["provider"];
  model?: string;
  previewMode?: boolean;
  chatOnly?: boolean;
  mcpServers?: string[];
  runtimeType?: RuntimeType;
  worktreePath?: string;
  baseBranch?: string;
  containerName?: string;
  podName?: string;
  namespace?: string;
  imageName?: string;
  ephemeral?: boolean;
  onLog?: (message: string) => void | Promise<void>;
  onChanges?: (changes: ChangesSummary) => void | Promise<void>;
  onChatMessage?: (message: ChatMessage) => void | Promise<void>;
}

/**
 * Configuration for creating a coding engine instance
 */
export interface EngineConfig {
  provider: AgentConfiguration["provider"];
  model?: string;
  previewMode: boolean;
  chatOnly: boolean;
  runtimeType: RuntimeType;
  worktreePath?: string;
  baseBranch?: string;
  containerName?: string;
  podName?: string;
  namespace?: string;
  imageName?: string;
  ephemeral?: boolean;
  mcpServers?: string[];
  maxIterations?: number;
  onLog?: (message: string) => void | Promise<void>;
  onChanges?: (changes: ChangesSummary) => void | Promise<void>;
  onChatMessage?: (message: ChatMessage) => void | Promise<void>;
}

/**
 * Services required for engine resolution
 */
export interface EngineResolverServices {
  codingEngine?: CodingEngine;
  codingEngineFactory?: CodingEngineFactory;
  defaultEngineOptions?: EngineOptions;
}

/**
 * Context for engine resolution
 */
export interface EngineResolutionContext {
  agentConfiguration?: AgentConfiguration;
  worktreePath?: string | null;
  podName?: string;
  defaultBranch?: string;
}

/**
 * Determines if the default engine should be reused based on configuration.
 * Returns true if no step-specific overrides are provided that would require
 * creating a new engine instance.
 *
 * @param config - The agent code step configuration
 * @param context - The execution context
 * @param defaultEngineOptions - Default engine options from services
 * @returns Whether to use the default engine
 */
export function shouldUseDefaultEngine(
  config: AgentCodeConfig,
  context: EngineResolutionContext,
  defaultEngineOptions: EngineOptions
): boolean {
  // If provider is explicitly set and differs from default, can't use default
  if (
    config.provider !== undefined &&
    config.provider !== defaultEngineOptions.provider
  ) {
    return false;
  }

  // If model is explicitly set and differs from context/default, can't use default
  const contextModel = context.agentConfiguration?.model;
  const defaultModel = defaultEngineOptions.model;
  if (
    config.model !== undefined &&
    config.model !== (contextModel ?? defaultModel)
  ) {
    return false;
  }

  // If previewMode is explicitly overridden, can't use default
  if (
    config.previewMode !== undefined &&
    config.previewMode !== defaultEngineOptions.previewMode
  ) {
    return false;
  }

  // If readOnly is explicitly overridden (alias for previewMode), can't use default
  if (
    config.readOnly !== undefined &&
    config.readOnly !== defaultEngineOptions.previewMode
  ) {
    return false;
  }

  // If chatOnly is explicitly set and differs from default, can't use default
  if (
    config.chatOnly !== undefined &&
    config.chatOnly !== defaultEngineOptions.chatOnly
  ) {
    return false;
  }

  // If runtime-specific options are overridden, can't use default
  if (
    config.runtimeType !== undefined &&
    config.runtimeType !== defaultEngineOptions.runtimeType
  ) {
    return false;
  }

  if (
    config.worktreePath !== undefined &&
    config.worktreePath !== defaultEngineOptions.worktreePath
  ) {
    return false;
  }

  if (
    config.containerName !== undefined &&
    config.containerName !== defaultEngineOptions.containerName
  ) {
    return false;
  }

  if (
    config.podName !== undefined &&
    config.podName !== defaultEngineOptions.podName
  ) {
    return false;
  }

  if (
    config.namespace !== undefined &&
    config.namespace !== defaultEngineOptions.namespace
  ) {
    return false;
  }

  if (
    config.imageName !== undefined &&
    config.imageName !== defaultEngineOptions.imageName
  ) {
    return false;
  }

  if (
    config.ephemeral !== undefined &&
    config.ephemeral !== defaultEngineOptions.ephemeral
  ) {
    return false;
  }

  return true;
}

/**
 * Resolves the runtime type based on configuration hierarchy:
 * 1. Step config runtimeType
 * 2. Context podName (implies kubernetes)
 * 3. Context worktreePath (implies worktree)
 * 4. Default engine options (docker if container/image/ephemeral set)
 * 5. Fallback to local
 *
 * @param config - The agent code step configuration
 * @param context - The execution context
 * @param defaults - Default engine options
 * @returns The resolved runtime type
 */
export function resolveRuntimeType(
  config: AgentCodeConfig,
  context: EngineResolutionContext,
  defaults: EngineOptions
): RuntimeType {
  // Explicit runtime type in config takes highest precedence
  if (config.runtimeType) {
    return config.runtimeType;
  }

  // Pod name implies kubernetes runtime
  const resolvedPodName = config.podName ?? context.podName ?? defaults.podName;
  if (resolvedPodName) {
    return "kubernetes";
  }

  // Worktree path implies worktree runtime
  const resolvedWorktreePath =
    config.worktreePath ?? context.worktreePath ?? defaults.worktreePath;
  if (resolvedWorktreePath) {
    return "worktree";
  }

  // Container/image/ephemeral settings imply docker runtime
  const hasDockerSettings =
    defaults.containerName ||
    defaults.ephemeral ||
    defaults.imageName ||
    config.containerName ||
    config.imageName ||
    config.ephemeral;
  if (hasDockerSettings) {
    return "docker";
  }

  // Default to local runtime
  return "local";
}

/**
 * Builds a complete engine configuration by merging:
 * 1. Step configuration (highest priority)
 * 2. Context agent configuration
 * 3. Default engine options (lowest priority)
 *
 * @param config - The agent code step configuration
 * @param context - The execution context
 * @param defaultEngineOptions - Default engine options
 * @param additionalOptions - Additional options from TUI config
 * @returns Complete engine configuration
 */
export function buildEngineConfig(
  config: AgentCodeConfig,
  context: EngineResolutionContext,
  defaultEngineOptions: EngineOptions,
  additionalOptions?: {
    resolvedModel?: string;
    maxIterations?: number;
    useOpenCode?: boolean;
  }
): EngineConfig {
  // Resolve previewMode (config.previewMode or config.readOnly as alias)
  const stepPreviewMode =
    config.previewMode !== undefined
      ? config.previewMode
      : config.readOnly !== undefined
        ? config.readOnly
        : defaultEngineOptions.previewMode;

  // Resolve runtime type
  const runtimeType = resolveRuntimeType(config, context, defaultEngineOptions);

  // Resolve provider
  const provider =
    config.provider ||
    context.agentConfiguration?.provider ||
    defaultEngineOptions.provider ||
    (additionalOptions?.useOpenCode ? "opencode" : "claude-code");

  // Resolve model with fallback chain
  const resolvedModel =
    additionalOptions?.resolvedModel ??
    config.model ??
    context.agentConfiguration?.model ??
    defaultEngineOptions.model;

  return {
    provider,
    model: resolvedModel,
    previewMode: stepPreviewMode ?? false,
    chatOnly: config.chatOnly ?? defaultEngineOptions.chatOnly ?? false,
    runtimeType,
    worktreePath:
      config.worktreePath ??
      context.worktreePath ??
      defaultEngineOptions.worktreePath,
    baseBranch:
      config.baseBranch ??
      defaultEngineOptions.baseBranch ??
      context.defaultBranch,
    containerName: config.containerName ?? defaultEngineOptions.containerName,
    podName: config.podName ?? context.podName ?? defaultEngineOptions.podName,
    namespace: config.namespace ?? defaultEngineOptions.namespace,
    imageName: config.imageName ?? defaultEngineOptions.imageName,
    ephemeral: config.ephemeral ?? defaultEngineOptions.ephemeral,
    mcpServers: defaultEngineOptions.mcpServers,
    maxIterations: additionalOptions?.maxIterations,
  };
}

/**
 * Resolves and creates the appropriate coding engine for execution.
 * Reuses existing engine if configuration matches, otherwise creates new instance.
 *
 * @param config - The agent code step configuration
 * @param context - The execution context
 * @param services - Services containing engine factory and default options
 * @param additionalOptions - Additional options for engine creation
 * @returns Promise resolving to the coding engine to use
 * @throws Error if no engine factory is available
 */
export async function resolveEngine(
  config: AgentCodeConfig,
  context: EngineResolutionContext,
  services: EngineResolverServices,
  additionalOptions?: {
    resolvedModel?: string;
    maxIterations?: number;
    useOpenCode?: boolean;
    onLog?: (message: string) => void | Promise<void>;
    onChanges?: (changes: ChangesSummary) => void | Promise<void>;
    onChatMessage?: (message: ChatMessage) => void | Promise<void>;
  }
): Promise<CodingEngine> {
  const { codingEngine, codingEngineFactory, defaultEngineOptions } = services;

  // Must have default options to proceed
  if (!defaultEngineOptions) {
    throw new Error(
      "defaultEngineOptions service is required for engine resolution"
    );
  }

  // Check if we can reuse the existing engine
  if (
    codingEngine &&
    shouldUseDefaultEngine(config, context, defaultEngineOptions)
  ) {
    return codingEngine;
  }

  // Need factory to create new engine
  if (!codingEngineFactory) {
    throw new Error(
      "codingEngineFactory is required to create new engine instance"
    );
  }

  // Build complete configuration
  const engineConfig = buildEngineConfig(
    config,
    context,
    defaultEngineOptions,
    {
      resolvedModel: additionalOptions?.resolvedModel,
      maxIterations: additionalOptions?.maxIterations,
      useOpenCode: additionalOptions?.useOpenCode,
    }
  );

  // Create engine with all callbacks
  return codingEngineFactory({
    ...engineConfig,
    onLog: additionalOptions?.onLog ?? defaultEngineOptions.onLog,
    onChanges: additionalOptions?.onChanges ?? defaultEngineOptions.onChanges,
    onChatMessage:
      additionalOptions?.onChatMessage ?? defaultEngineOptions.onChatMessage,
  });
}
