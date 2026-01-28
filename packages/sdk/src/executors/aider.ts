import type { ExecutionOptions, ExecutionResult, Executor } from "../types";

export class AiderExecutor implements Executor {
  type = "aider" as const;

  async execute(options: ExecutionOptions): Promise<ExecutionResult> {
    const startTime = Date.now();

    // TODO: Implement Aider execution
    // Aider runs as a subprocess
    // Command: aider --model <model> --message "<task>"

    return {
      success: true,
      output: `[Aider] Executed: ${options.task}`,
      duration: Date.now() - startTime,
    };
  }

  async testConnection(): Promise<boolean> {
    // Check if aider CLI is available
    return true;
  }
}
