import type {
  ChangesSummary,
  CodingEngine,
} from "@openfarm/core/types/adapters";
import type { ChatMessage } from "@openfarm/core/types/chat";
import type { AgentConfigurationRules } from "@openfarm/core/types/domain";
import { ClaudeCodeAgent } from "./agents/claude-code";
import { GenericCliAgent } from "./agents/generic-cli";
import { OpenCodeAgent } from "./agents/opencode";
import { AgentToCodingEngineAdapter } from "./compat/coding-engine-adapter";
import { AgentRegistry } from "./core/registry";
import type { AgentPlugin } from "./core/types";
import type { ExecutionRuntime, ExecutionRuntimeConfig } from "./runtime";
import { createRuntime } from "./runtime";

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
  jobId?: string;
  containerName?: string;
  podName?: string;
  namespace?: string;
  ephemeral?: boolean;
  maxTokens?: number;
  allowedTools?: string[];
  disallowedTools?: string[];
  cli?: string;
  args?: string[];
  agentName?: string;
  runtimeType?: ExecutionRuntimeConfig["type"];
  worktreePath?: string;
  baseBranch?: string;
  imageName?: string;
}

export function createAgent(config: {
  agent: string;
  runtime: ExecutionRuntime;
  options: CodingEngineFactoryOptions;
}): AgentPlugin {
  const registry = AgentRegistry.getInstance();

  if (registry.hasPlugin(config.agent)) {
    const instance = registry.createInstance(config.agent);
    if (!instance) {
      throw new Error(`Failed to create agent '${config.agent}'`);
    }
    instance
      .initialize({ runtime: config.runtime, ...config.options })
      .catch(() => {});
    return instance;
  }

  switch (config.agent) {
    case "opencode": {
      const agent = new OpenCodeAgent();
      agent
        .initialize({ runtime: config.runtime, ...config.options })
        .catch(() => {});
      return agent;
    }
    case "claude-code": {
      const agent = new ClaudeCodeAgent();
      agent
        .initialize({ runtime: config.runtime, ...config.options })
        .catch(() => {});
      return agent;
    }
    case "external-agent": {
      if (!config.options.cli) {
        throw new Error(
          "External agent provider requires 'cli' option (e.g., 'claude', 'opencode', 'aider')"
        );
      }
      const agent = new GenericCliAgent({
        cli: config.options.cli,
        args: config.options.args,
        name: config.options.agentName,
      });
      agent
        .initialize({ runtime: config.runtime, ...config.options })
        .catch(() => {});
      return agent;
    }
    case "direct-llm":
      throw new Error(
        "direct-llm provider is not yet implemented. Please use 'opencode', 'claude-code', or 'external-agent'."
      );
    default:
      throw new Error(`Unsupported provider: ${config.agent}`);
  }
}

export function createCodingEngine(
  options: CodingEngineFactoryOptions
): CodingEngine {
  const provider = options.provider || "opencode";
  const runtimeConfig = resolveRuntimeConfig(provider, options);
  const runtime = createRuntime(runtimeConfig);
  const agent = createAgent({ agent: provider, runtime, options });

  return new AgentToCodingEngineAdapter(agent, {
    model: options.model,
    previewMode: options.previewMode ?? false,
    chatOnly: options.chatOnly ?? false,
    rules: options.rules,
    onLog: options.onLog,
    onChanges: options.onChanges,
    onChatMessage: options.onChatMessage,
  });
}

function resolveRuntimeConfig(
  provider: string,
  options: CodingEngineFactoryOptions
): ExecutionRuntimeConfig {
  if (options.runtimeType === "worktree") {
    return {
      type: "worktree",
      worktreePath: options.worktreePath,
      baseBranch: options.baseBranch,
    };
  }

  if (options.runtimeType === "kubernetes" || options.podName) {
    return {
      type: "kubernetes",
      podName: options.podName,
      namespace: options.namespace,
      container: provider === "claude-code" ? "claude-code" : undefined,
    };
  }

  if (
    options.runtimeType === "docker" ||
    options.containerName ||
    options.ephemeral
  ) {
    const imageName =
      options.imageName ||
      (provider === "claude-code"
        ? process.env.CLAUDE_CODE_IMAGE_NAME ||
          "minions-farm/claude-code:latest"
        : process.env.OPENCODE_IMAGE_NAME);

    return {
      type: "docker",
      containerName: options.containerName,
      imageName,
      ephemeral: options.ephemeral ?? false,
    };
  }

  return { type: "local" };
}
