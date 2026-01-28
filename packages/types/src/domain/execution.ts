import type { Entity, Timestamps } from "../common";

export type ExecutionStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "cancelled"
  | "paused";

export interface Execution extends Timestamps, Entity {
  jobId: string;
  workflowId: string;
  stepId: string;
  status: ExecutionStatus;
  startedAt?: Date;
  completedAt?: Date;
  result?: unknown;
  error?: string;
  logs: string[];
}
