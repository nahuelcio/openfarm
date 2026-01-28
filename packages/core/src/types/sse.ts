export type ExecutionStage =
  | "planning"
  | "approval"
  | "build"
  | "test"
  | "review"
  | "deploy"
  | "done"
  | "error";

export type ExecutionEventKind = "status" | "log" | "diff" | "plan" | "tool";

export interface ExecutionEvent {
  jobId: string;
  executionId?: string;
  stepId?: string;
  stage: ExecutionStage;
  kind: ExecutionEventKind;
  message?: string;
  diff?: string;
  summary?: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
}
