import type { ChangesSummary } from "@openfarm/core/types/adapters";
import { BaseAgentPlugin } from "../core/base-agent";
import type {
  AgentExecuteOptions,
  AgentPluginFactory,
  AgentPluginMeta,
} from "../core/types";

export interface GenericCliAgentConfig {
  cli: string;
  args?: string[];
  name?: string;
  description?: string;
}

export class GenericCliAgent extends BaseAgentPlugin {
  readonly meta: AgentPluginMeta;
  private readonly cli: string;
  private readonly args: string[];

  constructor(config: GenericCliAgentConfig) {
    super();
    this.cli = config.cli;
    this.args = config.args ?? [];
    this.meta = {
      id: "generic-cli",
      name: config.name ?? "Generic CLI",
      description: config.description ?? "Generic CLI agent",
      version: "0.1.0",
      defaultCommand: this.cli,
      supportsStreaming: true,
      supportsInterrupt: true,
      supportsFileContext: false,
      supportsSubagentTracing: false,
    };
  }

  protected buildArgs(
    _prompt: string,
    _options?: AgentExecuteOptions
  ): string[] {
    return [...this.args];
  }

  protected getStdinInput(prompt: string): string | undefined {
    return prompt;
  }

  protected parseOutput(stdout: string): ChangesSummary | undefined {
    return {
      summary: stdout.trim() || "Generic CLI execution completed",
    };
  }
}

export class GenericCliAgentFactory implements AgentPluginFactory {
  private readonly config: GenericCliAgentConfig;

  constructor(config: GenericCliAgentConfig) {
    this.config = config;
  }

  create(): GenericCliAgent {
    return new GenericCliAgent(this.config);
  }

  getMeta(): AgentPluginMeta {
    return new GenericCliAgent(this.config).meta;
  }

  canCreate(pluginId: string): boolean {
    return pluginId === "generic-cli";
  }
}
