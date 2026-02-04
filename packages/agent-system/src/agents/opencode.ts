import type { ChangesSummary } from "@openfarm/core/types/adapters";
import { BaseAgentPlugin } from "../core/base-agent";
import type {
  AgentExecuteOptions,
  AgentPluginFactory,
  AgentPluginMeta,
} from "../core/types";

interface OpencodeEvent {
  type?: string;
  part?: {
    text?: string;
    tool?: string;
    state?: {
      status?: string;
      input?: { filePath?: string; command?: string };
      metadata?: { diff?: string };
    };
  };
}

export class OpenCodeAgent extends BaseAgentPlugin {
  readonly meta: AgentPluginMeta = {
    id: "opencode",
    name: "OpenCode",
    description: "OpenCode CLI agent",
    version: "0.1.0",
    defaultCommand: "bunx",
    supportsStreaming: true,
    supportsInterrupt: true,
    supportsFileContext: true,
    supportsSubagentTracing: false,
    structuredOutputFormat: "json",
  };

  protected buildArgs(prompt: string, options?: AgentExecuteOptions): string[] {
    const opencodeHost = process.env.OPENCODE_HOST || "127.0.0.1";
    const opencodePort = process.env.OPENCODE_PORT || "4096";
    const opencodeServerUrl = `http://${opencodeHost}:${opencodePort}`;

    const args = [
      "opencode-ai",
      "run",
      prompt,
      "--format",
      "json",
      "--attach",
      opencodeServerUrl,
    ];

    if (options?.model) {
      args.push("--model", options.model);
    }

    if (options?.contextFiles) {
      for (const file of options.contextFiles) {
        args.push("-f", file);
      }
    }

    return args;
  }

  protected parseOutput(stdout: string): ChangesSummary | undefined {
    const filesModified = new Set<string>();
    const filesCreated = new Set<string>();
    const filesDeleted = new Set<string>();
    let summary = "";
    let diff = "";

    const lines = stdout.split("\n").filter((line) => line.trim().length > 0);
    for (const line of lines) {
      try {
        const event = JSON.parse(line) as OpencodeEvent;
        if (!event.type) {
          continue;
        }

        if (event.type === "tool_use") {
          const tool = event.part?.tool;
          const status = event.part?.state?.status;
          const filePath = event.part?.state?.input?.filePath;
          if (status === "completed" && filePath) {
            if (tool === "edit") {
              filesModified.add(filePath);
              if (event.part?.state?.metadata?.diff) {
                diff += `${event.part.state.metadata.diff}\n`;
              }
            }
            if (tool === "write") {
              filesCreated.add(filePath);
            }
          }
        }

        if (event.type === "text" && event.part?.text) {
          summary += event.part.text;
        }
      } catch {
        // ignore malformed lines
      }
    }

    return {
      filesModified: Array.from(filesModified),
      filesCreated: Array.from(filesCreated),
      filesDeleted: Array.from(filesDeleted),
      diff: diff || undefined,
      summary: summary.trim() || "OpenCode execution completed",
    };
  }
}

export class OpenCodeAgentFactory implements AgentPluginFactory {
  create(): OpenCodeAgent {
    return new OpenCodeAgent();
  }

  getMeta(): AgentPluginMeta {
    return new OpenCodeAgent().meta;
  }

  canCreate(pluginId: string): boolean {
    return pluginId === "opencode";
  }
}
