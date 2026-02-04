import type {
  ChangesSummary,
  CodingEngine,
} from "@openfarm/core/types/adapters";
import type { ChatMessage } from "@openfarm/core/types/chat";
import type { AgentConfigurationRules } from "@openfarm/core/types/domain";
import { ClaudeCodeCodingEngine, type ClaudeCodeOptions } from "./claude-code";
import {
  ExternalAgentCodingEngine,
  type ExternalAgentCodingEngineOptions,
} from "./external-agent";
import { OpencodeCodingEngine, type OpencodeOptions } from "./opencode";

/**
 * Options for creating a coding engine via the factory.
 */
export interface CodingEngineFactoryOptions {
  provider?: "opencode" | "claude-code" | "direct-llm" | "external-agent";
  model?: string;
  previewMode?: boolean;
  chatOnly?: boolean;
  mcpServers?: string[];
  rules?: AgentConfigurationRules;
  maxIterations?: number;
  onLog?: (message: string) => void | Promise<void>;
  onChanges?: (changes: ChangesSummary) => void | Promise<void>;
  onChatMessage?: (message: ChatMessage) => void | Promise<void>;
  // Extended options for Claude Code
  jobId?: string;
  containerName?: string;
  podName?: string; // Kubernetes Pod name (if using ephemeral pods)
  namespace?: string; // Kubernetes namespace
  ephemeral?: boolean; // Run in ephemeral container mode
  // Extended options for Claude Code
  maxTokens?: number;
  allowedTools?: string[];
  disallowedTools?: string[];
  // Extended options for External Agent (output parsing)
  cli?: string;
  args?: string[];
  agentName?: string;
}

/**
 * Creates a coding engine instance based on the provided options.provider.
 * This factory creates built-in engines based on the provider.
 *
 * @param options - Configuration options for the coding engine
 * @returns An instance of the selected coding engine
 * @throws Error if an unsupported provider is specified
 *
 * @example
 * ```typescript
 * const engine = createCodingEngine({
 *   provider: "opencode",
 *   model: "opencode/grok-code-fast-1",
 *   previewMode: false,
 *   onLog: (msg) => console.log(msg)
 * });
 * ```
 */
export function createCodingEngine(
  options: CodingEngineFactoryOptions
): CodingEngine {
  const provider = options.provider || "opencode";

  switch (provider) {
    case "opencode": {
      const opencodeOptions: OpencodeOptions = {
        model: options.model,
        previewMode: options.previewMode ?? false,
        chatOnly: options.chatOnly ?? false,
        rules: options.rules,
        onLog: options.onLog,
        onChanges: options.onChanges,
        onChatMessage: options.onChatMessage,
      };
      return new OpencodeCodingEngine(opencodeOptions);
    }

    case "claude-code": {
      const claudeCodeOptions: ClaudeCodeOptions = {
        model: options.model,
        previewMode: options.previewMode ?? false,
        chatOnly: options.chatOnly ?? false,
        rules: options.rules,
        maxTokens: options.maxTokens,
        allowedTools: options.allowedTools,
        disallowedTools: options.disallowedTools,
        mcpServers: options.mcpServers,
        containerName: options.containerName,
        podName: options.podName,
        namespace: options.namespace,
        ephemeral: options.ephemeral,
        jobId: options.jobId,
        onLog: options.onLog,
        onChanges: options.onChanges,
        onChatMessage: options.onChatMessage,
      };
      return new ClaudeCodeCodingEngine(claudeCodeOptions);
    }

    case "external-agent": {
      if (!options.cli) {
        throw new Error(
          "External agent provider requires 'cli' option (e.g., 'claude', 'opencode', 'aider')"
        );
      }
      const externalAgentOptions: ExternalAgentCodingEngineOptions = {
        cli: options.cli,
        model: options.model,
        args: options.args,
        agentName: options.agentName,
        previewMode: options.previewMode ?? false,
        chatOnly: options.chatOnly ?? false,
        onLog: options.onLog,
        onChanges: options.onChanges,
      };
      return new ExternalAgentCodingEngine(externalAgentOptions);
    }

    case "direct-llm":
      throw new Error(
        "direct-llm provider is not yet implemented. Please use 'opencode', 'claude-code', or 'external-agent'."
      );

    default:
      // TypeScript should catch this, but adding runtime check for safety
      throw new Error(
        `Unsupported provider: ${provider}. Supported providers are: opencode, claude-code, external-agent`
      );
  }
}
