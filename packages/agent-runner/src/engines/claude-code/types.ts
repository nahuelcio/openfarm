import type { ChangesSummary } from "@openfarm/core/types/adapters";
import type { ChatMessage } from "@openfarm/core/types/chat";
import type { AgentConfigurationRules } from "@openfarm/core/types/domain";

/**
 * Options for configuring ClaudeCodeCodingEngine.
 */
export interface ClaudeCodeOptions {
  /** Model to use (default: claude-sonnet-4-5-20250929) */
  model?: string;
  /** Preview mode - don't apply changes */
  previewMode?: boolean;
  /** Chat only mode - no file edits */
  chatOnly?: boolean;
  /** Rules for file exclusions */
  rules?: AgentConfigurationRules;
  /** Max tokens for output */
  maxTokens?: number;
  /** Allowed tools for Claude */
  allowedTools?: string[];
  /** Disallowed tools for Claude */
  disallowedTools?: string[];
  /** MCP servers to connect */
  mcpServers?: string[];
  /** Docker container name (falls back to CLAUDE_CODE_CONTAINER_NAME env var) */
  containerName?: string;
  /** Kubernetes Pod name (if using ephemeral pods, takes precedence over containerName) */
  podName?: string;
  /** Kubernetes namespace (default: minions-farm) */
  namespace?: string;
  /** Run in ephemeral container mode */
  ephemeral?: boolean;
  /** Job ID for isolated chat history per job */
  jobId?: string;
  /** Max turns for Claude Code execution (default: 50) */
  maxTurns?: number;
  /** API timeout in milliseconds (default: 300000 = 5 min) */
  apiTimeout?: number;
  /** Custom base URL for Anthropic API */
  apiBaseUrl?: string;
  /** Callback for log messages */
  onLog?: (message: string) => void | Promise<void>;
  /** Callback for changes */
  onChanges?: (changes: ChangesSummary) => void | Promise<void>;
  /** Callback for chat messages */
  onChatMessage?: (message: ChatMessage) => void | Promise<void>;
}

/**
 * Configuration for Claude Code process execution.
 */
export interface ClaudeCodeProcessConfig extends ClaudeCodeOptions {
  /** Working directory */
  cwd?: string;
  /** API key for Anthropic (falls back to ANTHROPIC_API_KEY env var) */
  apiKey?: string;
}

/**
 * Result from Claude Code execution.
 */
export interface ClaudeCodeResult {
  /** Whether the execution was successful */
  success: boolean;
  /** Summary of changes made */
  summary?: string;
  /** Files that were modified */
  filesModified?: string[];
  /** Files that were created */
  filesCreated?: string[];
  /** Files that were deleted */
  filesDeleted?: string[];
  /** Raw output from Claude */
  rawOutput?: string;
  /** Error message if failed */
  error?: string;
  /** Total tokens used */
  tokensUsed?: number;
  /** Cost in USD */
  costUsd?: number;
}

/**
 * Claude Code CLI output event types
 */
export type ClaudeCodeEventType =
  | "system"
  | "assistant"
  | "user"
  | "result"
  | "tool_use"
  | "tool_result"
  | "error";

/**
 * Claude Code CLI streaming event
 */
export interface ClaudeCodeStreamEvent {
  type: ClaudeCodeEventType;
  subtype?: string;
  message?: string;
  tool_name?: string;
  tool_input?: Record<string, unknown>;
  tool_result?: string;
  cost_usd?: number;
  is_error?: boolean;
  session_id?: string;
}
