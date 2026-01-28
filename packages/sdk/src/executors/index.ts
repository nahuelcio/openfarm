import type { ExecutionOptions, ExecutionResult } from "../types";
import { AiderExecutor } from "./aider";
import { ClaudeCodeExecutor } from "./claude-code";
import { DirectAPIExecutor } from "./direct-api";
import { OpenCodeExecutor } from "./opencode";

export type ExecutorType = "opencode" | "aider" | "claude-code" | "direct-api";

export interface Executor {
  type: ExecutorType;
  execute(options: ExecutionOptions): Promise<ExecutionResult>;
  testConnection(): Promise<boolean>;
}

export function createExecutor(type: ExecutorType): Executor {
  switch (type) {
    case "opencode":
      return new OpenCodeExecutor();
    case "aider":
      return new AiderExecutor();
    case "claude-code":
      return new ClaudeCodeExecutor();
    case "direct-api":
      return new DirectAPIExecutor();
    default:
      throw new Error(`Unknown executor type: ${type}`);
  }
}

export { AiderExecutor } from "./aider";
export { ClaudeCodeExecutor } from "./claude-code";
export { DirectAPIExecutor } from "./direct-api";
export { OpenCodeExecutor } from "./opencode";
