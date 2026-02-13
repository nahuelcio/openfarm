import type { ChangesSummary } from "@openfarm/core/types/adapters";
import { BaseAgentPlugin } from "../core/base-agent";
import type {
  AgentExecuteOptions,
  AgentPluginFactory,
  AgentPluginMeta,
} from "../core/types";

export class AiderAgent extends BaseAgentPlugin {
  readonly meta: AgentPluginMeta = {
    id: "aider",
    name: "Aider",
    description: "Aider AI pair programming CLI",
    version: "0.1.0",
    defaultCommand: "aider",
    supportsStreaming: true,
    supportsInterrupt: true,
    supportsFileContext: true,
    supportsSubagentTracing: false,
  };

  private model?: string;
  private noGit = true;
  private yesAlways = true;

  async initialize(config: Record<string, unknown>): Promise<void> {
    await super.initialize(config);
    if (typeof config.model === "string") {
      this.model = config.model;
    }
    if (typeof config.noGit === "boolean") {
      this.noGit = config.noGit;
    }
    if (typeof config.yesAlways === "boolean") {
      this.yesAlways = config.yesAlways;
    }
  }

  protected buildArgs(prompt: string, options?: AgentExecuteOptions): string[] {
    const args: string[] = [];

    if (this.yesAlways) {
      args.push("--yes-always");
    }

    if (this.noGit) {
      args.push("--no-git");
    }

    const model = options?.model || this.model;
    if (model) {
      args.push("--model", model);
    }

    args.push("--message", prompt);

    if (options?.contextFiles && options.contextFiles.length > 0) {
      args.push(...options.contextFiles);
    }

    return args;
  }

  protected parseOutput(stdout: string): ChangesSummary | undefined {
    return {
      summary: stdout.trim() || "Aider execution completed",
    };
  }

  validateModel(model: string): string | null {
    if (!model) {
      return null;
    }
    if (model.includes("/")) {
      const [provider, modelName] = model.split("/");
      if (!(provider && modelName)) {
        return `Invalid model format "${model}". Expected: provider/model`;
      }
    }
    return null;
  }
}

export class AiderAgentFactory implements AgentPluginFactory {
  private static readonly META: AgentPluginMeta = {
    id: "aider",
    name: "Aider",
    description: "Aider AI pair programming CLI",
    version: "0.1.0",
    defaultCommand: "aider",
    supportsStreaming: true,
    supportsInterrupt: true,
    supportsFileContext: true,
    supportsSubagentTracing: false,
  };

  create(): AiderAgent {
    return new AiderAgent();
  }

  getMeta(): AgentPluginMeta {
    return AiderAgentFactory.META;
  }

  canCreate(pluginId: string): boolean {
    return pluginId === "aider";
  }
}
