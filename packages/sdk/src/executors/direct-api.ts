import type { ExecutionOptions, ExecutionResult, Executor } from "../types";

export class DirectAPIExecutor implements Executor {
  type = "direct-api" as const;

  async execute(options: ExecutionOptions): Promise<ExecutionResult> {
    const startTime = Date.now();

    // TODO: Implement Direct API execution
    // Calls the AI provider API directly (OpenAI, Anthropic, etc.)

    return {
      success: true,
      output: `[Direct API] Executed: ${options.task}`,
      duration: Date.now() - startTime,
    };
  }

  async testConnection(): Promise<boolean> {
    // Test API connection
    return true;
  }
}
