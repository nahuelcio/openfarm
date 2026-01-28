import type { Result } from "@openfarm/result";
import type { CodingEngine } from "./adapters";
import type { AgentConfigurationRules } from "./domain";

/**
 * Metadata information about a plugin.
 * This includes identification, versioning, and descriptive information.
 */
export interface PluginMetadata {
  /** Unique identifier for the plugin (e.g., "claude-code", "opencode") */
  name: string;
  /** Semantic version of the plugin (e.g., "1.0.0") */
  version: string;
  /** Author or organization name */
  author?: string;
  /** Description of what the plugin does */
  description?: string;
  /** URL to the plugin's repository or homepage */
  homepage?: string;
  /** License identifier (e.g., "MIT", "Apache-2.0") */
  license?: string;
  /** Keywords for plugin discovery */
  keywords?: string[];
}

/**
 * Capabilities and features supported by an engine plugin.
 */
export interface EngineCapabilities {
  /** List of model identifiers supported by this engine */
  supportedModels: string[];
  /** Whether the engine supports preview mode */
  supportsPreviewMode: boolean;
  /** Whether the engine supports chat-only mode */
  supportsChatOnly: boolean;
  /** Whether the engine supports iterative execution */
  supportsIterativeExecution: boolean;
  /** Whether the engine supports cancellation */
  supportsCancellation: boolean;
  /** Whether the engine supports MCP servers */
  supportsMcpServers: boolean;
  /** Maximum number of context files that can be provided */
  maxContextFiles?: number;
  /** Maximum file size in bytes that can be processed */
  maxFileSize?: number;
}

/**
 * Configuration options for initializing a plugin.
 */
export interface PluginConfig {
  /** Model to use for this plugin instance */
  model?: string;
  /** Whether to run in preview mode */
  previewMode?: boolean;
  /** Whether to run in chat-only mode */
  chatOnly?: boolean;
  /** Agent configuration rules */
  rules?: AgentConfigurationRules;
  /** MCP servers to use */
  mcpServers?: string[];
  /** Maximum iterations for iterative execution */
  maxIterations?: number;
  /** Container name for Docker-based engines */
  containerName?: string;
  /** Kubernetes pod name for ephemeral containers */
  podName?: string;
  /** Kubernetes namespace */
  namespace?: string;
  /** Whether to run in ephemeral container mode */
  ephemeral?: boolean;
  /** Job ID for isolated execution */
  jobId?: string;
  /** Copilot API base URL */
  copilotApiBase?: string;
  /** Maximum tokens for execution */
  maxTokens?: number;
  /** Allowed tools for execution */
  allowedTools?: string[];
  /** Disallowed tools for execution */
  disallowedTools?: string[];
  /** Custom configuration options specific to the plugin */
  customOptions?: Record<string, unknown>;
}

/**
 * Extended CodingEngine interface for plugins.
 * All engine plugins must implement this interface.
 */
export interface EnginePlugin extends CodingEngine {
  /**
   * Initialize the plugin with the given configuration.
   * This is called when the plugin is first loaded or reloaded.
   *
   * @param config - Configuration options for the plugin
   * @returns Result indicating success or failure
   */
  initialize(config: PluginConfig): Promise<Result<void>>;

  /**
   * Cleanup resources when the plugin is unloaded.
   * This should release any resources, close connections, etc.
   *
   * @returns Result indicating success or failure
   */
  cleanup(): Promise<Result<void>>;

  /**
   * Get capabilities of this engine plugin.
   * This provides information about what features and models are supported.
   *
   * @returns Engine capabilities
   */
  getCapabilities(): Promise<EngineCapabilities>;

  /**
   * Get metadata about this plugin.
   * This includes name, version, author, description, etc.
   *
   * @returns Plugin metadata
   */
  getMetadata(): PluginMetadata;

  /**
   * Get the provider identifier for this plugin.
   * This is used to identify the plugin in the factory.
   * Should match the name in metadata.
   *
   * @returns Provider identifier (e.g., "claude-code", "opencode")
   */
  getProvider(): string;
}

/**
 * Type guard to check if an object is a valid EnginePlugin.
 * This performs runtime validation of the plugin interface.
 *
 * @param obj - Object to validate
 * @returns True if the object is a valid EnginePlugin
 */
export function isEnginePlugin(obj: unknown): obj is EnginePlugin {
  if (!obj || typeof obj !== "object") {
    return false;
  }

  const plugin = obj as Partial<EnginePlugin>;

  // Check required CodingEngine methods
  if (
    typeof plugin.getName !== "function" ||
    typeof plugin.getSupportedModels !== "function" ||
    typeof plugin.applyChanges !== "function"
  ) {
    return false;
  }

  // Check required EnginePlugin methods
  if (
    typeof plugin.initialize !== "function" ||
    typeof plugin.cleanup !== "function" ||
    typeof plugin.getCapabilities !== "function" ||
    typeof plugin.getMetadata !== "function" ||
    typeof plugin.getProvider !== "function"
  ) {
    return false;
  }

  // Validate metadata structure
  try {
    const metadata = plugin.getMetadata();
    if (
      !metadata ||
      typeof metadata !== "object" ||
      typeof metadata.name !== "string" ||
      typeof metadata.version !== "string"
    ) {
      return false;
    }
  } catch {
    return false;
  }

  return true;
}
