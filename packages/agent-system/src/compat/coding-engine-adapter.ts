import type {
  ChangesSummary,
  CodingEngine,
} from "@openfarm/core/types/adapters";
import type { ChatMessage } from "@openfarm/core/types/chat";
import type { AgentConfigurationRules } from "@openfarm/core/types/domain";
import { err, ok, type Result } from "@openfarm/result";
import type { AgentExecuteOptions, AgentPlugin } from "../core/types";

export interface CodingEngineAdapterOptions {
  model?: string;
  previewMode?: boolean;
  chatOnly?: boolean;
  rules?: AgentConfigurationRules;
  onLog?: (message: string) => void | Promise<void>;
  onChanges?: (changes: ChangesSummary) => void | Promise<void>;
  onChatMessage?: (message: ChatMessage) => void | Promise<void>;
}

export class AgentToCodingEngineAdapter implements CodingEngine {
  private readonly agent: AgentPlugin;
  private readonly options: CodingEngineAdapterOptions;

  constructor(agent: AgentPlugin, options: CodingEngineAdapterOptions = {}) {
    this.agent = agent;
    this.options = options;
  }

  async applyChanges(
    instruction: string,
    repoPath: string,
    contextFiles: string[] = []
  ): Promise<Result<ChangesSummary>> {
    const prompt = instruction;

    const executeOptions: AgentExecuteOptions = {
      cwd: repoPath,
      model: this.options.model,
      contextFiles,
      onStdout: (data) => {
        if (this.options.onLog) {
          this.options.onLog(data.toString());
        }
      },
      onStderr: (data) => {
        if (this.options.onLog) {
          this.options.onLog(data.toString());
        }
      },
      onChanges: (changes) => {
        if (this.options.onChanges) {
          this.options.onChanges(changes);
        }
      },
    };

    const handle = this.agent.execute(prompt, executeOptions);
    const result = await handle.promise;

    if (result.status === "completed") {
      return ok(result.changes || { summary: result.stdout });
    }

    const details: string[] = [];
    if (result.error) {
      details.push(result.error);
    }
    if (result.stderr?.trim()) {
      details.push(`stderr: ${result.stderr.trim().slice(0, 500)}`);
    }
    if (result.stdout?.trim()) {
      details.push(`stdout: ${result.stdout.trim().slice(0, 500)}`);
    }
    const message =
      details.length > 0
        ? `Agent execution failed (${result.status}): ${details.join(" | ")}`
        : `Agent execution failed (${result.status})`;
    return err(new Error(message));
  }

  async applyChangesIterative(
    instruction: string,
    repoPath: string,
    contextFiles: string[] = []
  ): Promise<Result<ChangesSummary>> {
    return this.applyChanges(instruction, repoPath, contextFiles);
  }

  getName(): string {
    return this.agent.meta.name;
  }

  async getSupportedModels(): Promise<string[]> {
    return ["default"];
  }

  async cancelExecution(executionId: string): Promise<Result<void>> {
    const interrupted = this.agent.interrupt(executionId);
    if (!interrupted) {
      return err(new Error("Execution not found"));
    }
    return ok(undefined);
  }
}
