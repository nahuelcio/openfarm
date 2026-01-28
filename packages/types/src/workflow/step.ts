// Step types
import type { Entity } from "../common";

// Step status
export type StepStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "skipped"
  | "paused";

// Step types
export type StepType =
  | "agent"
  | "code"
  | "command"
  | "condition"
  | "loop"
  | "parallel"
  | "human"
  | "api"
  | "transform"
  | "notify";

// Step interface
export interface Step extends Entity {
  name: string;
  type: StepType;
  config: StepConfig;
  nextOnSuccess?: string;
  nextOnFailure?: string;
  condition?: string;
  timeout?: number;
}

export interface StepConfig {
  // For agent steps
  agent?: {
    name: string;
    model?: string;
    systemPrompt?: string;
    maxTokens?: number;
    temperature?: number;
  };

  // For code steps
  code?: {
    language: string;
    content: string;
  };

  // For command steps
  command?: {
    command: string;
    args: string[];
    env?: Record<string, string>;
    cwd?: string;
  };

  // For transform steps
  transform?: {
    input: string;
    output: string;
    template: string;
  };

  // For notify steps
  notify?: {
    channel: string;
    message: string;
  };
}
