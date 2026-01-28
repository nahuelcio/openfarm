// Workflow types stub
export type StepType =
  | "planning"
  | "agent"
  | "git"
  | "review"
  | "human"
  | "custom";

export type StepStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "skipped";

export interface Step {
  id: string;
  name: string;
  type: StepType;
  config: Record<string, unknown>;
  status: StepStatus;
}

export interface Workflow {
  id: string;
  name: string;
  steps: Step[];
  version: string;
}

export interface WorkflowContext {
  workItem: unknown;
  config: Record<string, unknown>;
  artifacts: Record<string, unknown>;
}

export interface WorkflowResult {
  success: boolean;
  steps: Array<{ stepId: string; status: StepStatus; result?: unknown }>;
  output?: unknown;
  error?: string;
}
