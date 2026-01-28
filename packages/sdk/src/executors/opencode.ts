import { DEFAULT_HOSTS, DEFAULT_PORTS } from "@openfarm/core";
import type { ExecutionOptions, ExecutionResult, Executor } from "../types";

interface OpenCodeConfig {
  mode: "local" | "cloud";
  baseUrl?: string;
  password?: string;
  timeout?: number;
}

interface OpenCodeSession {
  id: string;
  title: string;
  created_at: string;
}

interface OpenCodeMessage {
  id: string;
  status: "pending" | "running" | "completed" | "failed";
  created_at: string;
  usage?: {
    total_tokens: number;
    input_tokens: number;
    output_tokens: number;
  };
}

interface FileDiff {
  path: string;
  diff: string;
  additions: number;
  deletions: number;
}

export class OpenCodeExecutor implements Executor {
  type = "opencode" as const;
  private readonly config: OpenCodeConfig;

  constructor(config: OpenCodeConfig = { mode: "local" }) {
    this.config = {
      timeout: 600_000, // 10 minutes default
      ...config,
    };
  }

  async execute(options: ExecutionOptions): Promise<ExecutionResult> {
    const startTime = Date.now();

    try {
      const baseUrl = this.getBaseUrl();

      const sessionId = await this.createSession(baseUrl, options.task);
      const messageId = await this.sendMessage(
        baseUrl,
        sessionId,
        options.task,
        options.model
      );
      const result = await this.waitForCompletion(
        baseUrl,
        sessionId,
        messageId
      );
      const diff = await this.getDiff(baseUrl, sessionId);

      return {
        success: true,
        output: this.formatOutput(result, diff),
        duration: Date.now() - startTime,
        tokens: result.usage?.total_tokens || 0,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return {
        success: false,
        output: `OpenCode execution failed: ${message}`,
        duration: Date.now() - startTime,
        error: message,
      };
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const baseUrl = this.getBaseUrl();
      const response = await fetch(`${baseUrl}/global/health`, {
        method: "GET",
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  private getBaseUrl(): string {
    if (this.config.mode === "local") {
      return `http://${DEFAULT_HOSTS.LOCALHOST_NAME}:${DEFAULT_PORTS.OPENCODE}`;
    }

    if (!this.config.baseUrl) {
      throw new Error("baseUrl is required for cloud mode");
    }

    return this.config.baseUrl;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (this.config.password) {
      const auth = Buffer.from(`opencode:${this.config.password}`).toString(
        "base64"
      );
      headers.Authorization = `Basic ${auth}`;
    }

    return headers;
  }

  private async createSession(baseUrl: string, title: string): Promise<string> {
    const response = await fetch(`${baseUrl}/session`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({
        title: title.substring(0, 100),
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create session: ${response.statusText}`);
    }

    const session = (await response.json()) as OpenCodeSession;
    return session.id;
  }

  private async sendMessage(
    baseUrl: string,
    sessionId: string,
    task: string,
    model?: string
  ): Promise<string> {
    const requestBody: Record<string, unknown> = {
      parts: [
        {
          type: "text",
          text: task,
        },
      ],
    };

    if (model) {
      requestBody.model = model;
    }

    const response = await fetch(`${baseUrl}/session/${sessionId}/message`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`Failed to send message: ${response.statusText}`);
    }

    const result = (await response.json()) as any;
    return result.info.id;
  }

  private async waitForCompletion(
    baseUrl: string,
    sessionId: string,
    messageId: string
  ): Promise<OpenCodeMessage> {
    const maxAttempts = Math.floor(this.config.timeout! / 2000);
    let attempts = 0;

    while (attempts < maxAttempts) {
      const response = await fetch(
        `${baseUrl}/session/${sessionId}/message/${messageId}`,
        {
          method: "GET",
          headers: this.getHeaders(),
        }
      );

      if (!response.ok) {
        throw new Error(
          `Failed to check message status: ${response.statusText}`
        );
      }

      const data = (await response.json()) as any;
      const message: OpenCodeMessage = data.info;

      if (message.status === "completed") {
        return message;
      }

      if (message.status === "failed") {
        throw new Error("OpenCode execution failed");
      }

      await new Promise((resolve) => setTimeout(resolve, 2000));
      attempts++;
    }

    throw new Error(
      `OpenCode execution timeout after ${this.config.timeout}ms`
    );
  }

  private async getDiff(
    baseUrl: string,
    sessionId: string
  ): Promise<FileDiff[]> {
    const response = await fetch(`${baseUrl}/session/${sessionId}/diff`, {
      method: "GET",
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to get diff: ${response.statusText}`);
    }

    return (await response.json()) as FileDiff[];
  }

  private formatOutput(result: OpenCodeMessage, diff: FileDiff[]): string {
    const summary = [
      "OpenCode execution completed successfully",
      `Tokens used: ${result.usage?.total_tokens || 0}`,
      `Files modified: ${diff.length}`,
    ];

    if (diff.length > 0) {
      summary.push("Modified files:");
      diff.forEach((file) => {
        summary.push(
          `  - ${file.path} (+${file.additions}/-${file.deletions})`
        );
      });
    }

    return summary.join("\n");
  }
}
