import type { CommunicationResponse, ResponseParser } from "@openfarm/sdk";
import type { OpenCodeEvent, OpenCodeExecutionState } from "./types";

export interface OpenCodeParseResult {
  success: boolean;
  data?: string;
  error?: string;
  metadata?: {
    tokens: number;
    files: {
      modified: string[];
      created: string[];
    };
    output?: string;
  };
}

export class OpenCodeResponseParser
  implements ResponseParser<OpenCodeParseResult>
{
  readonly type = "opencode";

  async parse(response: CommunicationResponse): Promise<OpenCodeParseResult> {
    const body = response.body;

    const state: OpenCodeExecutionState = {
      outputText: "",
      totalTokens: 0,
      modifiedFiles: new Set(),
      createdFiles: new Set(),
    };

    // Handle streaming JSON events from CLI mode
    if (this.isStreamingResponse(body)) {
      return this.parseStreamingResponse(body, state);
    }

    // Handle HTTP API response
    if (this.isHttpResponse(body)) {
      return this.parseHttpResponse(body);
    }

    // Fallback for plain text
    return {
      success: true,
      data: body,
      metadata: {
        tokens: 0,
        files: { modified: [], created: [] },
      },
    };
  }

  canHandle(response: CommunicationResponse): boolean {
    // Can handle JSON responses or text responses
    const body = response.body;
    return (
      this.isStreamingResponse(body) ||
      this.isHttpResponse(body) ||
      typeof body === "string"
    );
  }

  private isStreamingResponse(response: string): boolean {
    const lines = response.split("\n").filter((line) => line.trim());
    return lines.some((line) => {
      try {
        const event = JSON.parse(line);
        return event.type && typeof event.type === "string";
      } catch {
        return false;
      }
    });
  }

  private isHttpResponse(response: string): boolean {
    try {
      const parsed = JSON.parse(response);
      return parsed.usage || parsed.diff || parsed.id;
    } catch {
      return false;
    }
  }

  private parseStreamingResponse(
    response: string,
    state: OpenCodeExecutionState
  ): OpenCodeParseResult {
    const lines = response.split("\n").filter((line) => line.trim());

    for (const line of lines) {
      try {
        const event: OpenCodeEvent = JSON.parse(line);
        this.handleEvent(event, state);
      } catch {
        // Non-JSON line, treat as regular output
      }
    }

    return {
      success: true,
      data: this.formatSummary(
        state.totalTokens,
        state.modifiedFiles,
        state.createdFiles
      ),
      metadata: {
        tokens: state.totalTokens,
        files: {
          modified: Array.from(state.modifiedFiles),
          created: Array.from(state.createdFiles),
        },
        output: state.outputText,
      },
    };
  }

  private parseHttpResponse(response: string): OpenCodeParseResult {
    try {
      const data = JSON.parse(response);

      if (data.usage && data.diff) {
        // Complete HTTP response with usage and diff
        return {
          success: true,
          data: this.formatHttpOutput(data.usage, data.diff),
          metadata: {
            tokens: data.usage.total_tokens || 0,
            files: {
              modified: data.diff.map((d: any) => d.path),
              created: [],
            },
          },
        };
      }

      return {
        success: true,
        data: JSON.stringify(data, null, 2),
        metadata: {
          tokens: data.usage?.total_tokens || 0,
          files: { modified: [], created: [] },
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to parse HTTP response: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }

  private handleEvent(
    event: OpenCodeEvent,
    state: OpenCodeExecutionState
  ): void {
    const { type, part } = event;

    switch (type) {
      case "text":
        if (part?.text) {
          state.outputText += part.text;
        }
        break;

      case "thinking":
      case "reasoning": {
        const text = part?.text || event.text;
        if (text) {
          state.outputText += text;
        }
        break;
      }

      case "tool_use":
        this.handleToolUse(part, state.modifiedFiles, state.createdFiles);
        break;

      case "step_finish":
        if (part?.usage) {
          state.totalTokens = part.usage.total_tokens || 0;
        }
        break;

      case "error":
        // Error events are handled at a higher level
        break;

      default:
      // Other event types
    }
  }

  private handleToolUse(
    part: any,
    modifiedFiles: Set<string>,
    createdFiles: Set<string>
  ): void {
    if (!part) {
      return;
    }

    const toolName = part.tool;
    const status = part.state?.status;
    const input = part.state?.input;

    if (status === "completed") {
      if (toolName === "edit" && input?.filePath) {
        modifiedFiles.add(input.filePath);
      }
      if (toolName === "write" && input?.filePath) {
        createdFiles.add(input.filePath);
      }
    }
  }

  private formatSummary(
    totalTokens: number,
    modifiedFiles: Set<string>,
    createdFiles: Set<string>
  ): string {
    const summary = [
      "OpenCode execution completed successfully",
      `Tokens used: ${totalTokens}`,
      `Files modified: ${modifiedFiles.size}`,
      `Files created: ${createdFiles.size}`,
    ];

    if (modifiedFiles.size > 0) {
      summary.push("Modified files:");
      for (const file of modifiedFiles) {
        summary.push(`  - ${file}`);
      }
    }

    if (createdFiles.size > 0) {
      summary.push("Created files:");
      for (const file of createdFiles) {
        summary.push(`  - ${file}`);
      }
    }

    return summary.join("\n");
  }

  private formatHttpOutput(usage: any, diff: any[]): string {
    const summary = [
      "OpenCode execution completed successfully",
      `Tokens used: ${usage.total_tokens || 0}`,
      `Files modified: ${diff.length}`,
    ];

    if (diff.length > 0) {
      summary.push("Modified files:");
      for (const file of diff) {
        summary.push(
          `  - ${file.path} (+${file.additions}/-${file.deletions})`
        );
      }
    }

    return summary.join("\n");
  }
}
