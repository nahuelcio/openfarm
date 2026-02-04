import type { ChangesSummary } from "@openfarm/core/types/adapters";
import { BaseAgentPlugin } from "../core/base-agent";
import type {
  AgentExecuteOptions,
  AgentPluginFactory,
  AgentPluginMeta,
} from "../core/types";

interface ClaudeStreamEvent {
  type?: string;
  message?: string;
  tool_name?: string;
  tool_input?: { file_path?: string };
  is_error?: boolean;
  tool_result?: string;
  cost_usd?: number;
}

export class ClaudeCodeAgent extends BaseAgentPlugin {
  readonly meta: AgentPluginMeta = {
    id: "claude-code",
    name: "Claude Code",
    description: "Claude Code CLI agent",
    version: "0.1.0",
    defaultCommand: "claude",
    supportsStreaming: true,
    supportsInterrupt: true,
    supportsFileContext: true,
    supportsSubagentTracing: true,
    structuredOutputFormat: "jsonl",
  };

  protected buildArgs(prompt: string, options?: AgentExecuteOptions): string[] {
    const args = ["-p", prompt, "--verbose", "--output-format", "stream-json"];
    if (options?.model) {
      args.push("--model", options.model);
    }
    if (this.config.maxTokens && typeof this.config.maxTokens === "number") {
      args.push("--max-tokens", String(this.config.maxTokens));
    }
    if (
      Array.isArray(this.config.allowedTools) &&
      this.config.allowedTools.length > 0
    ) {
      args.push("--allowedTools", this.config.allowedTools.join(","));
    }
    if (
      Array.isArray(this.config.disallowedTools) &&
      this.config.disallowedTools.length > 0
    ) {
      args.push("--disallowedTools", this.config.disallowedTools.join(","));
    }
    if (options?.subagentTracing) {
      args.push("--trace");
    }
    return args;
  }

  protected parseOutput(stdout: string): ChangesSummary | undefined {
    const filesModified = new Set<string>();
    const filesCreated = new Set<string>();
    const filesDeleted = new Set<string>();
    let summary = "";
    let totalCost = 0;

    const lines = stdout.split("\n").filter((line) => line.trim().length > 0);
    for (const line of lines) {
      try {
        const event = JSON.parse(line) as ClaudeStreamEvent;
        if (!event.type) {
          continue;
        }

        if (
          event.type === "tool_use" &&
          event.tool_name &&
          event.tool_input?.file_path
        ) {
          const filePath = String(event.tool_input.file_path);
          if (event.tool_name === "Write") {
            filesCreated.add(filePath);
          } else if (event.tool_name === "Edit") {
            filesModified.add(filePath);
          }
        }

        if (event.type === "result" && event.message) {
          summary = event.message;
        }

        if (event.type === "result" && typeof event.cost_usd === "number") {
          totalCost += event.cost_usd;
        }
      } catch {
        // ignore malformed lines
      }
    }

    return {
      filesModified: Array.from(filesModified),
      filesCreated: Array.from(filesCreated),
      filesDeleted: Array.from(filesDeleted),
      summary: summary || "Claude Code execution completed",
      totalCost: totalCost || undefined,
    };
  }
}

export class ClaudeCodeAgentFactory implements AgentPluginFactory {
  create(): ClaudeCodeAgent {
    return new ClaudeCodeAgent();
  }

  getMeta(): AgentPluginMeta {
    return new ClaudeCodeAgent().meta;
  }

  canCreate(pluginId: string): boolean {
    return pluginId === "claude-code";
  }
}
