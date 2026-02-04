import { existsSync, statSync } from "node:fs";
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

interface ClaudeStreamParser {
  push(chunk: string): ClaudeStreamEvent[];
  flush(): ClaudeStreamEvent[];
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

  private model?: string;
  private skipPermissions = true;

  async initialize(config: Record<string, unknown>): Promise<void> {
    await super.initialize(config);
    if (typeof config.model === "string") {
      this.model = config.model;
    }
    if (typeof config.skipPermissions === "boolean") {
      this.skipPermissions = config.skipPermissions;
    }
  }

  protected buildArgs(
    _prompt: string,
    options?: AgentExecuteOptions
  ): string[] {
    const args = ["--print", "--verbose", "--output-format", "stream-json"];

    const model = options?.model || this.model;
    if (model) {
      args.push("--model", model);
    }

    if (this.skipPermissions) {
      args.push("--dangerously-skip-permissions");
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

    if (options?.contextFiles) {
      for (const file of options.contextFiles) {
        try {
          if (existsSync(file) && statSync(file).isDirectory()) {
            args.push("--add-dir", file);
          }
        } catch {
          // ignore invalid context paths
        }
      }
    }

    return args;
  }

  protected getStdinInput(
    prompt: string,
    _options?: AgentExecuteOptions
  ): string {
    return prompt;
  }

  validateModel(model: string): string | null {
    if (!model) {
      return null;
    }
    const valid = ["sonnet", "opus", "haiku"];
    if (!(valid.includes(model) || model.startsWith("claude-"))) {
      return `Invalid model "${model}". Accepted: ${valid.join(", ")} or full model IDs (claude-sonnet-4-...)`;
    }
    return null;
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

  static createStreamingParser(): ClaudeStreamParser {
    let buffer = "";
    return {
      push(chunk: string) {
        buffer += chunk;
        const events: ClaudeStreamEvent[] = [];
        let idx = buffer.indexOf("\n");
        while (idx !== -1) {
          const line = buffer.slice(0, idx).trim();
          buffer = buffer.slice(idx + 1);
          if (line) {
            try {
              events.push(JSON.parse(line));
            } catch {
              // ignore malformed lines
            }
          }
          idx = buffer.indexOf("\n");
        }
        return events;
      },
      flush() {
        if (!buffer.trim()) {
          buffer = "";
          return [];
        }
        try {
          const event = JSON.parse(buffer.trim()) as ClaudeStreamEvent;
          buffer = "";
          return [event];
        } catch {
          buffer = "";
          return [];
        }
      },
    };
  }
}

export class ClaudeCodeAgentFactory implements AgentPluginFactory {
  private static readonly META: AgentPluginMeta = {
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

  create(): ClaudeCodeAgent {
    return new ClaudeCodeAgent();
  }

  getMeta(): AgentPluginMeta {
    return ClaudeCodeAgentFactory.META;
  }

  canCreate(pluginId: string): boolean {
    return pluginId === "claude-code";
  }
}
